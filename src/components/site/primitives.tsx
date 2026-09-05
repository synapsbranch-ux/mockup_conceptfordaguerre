import Link from 'next/link'
import { Fragment, type ReactNode } from 'react'

import { resolveHref, targetProps, type CMSLink } from '@/lib/links'

/** Flèche décorative reprise du prototype. */
export const Arrow = () => <span aria-hidden="true">↗</span>

export type HeadlineSegment = {
  text?: string | null
  emphasized?: boolean | null
  newLine?: boolean | null
  id?: string | null
}

/**
 * Rend un titre composé de segments.
 *
 * Les segments d'une même ligne sont assemblés avec une espace simple ; un
 * segment marqué « nouvelle ligne » est précédé d'un `<br/>`. L'emphase produit
 * un `<em>`, qui porte le style serif italique du design.
 *
 * Reproduit exactement le balisage que le prototype injectait en HTML brut,
 * sans jamais exposer de HTML aux éditeurs.
 */
export const Headline = ({ segments }: { segments?: HeadlineSegment[] | null }) => {
  const items = (segments ?? []).filter((segment) => segment.text?.trim())
  if (items.length === 0) return null

  return (
    <>
      {items.map((segment, index) => {
        const text = segment.text as string
        const content = segment.emphasized ? <em>{text}</em> : text
        const key = segment.id ?? `${index}-${text.slice(0, 12)}`
        // Fragments plutôt que `span` : le balisage produit est exactement
        // celui du prototype (texte, `<br/>`, `<em>`), sans nœud superflu.
        return (
          <Fragment key={key}>
            {index > 0 && (segment.newLine ? <br /> : ' ')}
            {content}
          </Fragment>
        )
      })}
    </>
  )
}

/** Version texte d'un titre segmenté, pour les métadonnées et les intitulés accessibles. */
export const headlineToText = (segments?: HeadlineSegment[] | null): string =>
  (segments ?? [])
    .map((segment) => segment.text?.trim())
    .filter(Boolean)
    .join(' ')

/** Lien éditorial : rendu comme lien si la destination est résolue, sinon en texte. */
export const CMSLinkView = ({
  link,
  className,
  children,
  ariaLabel,
}: {
  link?: CMSLink | null
  className?: string
  children?: ReactNode
  ariaLabel?: string | null
}) => {
  const href = resolveHref(link)
  const content = children ?? link?.label
  if (!href) return content ? <span className={className}>{content}</span> : null
  return (
    <Link href={href} className={className} aria-label={ariaLabel ?? undefined} {...targetProps(link)}>
      {content}
    </Link>
  )
}

export type SectionHeading = {
  eyebrow?: string | null
  title?: string | null
  showAction?: boolean | null
  action?: CMSLink | null
}

/** En-tête de section (`.section-heading`), avec lien d'action optionnel. */
export const SectionTitle = ({ heading }: { heading?: SectionHeading | null }) => {
  if (!heading?.eyebrow && !heading?.title) return null
  const actionHref = heading.showAction ? resolveHref(heading.action) : null

  return (
    <div className="section-heading">
      <div>
        {heading.eyebrow && <p className="eyebrow">{heading.eyebrow}</p>}
        {heading.title && <h2>{heading.title}</h2>}
      </div>
      {actionHref && heading.action?.label && (
        <Link className="text-link" href={actionHref} {...targetProps(heading.action)}>
          {heading.action.label} <Arrow />
        </Link>
      )}
    </div>
  )
}
