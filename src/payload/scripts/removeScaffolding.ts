/**
 * Retire les textes de chantier laissés par la phase de prototypage.
 *
 * Le site a d'abord été construit comme une maquette : mentions « brouillon de
 * démonstration », chapeaux annonçant un « prototype éditorial », notes
 * internes « à confirmer avant la mise en production », et une page `/space`
 * qui simulait une authentification aujourd'hui réellement implémentée.
 *
 * Ces textes s'adressaient à l'équipe pendant la construction. Ils sont
 * visibles publiquement et n'ont plus lieu d'être.
 *
 * ## Ce que le script fait
 *  - retire les blocs de mention `draft-note` et `prototype-note` ;
 *  - efface les chapeaux d'article qui annoncent un prototype ;
 *  - supprime la page `/space` et son bloc de maquette d'authentification ;
 *  - supprime les pages fantômes sans slug, restes de créations avortées.
 *
 * ## Ce qu'il ne fait pas
 * Il ne touche à **aucun contenu rédactionnel réel** : titres, extraits, corps
 * d'article, images et sections éditoriales sont laissés intacts. Le corps des
 * articles reste en place — c'est du texte publiable, pas une mention de
 * chantier.
 *
 * Aperçu par défaut, écriture avec `--apply` :
 *
 *   npm run content:clean            # liste ce qui serait retiré
 *   npm run content:clean -- --apply # applique
 */
import type { Payload } from 'payload'

type Change = { entity: string; label: string; detail: string }

/** Variantes de mention qui ne servaient qu'au prototypage. */
const SCAFFOLD_VARIANTS = new Set(['draft-note', 'prototype-note'])

/** Un chapeau qui se décrit lui-même comme provisoire. */
const isScaffoldLead = (value: unknown): boolean => {
  if (typeof value !== 'string') return false
  const text = value.toLowerCase()
  return (
    text.includes('prototype') ||
    text.includes('sera rédigé') ||
    text.includes('avant publication') ||
    text.includes('micro cms')
  )
}

const isScaffoldBlock = (block: unknown): boolean => {
  const candidate = block as { blockType?: string; variant?: string } | null
  if (!candidate) return false
  if (candidate.blockType === 'authPrototype') return true
  if (candidate.blockType === 'noticeNote' && candidate.variant) {
    return SCAFFOLD_VARIANTS.has(candidate.variant)
  }
  return false
}

/**
 * Mentions d'attente saisies dans le contenu.
 *
 * Un site en exploitation ne dit pas à ses visiteurs qu'il est incomplet. Ces
 * chaînes sont soit effacées — quand elles ne portent aucune information — soit
 * ramenées à leur partie factuelle.
 *
 * Une valeur de remplacement vide signifie « effacer le champ ».
 */
const TEXT_REPLACEMENTS: { find: RegExp; replace: string }[] = [
  // Notes de suivi interne : rien à en tirer pour un lecteur.
  { find: /^\s*À compléter avec le client\s*$/i, replace: '' },
  { find: /^\s*Résultats chiffrés à confirmer avant publication\.?\s*$/i, replace: '' },
  { find: /^\s*à confirmer\s*$/i, replace: '' },

  // Formulations qui portent un fait suivi d'une réserve de chantier : on garde
  // le fait, on retire la réserve.
  { find: /\s*—\s*détails à confirmer\.?$/i, replace: '' },
  { find: /\s*\(à confirmer\)\s*$/i, replace: '' },
  { find: /^(\d+\s+.+?)\s+à venir$/i, replace: '$1' },
]

/** Applique les remplacements à une chaîne. `null` si rien ne change. */
const scrubText = (value: unknown): string | null => {
  if (typeof value !== 'string' || value.trim() === '') return null
  let next = value
  for (const rule of TEXT_REPLACEMENTS) next = next.replace(rule.find, rule.replace)
  next = next.trim()
  return next === value ? null : next
}

/**
 * Une entrée de tableau dont le champ porteur est devenu vide n'a plus de
 * raison d'exister — et la vider casserait la validation, ces champs étant
 * souvent requis. On la supprime donc plutôt que de la laisser vide.
 */
