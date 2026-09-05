import Link from 'next/link'

import { getHeader } from '@/lib/payload'
import { resolveHref } from '@/lib/links'

import { MainNav, type NavItem } from './MainNav'
import { Arrow } from './primitives'

/** En-tête du site, alimenté par le global « En-tête ». */
export const Header = async () => {
  const header = await getHeader()
  const brand = header.brand ?? {}

  const items: NavItem[] = (header.navigation ?? []).flatMap((entry, index) => {
    const href = resolveHref(entry.link)
    if (!href || !entry.link?.label) return []
    return [{ key: entry.id ?? `nav-${index}`, label: entry.link.label, href, newTab: Boolean(entry.link.newTab) }]
  })

  const ctaHref = header.cta?.enabled ? resolveHref(header.cta.link) : null

  return (
    <>
      <a className="skip-link" href="#contenu">
        {header.skipLinkLabel ?? 'Aller au contenu'}
      </a>
      <header className="site-header">
        <Link href="/" className="brand" aria-label={brand.ariaLabel ?? undefined}>
          <span className="brand-mark">{brand.initials}</span>
          <span className="brand-name">
            {brand.lineOne}
            <br />
            {brand.lineTwo}
          </span>
        </Link>
        <MainNav
          items={items}
          toggleLabel={header.mobile?.toggleLabel}
          closeLabel={header.mobile?.closeLabel}
        />
        {ctaHref && header.cta?.link?.label && (
          <Link className="header-cta" href={ctaHref}>
            {header.cta.link.label} <Arrow />
          </Link>
        )}
      </header>
    </>
  )
}
