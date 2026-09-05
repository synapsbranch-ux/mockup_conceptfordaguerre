/**
 * Exécution du seed de contenu.
 *
 *   npm run payload:seed
 *
 * Rejouable sans risque : voir `src/payload/seed/index.ts`.
 */
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

import config from '@payload-config'
import { getPayload } from 'payload'

import { env } from '@/lib/env'

import { seed } from '../seed'

/**
 * Sollicite la revalidation du cache Next apres le seed.
 *
 * Les scripts s'executent hors contexte Next et ne peuvent pas appeler
 * `revalidateTag` eux-memes. Si aucun serveur n'ecoute, l'echec est sans
 * consequence : le prochain demarrage repartira d'un cache vide.
 */
const revalidate = async (): Promise<string> => {
  try {
    const response = await fetch(`${env.serverURL}/api/revalidate`, {
      method: 'POST',
      headers: { 'x-revalidate-secret': env.previewSecret },
      signal: AbortSignal.timeout(5000),
    })
    return response.ok
      ? 'cache invalide'
      : `serveur joignable mais refus (HTTP ${response.status})`
  } catch {
    return 'aucun serveur joignable — le cache repartira vide au prochain demarrage'
  }
}

const REPORT_PATH = path.resolve(process.cwd(), 'reports/content-migration.md')

const COUNTED = ['pages', 'projects', 'articles', 'services', 'commitments', 'media'] as const

const run = async (): Promise<void> => {
  const payload = await getPayload({ config })

  console.log('\nSeed du contenu')
  console.log('───────────────')

  const { reports, unresolved } = await seed(payload)

  for (const report of reports) {
    console.log(
      `  ${report.entity.padEnd(14)} ${String(report.created).padStart(2)} créé(s), ${String(
        report.updated,
      ).padStart(2)} mis à jour  (attendu : ${report.total})`,
    )
  }

  console.log('───────────────')

  // Contrôle d'idempotence : les compteurs doivent correspondre aux fixtures.
  const counts: Record<string, number> = {}
  for (const collection of COUNTED) {
    const result = await payload.count({ collection, overrideAccess: true })
    counts[collection] = result.totalDocs
    console.log(`  ${collection.padEnd(14)} ${result.totalDocs} document(s) en base`)
  }

  if (unresolved.length > 0) {
    console.log('\n  Références non résolues :')
    for (const item of [...new Set(unresolved)]) console.log(`    ✗ ${item}`)
  } else {
    console.log('\n  Toutes les références média et page ont été résolues.')
  }

  await mkdir(path.dirname(REPORT_PATH), { recursive: true })
  await writeFile(
    REPORT_PATH,
    [
      '# Rapport de migration du contenu',
      '',
      `Généré le ${new Date().toISOString().slice(0, 10)}.`,
      '',
      '## Entités traitées',
      '',
      '| Entité | Créées | Mises à jour | Attendu |',
      '|---|---:|---:|---:|',
      ...reports.map((r) => `| ${r.entity} | ${r.created} | ${r.updated} | ${r.total} |`),
      '',
      '## Documents en base après exécution',
      '',
      '| Collection | Documents |',
      '|---|---:|',
      ...COUNTED.map((c) => `| \`${c}\` | ${counts[c]} |`),
      '',
      '## Références',
      '',
      unresolved.length === 0
        ? 'Toutes les références média et page ont été résolues.'
        : `Références non résolues :\n\n${[...new Set(unresolved)].map((u) => `- ${u}`).join('\n')}`,
      '',
    ].join('\n'),
    'utf8',
  )

  console.log(`\nRevalidation : ${await revalidate()}`)
  console.log(`Rapport écrit : ${path.relative(process.cwd(), REPORT_PATH)}\n`)
  process.exit(unresolved.length === 0 ? 0 : 1)
}

await run()
