import type { Page } from '@/payload-types'

/** Forme d'un lien éditorial telle que produite par `linkField`. */
export type CMSLink = {
  label?: string | null
  type?: 'page' | 'custom' | null
  page?: (string | null) | Page
  url?: string | null
  newTab?: boolean | null
}

/**
 * Chemin public d'une page.
 * L'accueil vit à la racine : son slug `home` n'apparaît jamais dans l'URL.
 */
export const pagePath = (slug: string | null | undefined): string => {
  if (!slug) return '/'
  return slug === 'home' ? '/' : `/${slug}`
}

/**
 * Résout un lien éditorial en URL.
 * Renvoie `null` si la destination est absente ou non résolue, afin que le
 * rendu affiche du texte simple plutôt qu'un lien cassé.
 */
export const resolveHref = (link: CMSLink | null | undefined): string | null => {
  if (!link) return null
  if (link.type === 'custom') {
    const url = link.url?.trim()
    return url ? url : null
  }
  const page = link.page
  if (page && typeof page === 'object') return pagePath(page.slug)
  return null
}

/** Attributs d'ouverture dans un nouvel onglet, sécurisés. */
export const targetProps = (link: CMSLink | null | undefined) =>
  link?.newTab ? { target: '_blank', rel: 'noopener noreferrer' as const } : {}
