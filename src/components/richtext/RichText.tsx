import Link from 'next/link'
import type { ReactNode } from 'react'

import { CMSImage } from '@/components/media/CMSImage'
import type { Media } from '@/payload-types'

/**
 * Sérialiseur Lexical.
 *
 * Volontairement restreint aux nœuds que l'éditeur peut produire. Tout nœud
 * inconnu est ignoré plutôt que rendu : aucun HTML arbitraire ne peut donc
 * traverser le CMS jusqu'à la page publique.
 */

type LexicalNode = {
  type?: string
  text?: string
  format?: number | string
  tag?: string
  listType?: string
  url?: string
  newTab?: boolean
  fields?: Record<string, unknown>
  value?: unknown
  relationTo?: string
  children?: LexicalNode[]
}

export type LexicalDocument = {
  root?: { children?: LexicalNode[] }
} | null | undefined

// Masques de format des nœuds texte Lexical.
const BOLD = 1
const ITALIC = 1 << 1
const STRIKETHROUGH = 1 << 2
const UNDERLINE = 1 << 3
const CODE = 1 << 4
const SUBSCRIPT = 1 << 5
const SUPERSCRIPT = 1 << 6

const renderText = (node: LexicalNode, key: string): ReactNode => {
  let content: ReactNode = node.text ?? ''
  const format = typeof node.format === 'number' ? node.format : 0

  if (format & CODE) content = <code>{content}</code>
  if (format & BOLD) content = <strong>{content}</strong>
  if (format & ITALIC) content = <em>{content}</em>
  if (format & UNDERLINE) content = <u>{content}</u>
  if (format & STRIKETHROUGH) content = <s>{content}</s>
  if (format & SUBSCRIPT) content = <sub>{content}</sub>
  if (format & SUPERSCRIPT) content = <sup>{content}</sup>

  return <span key={key}>{content}</span>
}

const isSafeHref = (url: string): boolean =>
  url.startsWith('/') ||
  url.startsWith('#') ||
  url.startsWith('mailto:') ||
  url.startsWith('tel:') ||
  url.startsWith('http://') ||
  url.startsWith('https://')

const renderChildren = (nodes: LexicalNode[] | undefined, prefix: string): ReactNode[] =>
  (nodes ?? []).map((child, index) => renderNode(child, `${prefix}-${index}`))

const renderNode = (node: LexicalNode, key: string): ReactNode => {
  switch (node.type) {
    case 'text':
      return renderText(node, key)

    case 'linebreak':
      return <br key={key} />

    case 'paragraph': {
      const children = renderChildren(node.children, key)
      if (children.length === 0) return null
      return <p key={key}>{children}</p>
    }

    case 'heading': {
      const tag = node.tag === 'h1' ? 'h2' : (node.tag ?? 'h2')
      const Tag = (['h2', 'h3', 'h4', 'h5', 'h6'].includes(tag) ? tag : 'h2') as 'h2'
      return <Tag key={key}>{renderChildren(node.children, key)}</Tag>
    }

    case 'quote':
      return <blockquote key={key}>{renderChildren(node.children, key)}</blockquote>

    case 'list': {
      const Tag = node.listType === 'number' ? 'ol' : 'ul'
      return <Tag key={key}>{renderChildren(node.children, key)}</Tag>
    }

    case 'listitem':
      return <li key={key}>{renderChildren(node.children, key)}</li>

    case 'horizontalrule':
      return <hr key={key} />

    case 'link':
    case 'autolink': {
      const fields = (node.fields ?? {}) as { url?: string; newTab?: boolean; linkType?: string }
      const url = fields.url ?? node.url ?? ''
      if (!url || !isSafeHref(url)) {
        return <span key={key}>{renderChildren(node.children, key)}</span>
      }
      const external = url.startsWith('http')
      const props = fields.newTab ? { target: '_blank', rel: 'noopener noreferrer' } : {}
      if (external) {
        return (
          <a key={key} href={url} {...props}>
            {renderChildren(node.children, key)}
          </a>
        )
      }
      return (
        <Link key={key} href={url} {...props}>
          {renderChildren(node.children, key)}
        </Link>
      )
    }

    case 'upload': {
      const value = node.value as Media | string | null | undefined
      if (!value || typeof value === 'string') return null
      return (
        <figure key={key}>
          <CMSImage media={value} size="content" sizes="(max-width: 820px) 100vw, 760px" />
          {value.caption && <figcaption>{value.caption}</figcaption>}
        </figure>
      )
    }

    default:
      // Nœud non pris en charge : on rend ses enfants s'il en a, sinon rien.
      return node.children ? <span key={key}>{renderChildren(node.children, key)}</span> : null
  }
}

export const RichText = ({ content }: { content: LexicalDocument }) => {
  const children = content?.root?.children
  if (!children?.length) return null
  return <>{renderChildren(children, 'rt')}</>
}

/** Estime un temps de lecture à partir d'un document Lexical (200 mots/minute). */
export const estimateReadingTime = (content: LexicalDocument): string | null => {
  const collect = (nodes: LexicalNode[] | undefined): string =>
    (nodes ?? [])
      .map((node) => `${node.text ?? ''} ${collect(node.children)}`)
      .join(' ')
  const words = collect(content?.root?.children).trim().split(/\s+/).filter(Boolean).length
  if (words === 0) return null
  return `${Math.max(1, Math.round(words / 200))} min`
}
