/**
 * Migration des 25 images locales vers la collection Media.
 *
 * Idempotent : la clé stable est le nom de fichier. Une seconde exécution
 * met à jour les métadonnées sans re-téléverser le binaire ni créer de doublon.
 *
 *   npm run payload:migrate-media
 */
import { mkdir, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'

import config from '@payload-config'
import { getPayload } from 'payload'

import { env } from '@/lib/env'

import { mediaFixtures } from '../seed/fixtures/media'

const SOURCE_DIR = path.resolve(process.cwd(), 'seed-assets/daguerre')
const REPORT_PATH = path.resolve(process.cwd(), 'reports/media-migration.md')

type Outcome = {
  filename: string
  title: string
  action: 'créé' | 'mis à jour'
  id: string
  bytes: number
  width: number | null
  height: number | null
  sizes: string[]
  altFromSource: boolean
}

const run = async (): Promise<void> => {
  const payload = await getPayload({ config })

  console.log('\nMigration des médias')
  console.log('────────────────────')
  console.log(`Source  : ${SOURCE_DIR}`)
  console.log(`Stockage: ${env.mediaDriver}\n`)

  const outcomes: Outcome[] = []

  for (const fixture of mediaFixtures) {
    const filePath = path.join(SOURCE_DIR, fixture.filename)
    await stat(filePath) // échoue explicitement si le fichier source a disparu

    const metadata = {
      title: fixture.title,
      alt: fixture.alt,
      category: fixture.category,
      notes: fixture.altFromSource
        ? 'Texte alternatif repris du prototype.'
        : 'Texte alternatif rédigé lors de la migration (absent du prototype).',
    }

    const existing = await payload.find({
      collection: 'media',
      where: { filename: { equals: fixture.filename } },
      limit: 1,
      overrideAccess: true,
    })

    const doc =
      existing.totalDocs > 0
        ? await payload.update({
            collection: 'media',
            id: existing.docs[0].id,
            data: metadata,
            overrideAccess: true,
            context: { disableRevalidate: true },
          })
        : await payload.create({
            collection: 'media',
            data: metadata,
            filePath,
            overrideAccess: true,
            context: { disableRevalidate: true },
          })

    const action = existing.totalDocs > 0 ? 'mis à jour' : 'créé'
    const sizes = Object.entries(doc.sizes ?? {})
      .filter(([, value]) => value && typeof value === 'object' && 'filename' in value && value.filename)
      .map(([name]) => name)

    outcomes.push({
      filename: doc.filename ?? fixture.filename,
      title: fixture.title,
      action,
      id: String(doc.id),
      bytes: doc.filesize ?? 0,
      width: doc.width ?? null,
      height: doc.height ?? null,
      sizes,
      altFromSource: fixture.altFromSource,
    })

    console.log(
      `  ${action === 'créé' ? '✓' : '·'} ${fixture.filename.padEnd(34)} ${action.padEnd(11)} ${sizes.length} déclinaison(s)`,
    )
  }

  const created = outcomes.filter((o) => o.action === 'créé').length
  const updated = outcomes.length - created
  const withoutAlt = outcomes.filter((o) => !o.altFromSource).length

  console.log('────────────────────')
  console.log(`${created} créé(s), ${updated} mis à jour, ${outcomes.length} au total.`)

  // Contrôle : aucun média ne doit sortir sans texte alternatif.
  const missingAlt = await payload.find({
    collection: 'media',
    where: { or: [{ alt: { equals: '' } }, { alt: { exists: false } }] },
    limit: 0,
    overrideAccess: true,
  })
  console.log(`Médias sans texte alternatif : ${missingAlt.totalDocs}`)

  const total = await payload.count({ collection: 'media', overrideAccess: true })
  console.log(`Total dans la collection Media : ${total.totalDocs}`)

  await mkdir(path.dirname(REPORT_PATH), { recursive: true })
  const report = [
    '# Rapport de migration des médias',
    '',
    `Généré le ${new Date().toISOString().slice(0, 10)}.`,
    '',
    `- Pilote de stockage : \`${env.mediaDriver}\``,
    `- Source : \`public/images/daguerre\``,
    `- Médias créés : ${created}`,
    `- Médias mis à jour : ${updated}`,
    `- Total dans la collection : ${total.totalDocs}`,
    `- Médias sans texte alternatif : ${missingAlt.totalDocs}`,
    `- Textes alternatifs rédigés pendant la migration (absents du prototype) : ${withoutAlt}`,
    '',
    '## Détail',
    '',
    '| Fichier | Titre | Action | Identifiant | Poids | Dimensions | Déclinaisons | Alt |',
    '|---|---|---|---|---|---|---|---|',
    ...outcomes.map(
      (o) =>
        `| \`${o.filename}\` | ${o.title} | ${o.action} | \`${o.id}\` | ${(o.bytes / 1024).toFixed(0)} Ko | ${
          o.width && o.height ? `${o.width}×${o.height}` : '—'
        } | ${o.sizes.join(', ') || '—'} | ${o.altFromSource ? 'repris' : 'rédigé'} |`,
    ),
    '',
  ].join('\n')

  await writeFile(REPORT_PATH, report, 'utf8')
  try {
    await fetch(`${env.serverURL}/api/revalidate`, {
      method: 'POST',
      headers: { 'x-revalidate-secret': env.previewSecret },
      signal: AbortSignal.timeout(5000),
    })
  } catch {
    // Aucun serveur joignable : le cache repartira vide au prochain demarrage.
  }

  console.log(`\nRapport écrit : ${path.relative(process.cwd(), REPORT_PATH)}\n`)

  process.exit(0)
}

await run()
