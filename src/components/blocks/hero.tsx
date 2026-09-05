import Link from 'next/link'
import type { CSSProperties } from 'react'

import { mediaUrl } from '@/components/media/CMSImage'
import { Arrow, Headline } from '@/components/site/primitives'
import { resolveHref, targetProps } from '@/lib/links'
import type { HeroBlock, PageIntroBlock, StatementBlock } from '@/payload-types'

/** Courbe décorative de l'encart chiffré. Élément de design, non éditorial. */
const MetricChart = ({ label }: { label?: string | null }) => (
  <svg viewBox="0 0 360 100" role="img" aria-label={label ?? undefined}>
    <path
      className="chart-fill"
      d="M0 88 C45 85,60 58,104 65 S170 80,205 46 S285 55,360 6 L360 100 L0 100Z"
    />
    <path className="chart-line" d="M0 88 C45 85,60 58,104 65 S170 80,205 46 S285 55,360 6" />
  </svg>
)

export const Hero = ({ block }: { block: HeroBlock }) => {
  const background = mediaUrl(block.image, 'hero')
  const style = background
    ? ({ '--hero-image': `url(${background})` } as CSSProperties)
    : undefined

  return (
    <section className="hero" style={style}>
      <div className="hero-overlay" />
      <div className="hero-content shell">
        {block.kicker && (
          <p className="hero-kicker">
            <span /> {block.kicker}
          </p>
        )}
        <h1>
          <Headline segments={block.title} />
        </h1>
        {block.copy && <p className="hero-copy">{block.copy}</p>}
        {(block.buttons ?? []).length > 0 && (
          <div className="hero-actions">
            {(block.buttons ?? []).flatMap((button, index) => {
              const href = resolveHref(button.link)
              if (!href || !button.link?.label) return []
              return [
                <Link
                  key={button.id ?? `hero-btn-${index}`}
                  href={href}
                  className={`button button-${button.style ?? 'accent'}`}
                  {...targetProps(button.link)}
                >
                  {button.link.label}
                  {button.showArrow !== false && (
                    <>
                      {' '}
                      <Arrow />
                    </>
                  )}
                </Link>,
              ]
            })}
          </div>
        )}
      </div>

      {block.metric?.enabled && (
        <div className="hero-metric" aria-label="Aperçu analytique décoratif">
          <div className="metric-top">
            <span>{block.metric.label}</span>
            <strong>{block.metric.value}</strong>
          </div>
          <MetricChart label={block.metric.ariaLabel} />
          <div className="metric-bottom">
            {(block.metric.steps ?? []).map((step, index) => (
              <span key={step.id ?? `step-${index}`}>{step.label}</span>
            ))}
          </div>
        </div>
      )}

      {block.scrollCue?.enabled && block.scrollCue.anchor && (
        <a className="scroll-cue" href={`#${block.scrollCue.anchor}`}>
          {block.scrollCue.label} <span>↓</span>
        </a>
      )}
    </section>
  )
}

export const PageIntro = ({ block }: { block: PageIntroBlock }) => (
  <section className="page-intro shell">
    <div>
      {block.eyebrow && <p className="eyebrow">{block.eyebrow}</p>}
      <h1>
        <Headline segments={block.title} />
      </h1>
    </div>
    <div className="page-intro-copy">
      {block.number && <span className="page-number">{block.number}</span>}
      {block.description && <p>{block.description}</p>}
    </div>
  </section>
)

export const Statement = ({ block }: { block: StatementBlock }) => (
  <section className="statement shell" id={block.anchor ?? undefined}>
    {block.eyebrow && <p className="eyebrow">{block.eyebrow}</p>}
    <p className="statement-text">
      <Headline segments={block.statement} />
    </p>
    {block.signature && <div className="statement-signature">{block.signature}</div>}
  </section>
)
