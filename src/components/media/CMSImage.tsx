import Image from 'next/image'

import type { Media } from '@/payload-types'

/** Déclinaisons générées par la collection Media, de la plus petite à la plus grande. */
export type MediaSizeName = 'thumbnail' | 'card' | 'content' | 'hero'

type Props = {
  media: (string | null)[] | (string | null) | Media | null | undefined
  /** Texte alternatif contextuel. À défaut, celui défini sur le média est utilisé. */
  alt?: string | null
  /** Déclinaison servie comme source. Le navigateur reçoit toujours l'original en repli. */
  size?: MediaSizeName
  sizes?: string
  priority?: boolean
  className?: string
}

const isMedia = (value: unknown): value is Media =>
  typeof value === 'object' && value !== null && 'url' in value

type Source = { url: string; width: number; height: number }

/**
 * Ramene une URL servie par notre propre API a un chemin relatif.
 *
 * Payload prefixe `url` avec `serverURL` (`http://hote/api/media/file/...`).
 * En chemin relatif, l'optimiseur d'images de Next la traite comme locale : ni
 * `remotePatterns` a declarer, ni URL a reconfigurer entre environnements.
 * Les URLs d'un fournisseur externe (S3, R2) restent absolues et intactes.
 */
const normalizeUrl = (url: string): string => {
  if (url.startsWith('/')) return url
  try {
    const parsed = new URL(url)
    return parsed.pathname.startsWith('/api/') ? `${parsed.pathname}${parsed.search}` : url
  } catch {
    return url
  }
}

const pickSource = (media: Media, size: MediaSizeName | undefined): Source | null => {
  const variant = size ? media.sizes?.[size] : undefined
  if (variant?.url && variant.width && variant.height) {
    return { url: normalizeUrl(variant.url), width: variant.width, height: variant.height }
  }
  if (media.url && media.width && media.height) {
    return { url: normalizeUrl(media.url), width: media.width, height: media.height }
  }
  return null
}

/**
 * Point de résolution unique entre la collection Media et `next/image`.
 *
 * Garantit qu'aucune image ne sort sans texte alternatif : la surcharge
 * contextuelle prime, puis le texte alternatif du média — lui-même obligatoire
 * en base. Un média absent ou non peuplé ne rend rien plutôt qu'une image
 * cassée.
 *
 * Les dimensions proviennent du média réel ; la feuille de style contrôle la
 * hauteur affichée (`object-fit: cover`), la mise en page est donc inchangée.
 */
export const CMSImage = ({ media, alt, size, sizes = '100vw', priority, className }: Props) => {
  const resolved = Array.isArray(media) ? media[0] : media
  if (!isMedia(resolved)) return null

  const source = pickSource(resolved, size)
  if (!source) return null

  const alternative = alt?.trim() || resolved.alt?.trim() || ''

  return (
    <Image
      src={source.url}
      alt={alternative}
      width={source.width}
      height={source.height}
      sizes={sizes}
      priority={priority}
      className={className}
    />
  )
}

/** URL directe d'un média, pour les usages CSS (image de fond de bannière). */
export const mediaUrl = (
  media: (string | null) | Media | null | undefined,
  size?: MediaSizeName,
): string | null => {
  if (!isMedia(media)) return null
  return pickSource(media, size)?.url ?? null
}

/** Texte alternatif effectif d'un média, surcharge contextuelle comprise. */
export const mediaAlt = (
  media: (string | null) | Media | null | undefined,
  override?: string | null,
): string => {
  if (override?.trim()) return override.trim()
  return isMedia(media) ? (media.alt?.trim() ?? '') : ''
}
