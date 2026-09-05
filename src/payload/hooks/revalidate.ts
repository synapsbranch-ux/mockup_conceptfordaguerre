import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  GlobalAfterChangeHook,
} from 'payload'

/**
 * Invalide le cache Next après publication.
 *
 * `revalidateTag` n'existe que dans le contexte d'une requête Next : appelé
 * depuis un script CLI (seed, migration), il lève une exception attendue et
 * sans conséquence, puisque aucun cache n'est alors monté.
 */
const invalidate = async (tags: string[]): Promise<void> => {
  try {
    const { revalidateTag } = await import('next/cache')
    // Next 16 exige un profil de durée de vie : « max » expire l'entrée
    // quel que soit son âge, ce qui est le comportement voulu après publication.
    for (const tag of tags) revalidateTag(tag, 'max')
  } catch {
    // Hors contexte Next (exécution en ligne de commande) : rien à invalider.
  }
}

/** Tag global invalidé dès qu'un contenu change, quel qu'il soit. */
export const GLOBAL_CONTENT_TAG = 'content'

export const revalidateAfterChange =
  (tag: string): CollectionAfterChangeHook =>
  async ({ doc, req }) => {
    if (req.context?.disableRevalidate) return doc
    await invalidate([tag, GLOBAL_CONTENT_TAG])
    return doc
  }

export const revalidateAfterDelete =
  (tag: string): CollectionAfterDeleteHook =>
  async ({ doc, req }) => {
    if (req.context?.disableRevalidate) return doc
    await invalidate([tag, GLOBAL_CONTENT_TAG])
    return doc
  }

export const revalidateGlobal =
  (tag: string): GlobalAfterChangeHook =>
  async ({ doc, req }) => {
    if (req.context?.disableRevalidate) return doc
    await invalidate([tag, GLOBAL_CONTENT_TAG])
    return doc
  }
