import { CMSImage } from '@/components/media/CMSImage'
import { Headline, SectionTitle } from '@/components/site/primitives'
import type {
  GalleryBlock,
  GalleryFourBlock,
  MetricsBlock,
  TimelineBlock,
  ValuesListBlock,
} from '@/payload-types'

/** Classe de grille correspondant au format choisi pour chaque vignette. */
const galleryClass = (size?: string | null): string | undefined => {
  if (size === 'tall') return 'gallery-tall'
  if (size === 'wide') return 'gallery-wide'
  return undefined
}

export const GalleryFour = ({ block }: { block: GalleryFourBlock }) => (
  <section className="home-gallery section-pad shell">
    <SectionTitle heading={block.heading} />
    <div className="home-gallery-grid">
      {(block.items ?? []).map((item, index) => (
        <figure key={item.id ?? `g-${index}`} className={galleryClass(item.size)}>
          <CMSImage
            media={item.image}
            alt={item.imageAlt}
            size="content"
            sizes={item.size === 'tall' ? '(max-width: 520px) 100vw, 38vw' : item.size === 'wide' ? '(max-width: 520px) 100vw, 62vw' : '(max-width: 520px) 100vw, 31vw'}
          />
          {(item.number || item.caption) && (
            <figcaption>
              {item.number && <span>{item.number}</span>} {item.caption}
            </figcaption>
          )}
        </figure>
      ))}
    </div>
  </section>
)

export const Gallery = ({ block }: { block: GalleryBlock }) => {
  const items = block.items ?? []
  if (items.length === 0) return null

  return (
    <section className={block.variant === 'grid' ? 'home-gallery section-pad shell' : 'about-milestones shell'}>
      {items.map((item, index) => (
        <figure key={item.id ?? `m-${index}`}>
          <CMSImage
            media={item.image}
            alt={item.imageAlt}
            size="content"
            sizes={index === 0 ? '(max-width: 520px) 100vw, 67vw' : '(max-width: 520px) 100vw, 33vw'}
          />
          {item.caption && <figcaption>{item.caption}</figcaption>}
        </figure>
      ))}
    </section>
  )
}

/**
 * Indicateurs chiffrés.
 * Réutilise la grille `.commitments` du design plutôt que d'introduire de
 * nouveaux styles.
 */
export const Metrics = ({ block }: { block: MetricsBlock }) => {
  const items = block.items ?? []
  if (items.length === 0) return null
  return (
    <>
      {block.heading?.title && (
        <div className="shell">
          <SectionTitle heading={block.heading} />
        </div>
      )}
      <section className="commitments shell section-pad">
        {items.map((item, index) => (
          <article key={item.id ?? `metric-${index}`}>
            <span>{item.value}</span>
            <h2>{item.label}</h2>
            {item.description && <p>{item.description}</p>}
          </article>
        ))}
      </section>
    </>
  )
}

export const Timeline = ({ block }: { block: TimelineBlock }) => (
  <section className="journey-section section-pad">
    <div className="shell">
      {block.eyebrow && <p className="eyebrow light">{block.eyebrow}</p>}
      {(block.title ?? []).length > 0 && (
        <h2 className="display-light">
          <Headline segments={block.title} />
        </h2>
      )}
      <div className="journey-list">
        {(block.items ?? []).map((item, index) => (
          <article className="journey-row" key={item.id ?? `j-${index}`}>
            <span>{String(index + 1).padStart(2, '0')}</span>
            <div>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </div>
            <CMSImage media={item.image} alt={item.imageAlt} size="thumbnail" sizes="180px" />
          </article>
        ))}
      </div>
    </div>
  </section>
)

export const ValuesList = ({ block }: { block: ValuesListBlock }) => {
  const values = block.values ?? []

  if (block.variant === 'marquee') {
    return (
      <section className="values-marquee" aria-label={block.ariaLabel ?? 'Valeurs'}>
        {values.map((value, index) => (
          <span key={value.id ?? `v-${index}`}>{value.label}</span>
        ))}
      </section>
    )
  }

  if (block.variant === 'stack') {
    return (
      <section className="shell section-pad">
        <div className="value-stack">
          {values.map((value, index) => (
            <span key={value.id ?? `v-${index}`}>{value.label}</span>
          ))}
        </div>
      </section>
    )
  }

  return (
    <section className="about-grid section-pad shell">
      <div>
        {block.eyebrow && <p className="eyebrow">{block.eyebrow}</p>}
        {(block.title ?? []).length > 0 && (
          <h2>
            <Headline segments={block.title} />
          </h2>
        )}
      </div>
      <div className="about-story">
        {(block.paragraphs ?? []).map((paragraph, index) => (
          <p key={paragraph.id ?? `p-${index}`}>{paragraph.text}</p>
        ))}
      </div>
      <div className="value-stack">
        {values.map((value, index) => (
          <span key={value.id ?? `v-${index}`}>{value.label}</span>
        ))}
      </div>
    </section>
  )
}
