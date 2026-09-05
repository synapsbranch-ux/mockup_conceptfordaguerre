'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

export type NavItem = {
  key: string
  label: string
  href: string
  newTab?: boolean
}

/**
 * Navigation principale et bouton de menu mobile.
 *
 * Rendus comme frères dans la grille de l'en-tête, exactement comme dans le
 * prototype : le bouton est masqué en CSS au-delà du point de rupture.
 */
export const MainNav = ({
  items,
  toggleLabel,
  closeLabel,
}: {
  items: NavItem[]
  toggleLabel?: string | null
  closeLabel?: string | null
}) => {
  const pathname = usePathname() ?? '/'
  const [open, setOpen] = useState(false)

  // Même règle que le prototype : correspondance exacte, ou préfixe pour les
  // sections ayant des sous-pages (/projects/… reste sous « Réalisations »).
  const isActive = (href: string) =>
    pathname === href || (href !== '/' && pathname.startsWith(href))

  return (
    <>
      <button
        className="menu-toggle"
        type="button"
        aria-expanded={open}
        aria-label={(open ? closeLabel : toggleLabel) ?? 'Ouvrir le menu'}
        onClick={() => setOpen(!open)}
      >
        <span /> <span />
      </button>
      <nav className={open ? 'main-nav is-open' : 'main-nav'} aria-label="Navigation principale">
        {items.map((item) => (
          <Link
            key={item.key}
            href={item.href}
            className={isActive(item.href) ? 'active' : ''}
            onClick={() => setOpen(false)}
            {...(item.newTab ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </>
  )
}