const CARRIER_FIELDS = ['value', 'text', 'label', 'title']

const isEmptyEntry = (item: unknown): boolean => {
  if (!item || typeof item !== 'object' || Array.isArray(item)) return false
  const record = item as Record<string, unknown>

  const carriers = CARRIER_FIELDS.filter((field) => field in record)
  if (carriers.length === 0) return false

  // Vide seulement si TOUS les champs porteurs présents le sont : une entrée
  // qui garde un libellé utile est conservée.
  return carriers.every((field) => {
    const value = record[field]
    return typeof value === 'string' && value.trim() === ''
  })
}

/**
 * Parcourt un document en profondeur et remplace les mentions d'attente.
 * Retourne le nombre de chaînes modifiées.
 */
const scrubDeep = (node: unknown): number => {
  let changed = 0

  if (Array.isArray(node)) {
    for (const item of node) changed += scrubDeep(item)

    // Élague les entrées vidées par le nettoyage.
    for (let index = node.length - 1; index >= 0; index -= 1) {
      if (isEmptyEntry(node[index])) {
        node.splice(index, 1)
        changed += 1
      }
    }

    return changed
  }

  if (node && typeof node === 'object') {
    const record = node as Record<string, unknown>
    for (const [key, value] of Object.entries(record)) {
      // Les identifiants ne sont jamais du texte éditorial.
      if (key === 'id' || key === '_id') continue

      if (typeof value === 'string') {
        const scrubbed = scrubText(value)
        if (scrubbed !== null) {
          record[key] = scrubbed
          changed += 1
        }
      } else {
        changed += scrubDeep(value)
      }
    }
  }

  return changed
}

