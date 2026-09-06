import Link from 'next/link'

import { ContactForm as ContactFormClient } from '@/components/forms/ContactForm'
import { NewsletterForm } from '@/components/forms/NewsletterForm'
import { RichText } from '@/components/richtext/RichText'
import { Arrow, Headline } from '@/components/site/primitives'
import { SocialIcon } from '@/components/site/SocialIcon'
import { resolveHref, targetProps } from '@/lib/links'
import { getSiteSettings } from '@/lib/payload'
import type {
  ContactFormBlock,
  ContactInfoBlock,
  CtaBlock,
  LegalContentBlock,
  NewsletterFormBlock,
} from '@/payload-types'

export const Cta = ({ block }: { block: CtaBlock }) => {
  const href = resolveHref(block.link)

  if (block.variant === 'collab') {
    return (
      <section className="collab shell section-pad">
        <div>
          {block.eyebrow && <p className="eyebrow">{block.eyebrow}</p>}
          <h2>
            <Headline segments={block.title} />
          </h2>
        </div>
        {href && block.link?.label && (
          <Link className="button button-dark" href={href} {...targetProps(block.link)}>
            {block.link.label} <Arrow />
          </Link>
        )}
      </section>
    )
  }

  return (
    <section className="cta-band shell">
      <div>
        {block.eyebrow && <p className="eyebrow light">{block.eyebrow}</p>}
        <h2>
          <Headline segments={block.title} />
        </h2>
      </div>
      {href && (
        <Link
          href={href}
          className="round-link"
          aria-label={block.ariaLabel ?? undefined}
          {...targetProps(block.link)}
        >
          <Arrow />
        </Link>
      )}
    </section>
  )
}

export const ContactInfo = async ({ block }: { block: ContactInfoBlock }) => {
  // Les reseaux viennent des reglages du site : une seule saisie, reprise ici
  // comme dans le pied de page.
  const settings = block.socials?.enabled ? await getSiteSettings() : null
  const socials = (settings?.socials ?? []).filter((social) =>
    block.socials?.hidePending ? Boolean(social.url?.trim()) : true,
  )

  return (
    <aside className="contact-aside">
      {(block.items ?? []).map((item, index) => (
        <div key={item.id ?? `ci-${index}`}>
          <span>{item.label}</span>
          {item.kind === 'email' ? (
            <a href={`mailto:${item.value}`}>{item.value}</a>
          ) : item.kind === 'link' && item.href ? (
            <a href={item.href}>{item.value}</a>
          ) : (
            <p>{item.value}</p>
          )}
        </div>
      ))}

      {block.socials?.enabled && socials.length > 0 && (
        <div>
          <span>{block.socials.label}</span>
          <div className="social-links">
            {socials.map((social, index) => {
              const key = social.id ?? `cs-${index}`
              const url = social.url?.trim()
              const icon = <SocialIcon network={social.network} size={18} />
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
              // Réseau sans adresse : l'entrée est omise. Afficher un lien
              // mort assorti d'une mention d'attente n'apporte rien au
              // visiteur et donne au site un air inachevé.
              return null
            })}
          </div>
        </div>
      )}

      {block.availability?.enabled && block.availability.text && (
        <div className="availability">
          <i /> {block.availability.text}
        </div>
      )}
    </aside>
  )
}

export const ContactForm = ({ block }: { block: ContactFormBlock }) => (
  <ContactFormClient block={block} />
)

export const NewsletterSection = ({ block }: { block: NewsletterFormBlock }) => (
  <section className="footer-lead shell section-pad">
    {block.eyebrow && <p className="eyebrow">{block.eyebrow}</p>}
    {(block.title ?? []).length > 0 && (
      <h2>
        <Headline segments={block.title} />
      </h2>
    )}
    <NewsletterForm
      id={`newsletter-${block.id ?? 'block'}`}
      fieldLabel={block.emailLabel}
      placeholder={block.placeholder}
      buttonLabel={block.buttonLabel}
      messages={block.messages}
      source={block.source ?? 'page'}
    />
    {block.consent && <p className="consent">{block.consent}</p>}
  </section>
)

export const LegalContent = ({ block }: { block: LegalContentBlock }) => {
  const sections = block.sections ?? []
  return (
    <section className="legal-layout shell section-pad-top">
      <nav aria-label={block.tocLabel ?? undefined}>
        {sections.map((section, index) => (
          <a key={section.id ?? `toc-${index}`} href={`#${section.anchor}`}>
            {section.title}
          </a>
        ))}
      </nav>
      <div className="legal-content">
        {block.warning?.enabled && block.warning.text && (
          <div className="legal-warning">{block.warning.text}</div>
        )}
        {sections.map((section, index) => (
          <section id={section.anchor ?? undefined} key={section.id ?? `sec-${index}`}>
            {section.number && <span>{section.number}</span>}
            <h2>{section.title}</h2>
            <RichText content={section.content} />
          </section>
        ))}
        {block.lastUpdated && (
          <p className="prototype-caption">
            Dernière mise à jour :{' '}
            {new Intl.DateTimeFormat('fr-CA', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            }).format(new Date(block.lastUpdated))}
          </p>
        )}
      </div>
    </section>
  )
}

