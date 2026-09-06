import type { Metadata } from 'next'
import { alternatesFor, type Locale } from '@/lib/i18n'

import { mediaUrl } from '@/components/media/CMSImage'
import { env } from '@/lib/env'
import { getSiteSettings } from '@/lib/payload'
import type { Media } from '@/payload-types'

type SeoInput = {
  title?: string | null
  description?: string | null
  image?: (string | null) | Media
  noIndex?: boolean | null
}

type BuildArgs = {
  /** Champs SEO du document. */
  seo?: SeoInput | null
  /** Repli de titre lorsqu'aucun titre SEO n'est saisi. */
  fallbackTitle?: string | null
  /** Repli de description. */
  fallbackDescription?: string | null
  /** Image de repli du document (couverture, image d'en-tete...). */
  fallbackImage?: (string | null) | Media
  /** Chemin public, pour l'URL canonique. */
  path: string
  /** Type Open Graph. `article` pour un billet de blog, `website` sinon. */
  type?: 'website' | 'article'
  /** Dates ISO, exposees par Open Graph pour les articles. */
  publishedTime?: string | null
  modifiedTime?: string | null
  /** Langue de la page. Determine la canonique et `og:locale`. */
  locale?: Locale
}

const absolute = (url: string | null): string | null =>
  url ? (url.startsWith('http') ? url : `${env.serverURL}${url}`) : null

/**
 * Construit les metadonnees d'une page a partir des champs CMS, avec repli sur
 * le document puis sur les reglages globaux du site.
 */
export const buildMetadata = async ({
  seo,
  fallbackTitle,
  fallbackDescription,
  fallbackImage,
  path,
  type = 'website',
  publishedTime,
  modifiedTime,
  locale = 'fr',
}: BuildArgs): Promise<Metadata> => {
  const settings = await getSiteSettings()

  const rawTitle =
    seo?.title?.trim() || fallbackTitle?.trim() || settings.defaultSeoTitle || settings.siteName
  const template = settings.titleTemplate?.includes('%s') ? settings.titleTemplate : null
  // Un titre portant deja le nom du site n'est pas decore une seconde fois.
  const composed =
    template && rawTitle && !rawTitle.includes(settings.siteName ?? '\u0000')
      ? template.replace('%s', rawTitle)
      : rawTitle

  const description =
    seo?.description?.trim() ||
    fallbackDescription?.trim() ||
    settings.defaultSeoDescription ||
    undefined

  const image =
    absolute(mediaUrl(seo?.image, 'content')) ??
    absolute(mediaUrl(fallbackImage, 'content')) ??
    absolute(mediaUrl(settings.defaultSeoImage, 'content'))

  const canonical = path === '/' ? env.serverURL : `${env.serverURL}${path}`

  return {
    // `absolute` empeche le gabarit declare dans le layout de s'appliquer une
    // seconde fois : sans cela, le nom du site apparait en double dans l'onglet
    // et dans les resultats de recherche.
    title: composed ? { absolute: composed } : undefined,
    description,
    // Chaque version est canonique d'elle-meme et declare l'autre par
    // `hreflang` : c'est ce qui apparie les deux langues aux yeux des moteurs.
    alternates: alternatesFor(path, env.serverURL, locale),
    robots: seo?.noIndex ? { index: false, follow: false } : undefined,
    openGraph: {
      type,
      locale: locale === 'en' ? 'en_CA' : 'fr_CA',
      ...(type === 'article'
        ? {
            publishedTime: publishedTime ?? undefined,
            modifiedTime: modifiedTime ?? publishedTime ?? undefined,
          }
        : {}),
      url: canonical,
      siteName: settings.siteName ?? undefined,
      title: composed ?? undefined,
      description,
      images: image ? [{ url: image }] : undefined,
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title: composed ?? undefined,
      description,
      images: image ? [image] : undefined,
    },
  }
}
