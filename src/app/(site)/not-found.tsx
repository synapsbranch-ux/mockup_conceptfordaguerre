import type { Metadata } from 'next'
import Link from 'next/link'

import { Headline } from '@/components/site/primitives'
import { SiteShell } from '@/components/site/SiteShell'
import { getSiteSettings } from '@/lib/payload'

/**
 * Page 404 du site public, rendue avec l'habillage habituel.
 *
 * Tous les textes viennent des reglages du site : une adresse erronee reste
 * donc une page administrable, jamais un ecran technique.
 *
 * Elle n'est pas indexable : une 404 dans l'index de recherche est un signal
 * negatif et une impasse pour le visiteur.
 */
export const metadata: Metadata = {
  title: 'Page introuvable',
  robots: { index: false, follow: true },
}

const NotFound = async () => {
  const settings = await getSiteSettings()
  const content = settings.notFound

  return (
    <SiteShell>
      <section className="page-intro shell">
        <div>
          {content?.eyebrow && <p className="eyebrow">{content.eyebrow}</p>}
          <h1>
            <Headline segments={content?.title} />
          </h1>
        </div>
        <div className="page-intro-copy">
          {content?.number && <span className="page-number">{content.number}</span>}
          {content?.description && <p>{content.description}</p>}
        </div>
      </section>

      {content?.ctaLabel && (
        <section className="collab shell section-pad">
          <div>
            {content.ctaEyebrow && <p className="eyebrow">{content.ctaEyebrow}</p>}
            {content.ctaTitle && <h2>{content.ctaTitle}</h2>}
          </div>
          <Link className="button button-dark" href="/">
            {content.ctaLabel} ↗
          </Link>
        </section>
      )}
    </SiteShell>
  )
}

export default NotFound
