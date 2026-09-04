import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/router'
import { useState } from 'react'
import { images } from '@/data/site'

const nav = [
  ['Accueil', '/'],
  ['À propos', '/about'],
  ['Réalisations', '/projects'],
  ['Services', '/services'],
  ['Blog', '/blog'],
  ['Engagement', '/engagement'],
  ['Contact', '/contact'],
]

function Arrow() {
  return <span aria-hidden="true">↗</span>
}

export default function Layout({ children, darkHeader = false }) {
  const { pathname } = useRouter()
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')

  const subscribe = (event) => {
    event.preventDefault()
    setMessage(email ? 'Merci — inscription simulée pour ce prototype.' : 'Ajoutez votre adresse courriel.')
  }

  return (
    <div className={darkHeader ? 'theme-dark-header' : ''}>
      <a className="skip-link" href="#contenu">Aller au contenu</a>
      <header className="site-header">
        <Link href="/" className="brand" aria-label="Jacques-Daguerre Valcy — accueil">
          <span className="brand-mark">JD</span>
          <span className="brand-name">Jacques-Daguerre<br />Valcy</span>
        </Link>
        <button
          className="menu-toggle"
          type="button"
          aria-expanded={open}
          aria-label="Ouvrir le menu"
          onClick={() => setOpen(!open)}
        >
          <span /> <span />
        </button>
        <nav className={open ? 'main-nav is-open' : 'main-nav'} aria-label="Navigation principale">
          {nav.map(([label, href]) => (
            <Link
              key={href}
              href={href}
              className={pathname === href || (href !== '/' && pathname.startsWith(href)) ? 'active' : ''}
              onClick={() => setOpen(false)}
            >
              {label}
            </Link>
          ))}
        </nav>
        <Link className="header-cta" href="/space">Espace <Arrow /></Link>
      </header>

      <main id="contenu">{children}</main>

      <footer className="site-footer">
        <div className="footer-visuals">
          <figure><SiteImage src={images.professionalAnalyst} alt="Jacques-Daguerre Valcy, analyste de données" sizes="(max-width: 820px) 100vw, 36vw" /><figcaption>Analyser avec rigueur</figcaption></figure>
          <div className="footer-visual-message"><span>DATAKLE / 2026</span><p>Clarifier.<br /><em>Décider.</em><br />Agir.</p></div>
          <figure><SiteImage src={images.datakleFounder} alt="Jacques-Daguerre Valcy, fondateur de Datakle" sizes="(max-width: 820px) 100vw, 36vw" /><figcaption>Construire avec impact</figcaption></figure>
        </div>
        <div className="footer-lead">
          <p className="eyebrow light">Restons connectés</p>
          <h2>Des idées utiles,<br /><em>directement dans votre boîte.</em></h2>
          <form className="newsletter" onSubmit={subscribe}>
            <label className="sr-only" htmlFor="newsletter-email">Adresse courriel</label>
            <input
              id="newsletter-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="votre@courriel.com"
            />
            <button type="submit">S’inscrire <Arrow /></button>
          </form>
          {message && <p className="form-note" role="status">{message}</p>}
          <p className="consent">En vous inscrivant, vous acceptez la politique de confidentialité. Désabonnement en tout temps.</p>
        </div>
        <div className="footer-links">
          <div>
            <p className="footer-label">Explorer</p>
            {nav.slice(1).map(([label, href]) => <Link href={href} key={href}>{label}</Link>)}
          </div>
          <div>
            <p className="footer-label">Réseaux</p>
            {['LinkedIn', 'GitHub', 'Medium', 'YouTube', 'Instagram'].map((label) => (
              <span className="pending-link" key={label}>{label} <small>à confirmer</small></span>
            ))}
          </div>
          <div>
            <p className="footer-label">Contact</p>
            <a href="mailto:jdvalcy02@gmail.com">jdvalcy02@gmail.com</a>
            <Link href="/legal">Informations légales</Link>
            <Link href="/admin">Prototype CMS</Link>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2026 Jacques-Daguerre Valcy</span>
          <span>Data · Stratégie · Impact</span>
        </div>
      </footer>
    </div>
  )
}

export function PageIntro({ eyebrow, title, description, number }) {
  return (
    <section className="page-intro shell">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1 dangerouslySetInnerHTML={{ __html: title }} />
      </div>
      <div className="page-intro-copy">
        {number && <span className="page-number">{number}</span>}
        <p>{description}</p>
      </div>
    </section>
  )
}

export function SectionTitle({ eyebrow, title, action, href = '/' }) {
  return (
    <div className="section-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
      </div>
      {action && <Link className="text-link" href={href}>{action} <Arrow /></Link>}
    </div>
  )
}

export function SiteImage({ src, alt = '', width = 1600, height = 1000, sizes = '100vw', ...props }) {
  return <Image src={src} alt={alt} width={width} height={height} sizes={sizes} {...props} />
}

export { Arrow }
