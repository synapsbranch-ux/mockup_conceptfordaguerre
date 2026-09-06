import Link from 'next/link'

import { NewsletterForm } from '@/components/forms/NewsletterForm'
import { CMSImage } from '@/components/media/CMSImage'
import { resolveHref, targetProps } from '@/lib/links'
import { getFooter, getSiteSettings } from '@/lib/payload'

import { Headline } from './primitives'
import { SocialIcon } from './SocialIcon'

/** Pied de page du site, alimenté par les globals « Pied de page » et « Réglages ». */
export const Footer = async () => {
  const [footer, settings] = await Promise.all([getFooter(), getSiteSettings()])

  const visuals = footer.visuals ?? []
  const [firstVisual, secondVisual] = visuals
  const socials = settings.socials ?? []

  const renderVisual = (visual: (typeof visuals)[number] | undefined, sizes: string) => {
    if (!visual?.image) return null
    return (
      <figure>
        <CMSImage media={visual.image} alt={visual.imageAlt} size="card" sizes={sizes} />
        {visual.caption && <figcaption>{visual.caption}</figcaption>}
      </figure>
    )
  }

  return (
    <footer className="site-footer">
      <div className="footer-visuals">
        {renderVisual(firstVisual, '(max-width: 820px) 100vw, 36vw')}
        <div className="footer-visual-message">
          <span>{footer.visualMessage?.kicker}</span>
          <p>
            <Headline segments={footer.visualMessage?.lines} />
          </p>
        </div>
        {renderVisual(secondVisual, '(max-width: 820px) 100vw, 36vw')}
      </div>

      <div className="footer-lead">
        {footer.newsletterEyebrow && <p className="eyebrow light">{footer.newsletterEyebrow}</p>}
        <h2>
          <Headline segments={footer.newsletterTitle} />
        </h2>
        <NewsletterForm
          fieldLabel={footer.newsletterFieldLabel}
          placeholder={footer.newsletterPlaceholder}
          buttonLabel={footer.newsletterButton}
          messages={footer.newsletterMessages}
          source="pied-de-page"
        />
        {footer.newsletterConsent && <p className="consent">{footer.newsletterConsent}</p>}
      </div>

      <div className="footer-links">
        {(footer.columns ?? []).map((column, columnIndex) => (
          <div key={column.id ?? `col-${columnIndex}`}>
            <p className="footer-label">{column.title}</p>

            {column.kind === 'socials'
              ? socials.map((social, socialIndex) => {
                  const key = social.id ?? `social-${socialIndex}`
                  const url = social.url?.trim()
                  const icon = <SocialIcon network={social.network} />

                  // Un lien externe s'ouvre dans un nouvel onglet ; `mailto:`
                  // reste dans l'onglet courant.
                  if (url) {
                    const external = !url.startsWith('mailto:')
                    return (
                      <a
                        key={key}
                        className="social-link"
                        href={url}
                        {...(external ? { target: '_blank', rel: 'me noopener noreferrer' } : {})}
                      >
                        {icon}
                        <span>{social.label}</span>
                      </a>
                    )
                  }

                  // Réseau sans adresse : l'entrée est omise plutôt que
                  // rendue en lien mort. On n'invente pas d'URL, et on
                  // n'affiche pas non plus une mention d'attente au visiteur.
                  return []
                })
              : (column.links ?? []).flatMap((entry, linkIndex) => {
                  const href = resolveHref(entry.link)
                  if (!href || !entry.link?.label) return []
                  const key = entry.id ?? `link-${columnIndex}-${linkIndex}`
                  if (href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('http')) {
                    return [
                      <a key={key} href={href} {...targetProps(entry.link)}>
                        {entry.link.label}
                      </a>,
                    ]
                  }
                  return [
                    <Link key={key} href={href} {...targetProps(entry.link)}>
                      {entry.link.label}
                    </Link>,
                  ]
                })}
          </div>
        ))}
      </div>

      <div className="footer-bottom">
        <span>{footer.copyright ?? settings.copyright}</span>
        <span>{footer.signature ?? settings.tagline}</span>
      </div>
    </footer>
  )
}
