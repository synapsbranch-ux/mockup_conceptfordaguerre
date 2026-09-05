import Link from 'next/link'

import { CMSImage } from '@/components/media/CMSImage'
import { RichText } from '@/components/richtext/RichText'
import { Arrow, Headline } from '@/components/site/primitives'
import { resolveHref, targetProps } from '@/lib/links'
import type {
  ImageBlock,
  ImageTextBlock,
  NoticeNoteBlock,
  QuoteBlock,
  RichTextBlock,
  SpacerBlock,
} from '@/payload-types'

export const RichTextSection = ({ block }: { block: RichTextBlock }) => (
  <section className={block.variant === 'wide' ? 'section-pad shell' : 'article-body'}>
    <RichText content={block.content} />
  </section>
)

export const ImageSection = ({ block }: { block: ImageBlock }) => (
  <section className={block.variant === 'full' ? '' : 'shell section-pad-top'}>
    <figure className="media-frame">
      <CMSImage
        media={block.image}
        alt={block.imageAlt}
        size="content"
        sizes={block.variant === 'full' ? '100vw' : '(max-width: 820px) 100vw, 1380px'}
      />
      {block.caption && <figcaption>{block.caption}</figcaption>}
    </figure>
  </section>
)

/** Paragraphes d'un bloc image-texte, avec chapeau et encart optionnels. */
const TextColumn = ({ block }: { block: ImageTextBlock }) => (
  <>
    {block.eyebrow && (
      <p className={block.variant === 'origin' || block.variant === 'vision' || block.variant === 'education' ? 'eyebrow light' : 'eyebrow'}>
        {block.eyebrow}
      </p>
    )}
    {(block.title ?? []).length > 0 && (
      <h2>
        <Headline segments={block.title} />
      </h2>
    )}
    {block.lead && <p className="lead-copy">{block.lead}</p>}
    {(block.paragraphs ?? []).map((paragraph, index) => (
      <p key={paragraph.id ?? `p-${index}`}>{paragraph.text}</p>
    ))}
    {block.note?.enabled && (
      <div className="about-note">
        {block.note.label && <span>{block.note.label}</span>}
        {block.note.text && <p>{block.note.text}</p>}
      </div>
    )}
    {block.showLink && resolveHref(block.link) && block.link?.label && (
      <Link
        className={block.variant === 'origin' ? 'button button-light' : 'button button-dark'}
        href={resolveHref(block.link) as string}
        {...targetProps(block.link)}
      >
        {block.link.label} <Arrow />
      </Link>
    )}
  </>
)

export const ImageText = ({ block }: { block: ImageTextBlock }) => {
  const image = (
    <CMSImage
      media={block.image}
      alt={block.imageAlt}
      size="hero"
      sizes="(max-width: 820px) 100vw, 50vw"
      priority={block.variant === 'about-lead' || block.variant === 'services-hero'}
    />
  )

  switch (block.variant) {
    case 'about-lead':
      return (
        <section className="about-lead shell">
          <div className="about-portrait">{image}</div>
          <div className="about-biography">
            <TextColumn block={block} />
          </div>
        </section>
      )

    case 'services-hero':
      return (
        <section className="services-hero shell">
          {image}
          <div>
            {block.eyebrow && <span>{block.eyebrow}</span>}
            {(block.paragraphs ?? []).map((paragraph, index) => (
              <p key={paragraph.id ?? `p-${index}`}>{paragraph.text}</p>
            ))}
          </div>
        </section>
      )

    case 'vision':
      return (
        <section className="vision-panel">
          <div className="vision-copy">
            <TextColumn block={block} />
          </div>
          <div className="vision-image">{image}</div>
        </section>
      )

    case 'education':
      return (
        <section className="education-panel">
          <div>{image}</div>
          <div>
            <TextColumn block={block} />
          </div>
        </section>
      )

    case 'origin':
    default:
      return (
        <section className="origin-split">
          <div className="origin-image">{image}</div>
          <div className="origin-copy">
            <TextColumn block={block} />
          </div>
        </section>
      )
  }
}

export const Quote = ({ block }: { block: QuoteBlock }) => {
  if (block.variant === 'plain') {
    return (
      <section className="shell section-pad">
        <blockquote>{block.quote}</blockquote>
        {block.attribution && <p className="eyebrow">{block.attribution}</p>}
      </section>
    )
  }

  return (
    <section className="engagement-visual shell">
      <CMSImage
        media={block.image}
        alt={block.imageAlt}
        size="hero"
        sizes="(max-width: 820px) 100vw, 65vw"
        priority
      />
      <div className="engagement-quote">
        {block.label && <span>{block.label}</span>}
        <blockquote>{block.quote}</blockquote>
        {block.attribution && <cite>{block.attribution}</cite>}
      </div>
    </section>
  )
}

/**
 * Encart d'information.
 * Chaque variante correspond à une mention provisoire du prototype, désormais
 * éditable dans le CMS plutôt que figée dans le code.
 */
export const NoticeNote = ({ block }: { block: NoticeNoteBlock }) => {
  switch (block.variant) {
    case 'about-note':
      return (
        <section className="shell">
          <div className="about-note">
            {block.label && <span>{block.label}</span>}
            <p>{block.text}</p>
          </div>
        </section>
      )
    case 'legal-warning':
      return <div className="legal-warning">{block.text}</div>
    case 'draft-note':
      return <div className="article-draft-note">{block.text}</div>
    case 'caption':
      return <p className="prototype-caption">{block.text}</p>
    case 'prototype-note':
    default:
      return <div className="prototype-note shell">{block.text}</div>
  }
}

export const Spacer = ({ block }: { block: SpacerBlock }) => {
  const height = block.variant === 'small' ? 40 : block.variant === 'large' ? 130 : 80
  if (block.divider) {
    return (
      <div className="shell" style={{ paddingBlock: height / 2 }}>
        <hr style={{ border: 0, borderTop: '1px solid var(--line)', margin: 0 }} />
      </div>
    )
  }
  return <div aria-hidden="true" style={{ height }} />
}
