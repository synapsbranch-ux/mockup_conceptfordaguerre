import type { Payload } from 'payload'

export type MediaReference = {
  /** Collection ou global contenant la référence. */
  source: string
  label: string
  id?: string
  status?: string
  isPublished: boolean
}

const CONTENT_COLLECTIONS = ['pages', 'projects', 'articles', 'services', 'commitments'] as const
const CONTENT_GLOBALS = ['header', 'footer', 'siteSettings'] as const

/** Champs exclus de la recherche de references. */
const TECHNICAL_FIELDS = new Set(['id', 'createdAt', 'updatedAt'])

const LABELS: Record<string, string> = {
  pages: 'Page',
  projects: 'Projet',
  articles: 'Article',
  services: 'Service',
  commitments: 'Engagement',
  header: 'En-tête du site',
  footer: 'Pied de page',
  siteSettings: 'Réglages du site',
}

/**
 * Recherche toutes les références à un média.
 *
 * Les médias peuvent être imbriqués arbitrairement profond dans les blocs de
 * mise en page ; plutôt que d'énumérer chaque chemin possible — fragile et à
 * remettre à jour à chaque nouveau bloc — on sérialise chaque document à
 * `depth: 0` et on cherche l'identifiant. Le volume de contenu de ce site
 * (quelques dizaines de documents) rend l'approche négligeable en coût et
 * exhaustive par construction.
 */
export const findMediaReferences = async (
  payload: Payload,
  mediaId: string,
): Promise<MediaReference[]> => {
  const references: MediaReference[] = []
  const needle = String(mediaId)

  for (const collection of CONTENT_COLLECTIONS) {
    const { docs } = await payload.find({
      collection,
      depth: 0,
      limit: 0,
      pagination: false,
      draft: true,
      overrideAccess: true,
    })

    for (const doc of docs) {
      const record = doc as unknown as Record<string, unknown>
      // Les champs techniques sont ecartes : un identifiant de document ne doit
      // pas produire de fausse correspondance avec celui du media recherche.
      const searchable = Object.fromEntries(
        Object.entries(record).filter(([key]) => !TECHNICAL_FIELDS.has(key)),
      )
      if (!JSON.stringify(searchable).includes(needle)) continue
      const status = typeof record._status === 'string' ? record._status : undefined
      references.push({
        source: collection,
        label: `${LABELS[collection]} « ${String(record.title ?? record.name ?? record.slug ?? record.id)} »`,
        id: String(record.id),
        status,
        isPublished: status === 'published' || status === undefined,
      })
    }
  }

  for (const global of CONTENT_GLOBALS) {
    const doc = await payload.findGlobal({ slug: global, depth: 0, overrideAccess: true })
    if (!JSON.stringify(doc ?? {}).includes(needle)) continue
    references.push({
      source: global,
      label: LABELS[global],
      isPublished: true,
    })
  }

  return references
}