export const removeScaffolding = async (
  payload: Payload,
  apply: boolean,
): Promise<Change[]> => {
  const changes: Change[] = []

  // --- Articles : mentions de brouillon et chapeaux provisoires -------------
  const articles = await payload.find({
    collection: 'articles',
    limit: 500,
    depth: 0,
    overrideAccess: true,
    draft: true,
  })

  for (const article of articles.docs) {
    const blocks = Array.isArray(article.blocks) ? article.blocks : []
    const kept = blocks.filter((block) => !isScaffoldBlock(block))
    const droppedBlocks = blocks.length - kept.length
    const dropLead = isScaffoldLead(article.lead)

    if (droppedBlocks === 0 && !dropLead) continue

    const detail = [
      droppedBlocks > 0 ? `${droppedBlocks} mention(s) de brouillon` : null,
      dropLead ? 'chapeau provisoire' : null,
    ]
      .filter(Boolean)
      .join(', ')

    changes.push({ entity: 'Article', label: article.slug ?? String(article.id), detail })

    if (apply) {
      await payload.update({
        collection: 'articles',
        id: article.id,
        data: {
          blocks: kept,
          ...(dropLead ? { lead: null } : {}),
        },
        overrideAccess: true,
        context: { disableRevalidate: true },
        // Publie directement : la version publiée doit refléter le nettoyage.
        draft: false,
      })
    }
  }

  // --- Pages : mentions, maquette d'authentification, pages fantômes --------
  const pages = await payload.find({
    collection: 'pages',
    limit: 500,
    depth: 0,
    overrideAccess: true,
    draft: true,
  })

  for (const page of pages.docs) {
    // Page fantôme : création avortée, sans slug ni titre exploitables.
    if (!page.slug) {
      changes.push({
        entity: 'Page',
        label: `(sans slug, ${page.id})`,
        detail: 'page fantôme supprimée',
      })
      if (apply) {
        await payload.delete({
          collection: 'pages',
          id: page.id,
          overrideAccess: true,
          context: { disableRevalidate: true },
        })
      }
      continue
    }

    // `/space` était la maquette de l'espace client. L'espace réel vit
    // désormais sur `/espace-client`, avec une authentification effective.
    if (page.slug === 'space') {
      changes.push({
        entity: 'Page',
        label: 'space',
        detail: 'maquette d’espace client supprimée (remplacée par /espace-client)',
      })
      if (apply) {
        await payload.delete({
          collection: 'pages',
          id: page.id,
          overrideAccess: true,
          context: { disableRevalidate: true },
        })
      }
      continue
    }

    const layout = Array.isArray(page.layout) ? page.layout : []
    const kept = layout.filter((block) => !isScaffoldBlock(block))
    const dropped = layout.length - kept.length

    if (dropped === 0) continue

    changes.push({
      entity: 'Page',
      label: page.slug,
      detail: `${dropped} bloc(s) de chantier`,
    })

    if (apply) {
      await payload.update({
        collection: 'pages',
        id: page.id,
        data: { layout: kept },
        overrideAccess: true,
        context: { disableRevalidate: true },
        draft: false,
      })
    }
  }

  // --- Mentions d'attente dans le contenu -----------------------------------
  // Passe transversale : les formulations « à confirmer », « à compléter » ou
  // « à venir » peuvent se trouver n'importe où dans un document, y compris
  // au fond d'un bloc imbriqué. On parcourt donc l'arbre complet.
  const SCRUBBED: { collection: 'pages' | 'projects' | 'articles' | 'services'; label: string }[] =
    [
      { collection: 'pages', label: 'Page' },
      { collection: 'projects', label: 'Réalisation' },
      { collection: 'articles', label: 'Article' },
      { collection: 'services', label: 'Service' },
    ]

  for (const target of SCRUBBED) {
    const docs = await payload.find({
      collection: target.collection,
      limit: 500,
      depth: 0,
      overrideAccess: true,
      draft: true,
    })

    for (const doc of docs.docs) {
      // On travaille sur une copie : le décompte se fait avant toute écriture,
      // ce qui permet à l'aperçu de rapporter exactement ce qui changerait.
      const draftCopy = JSON.parse(JSON.stringify(doc)) as Record<string, unknown>
      const touched = scrubDeep(draftCopy)
      if (touched === 0) continue

      changes.push({
        entity: target.label,
        label: (doc.slug as string) ?? String(doc.id),
        detail: `${touched} mention(s) d’attente`,
      })

      if (apply) {
        // Un document qui refuse l'écriture — un champ requis devenu vide, par
        // exemple — ne doit pas interrompre le nettoyage des autres. L'échec
        // est rapporté tel quel plutôt que passé sous silence.
        try {
          await payload.update({
            collection: target.collection,
            id: doc.id,
            data: draftCopy as never,
            overrideAccess: true,
            context: { disableRevalidate: true },
            draft: false,
          })
        } catch (error) {
          changes[changes.length - 1].detail =
            `ÉCHEC — ${String((error as Error)?.message ?? error).slice(0, 120)}`
        }
      }
    }
  }

  // --- Renvoi de la prise de rendez-vous vers la page réelle -----------------
  // La fiche contact annonçait un « lien Calendly à confirmer ». Le site
  // dispose désormais de sa propre réservation : on y renvoie plutôt que de
  // supprimer l'entrée, qui reste une information utile.
  const contact = await payload
    .find({
      collection: 'pages',
      where: { slug: { equals: 'contact' } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
      draft: true,
    })
    .then((result) => result.docs[0])
    .catch(() => null)

  if (contact) {
    const layout = (Array.isArray(contact.layout) ? contact.layout : []) as unknown as Record<
      string,
      unknown
    >[]
    let retargeted = 0

    for (const block of layout) {
      const items = block.items
      if (!Array.isArray(items)) continue

      for (const item of items as Record<string, unknown>[]) {
        const value = typeof item.value === 'string' ? item.value : ''
        if (!/calendly|à confirmer/i.test(value)) continue
        item.kind = 'link'
        item.value = '/reservation'
        retargeted += 1
      }
    }

    if (retargeted > 0) {
      changes.push({
        entity: 'Page',
        label: 'contact',
        detail: 'prise de rendez-vous renvoyée vers /reservation',
      })

      if (apply) {
        try {
          await payload.update({
            collection: 'pages',
            id: contact.id,
            data: { layout } as never,
            overrideAccess: true,
            context: { disableRevalidate: true },
            draft: false,
          })
        } catch (error) {
          changes[changes.length - 1].detail =
            `ÉCHEC — ${String((error as Error)?.message ?? error).slice(0, 120)}`
        }
      }
    }
  }

  // --- Réglages globaux ------------------------------------------------------
  for (const slug of ['siteSettings', 'header', 'footer'] as const) {
    const global = await payload.findGlobal({ slug, depth: 0 }).catch(() => null)
    if (!global) continue

    const draftCopy = JSON.parse(JSON.stringify(global)) as Record<string, unknown>
    const touched = scrubDeep(draftCopy)
    if (touched === 0) continue

    changes.push({
      entity: 'Réglage',
      label: slug,
      detail: `${touched} mention(s) d’attente`,
    })

    if (apply) {
      try {
        await payload.updateGlobal({
          slug,
          data: draftCopy as never,
          overrideAccess: true,
          context: { disableRevalidate: true },
        })
      } catch (error) {
        changes[changes.length - 1].detail =
          `ÉCHEC — ${String((error as Error)?.message ?? error).slice(0, 120)}`
      }
    }
  }

  return changes
}

// --- Point d'entrée en ligne de commande ------------------------------------

/**
 * Purge le cache des pages publiques.
 *
 * Les écritures de ce script passent `disableRevalidate`, et de toute façon un
 * script en ligne de commande s'exécute hors contexte Next : il ne peut pas
 * invalider le cache lui-même. Sans cette étape, la base serait propre mais les
 * pages continueraient de servir l'ancien contenu — ce qui donnerait
 * l'impression que le nettoyage n'a rien fait.
 */
const revalidatePublicPages = async (): Promise<string> => {
  const { env } = await import('@/lib/env')

  try {
    const response = await fetch(`${env.serverURL}/api/revalidate`, {
      method: 'POST',
      headers: { 'x-revalidate-secret': env.previewSecret },
    })
    if (!response.ok) return `échec (HTTP ${response.status})`
    return 'cache purgé'
  } catch {
    return 'serveur injoignable'
  }
}

const runAsScript = async (): Promise<void> => {
  const apply = process.argv.includes('--apply')

  const { getPayloadClient } = await import('@/lib/payload')
  const payload = await getPayloadClient()

  const changes = await removeScaffolding(payload, apply)

  if (changes.length === 0) {
    console.log('Aucun texte de chantier détecté. Rien à faire.')
    process.exit(0)
  }

  console.log(apply ? 'Nettoyage appliqué :' : 'Aperçu — aucune écriture effectuée :')
  for (const change of changes) {
    console.log(`  • ${change.entity.padEnd(8)} ${change.label.padEnd(34)} ${change.detail}`)
  }

  if (!apply) {
    console.log('\nRelancer avec --apply pour écrire.')
    process.exit(0)
  }

  // Sans purge, les pages publiques continueraient de servir l'ancien contenu.
  const cache = await revalidatePublicPages()
  console.log(`\nCache des pages publiques : ${cache}.`)

  if (cache !== 'cache purgé') {
    console.log(
      'Purger une fois le site démarré :\n' +
        '  curl -X POST -H "x-revalidate-secret: $PREVIEW_SECRET" "$NEXT_PUBLIC_SERVER_URL/api/revalidate"',
    )
  }

  // Observé en pratique : un serveur démarré AVANT le nettoyage conserve ses
  // entrées mémoire même après une invalidation réussie. Le redémarrage est le
  // seul moyen sûr de garantir que le contenu servi correspond à la base.
  console.log('Si l’ancien contenu persiste, redémarrer le serveur applicatif.')

  process.exit(0)
}

// `payload run` place le chemin du script quelque part dans argv, pas
// necessairement en position 1 : on balaie l'ensemble.
if (process.argv.some((arg) => arg.includes('removeScaffolding'))) {
  await runAsScript()
}
