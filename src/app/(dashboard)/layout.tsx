import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import { ThemeProvider } from '@/components/dashboard/ThemeProvider'

import '@/styles/dashboard.css'

/**
 * Racine du groupe `(dashboard)` — espace client et administration.
 *
 * C'est ici, et nulle part ailleurs, que `dashboard.css` est chargé : le site
 * public a sa propre racine `(site)` et ne traverse jamais cette feuille.
 * Tailwind n'atteint donc jamais les pages publiques.
 *
 * `suppressHydrationWarning` est requis par next-themes, qui pose la classe de
 * thème sur `<html>` avant l'hydratation.
 */
export const metadata: Metadata = {
  title: { default: 'Espace', template: '%s | Jacques-Daguerre Valcy' },
  // Aucun écran authentifié n'a vocation à être indexé.
  robots: { index: false, follow: false },
}

const DashboardLayout = ({ children }: { children: ReactNode }) => (
  <html lang="fr" suppressHydrationWarning>
    <body>
      <ThemeProvider>
        <a
          href="#contenu"
          className="focus:bg-background sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:border focus:px-4 focus:py-2 focus:text-sm"
        >
          Aller au contenu
        </a>
        {children}
      </ThemeProvider>
    </body>
  </html>
)

export default DashboardLayout
