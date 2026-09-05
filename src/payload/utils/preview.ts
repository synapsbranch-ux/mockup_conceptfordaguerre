import { env } from '@/lib/env'

export type PreviewableCollection = 'pages' | 'projects' | 'articles'

/**
 * Chemin public d'un document, en préservant les URLs historiques :
 * la page d'accueil vit à la racine et le blog sous `/blog`.
 */
export const publicPathFor = (collection: PreviewableCollection, slug: string): string => {
  if (collection === 'pages') return slug === 'home' ? '/' : `/${slug}`
  if (collection === 'articles') return `/blog/${slug}`
  return `/projects/${slug}`
}

/**
 * URL de prévisualisation d'un brouillon.
 * Le secret n'autorise pas à lui seul l'accès : la route vérifie aussi la
 * session Payload de l'appelant.
 */
export const generatePreviewURL = (
  collection: PreviewableCollection,
  slug: string | null | undefined,
): string | null => {
  if (!slug) return null
  const params = new URLSearchParams({
    secret: env.previewSecret,
    collection,
    slug,
  })
  return `${env.serverURL}/api/preview?${params.toString()}`
}
