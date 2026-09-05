import type { ReactNode } from 'react'

import { Footer } from './Footer'
import { Header } from './Header'

/**
 * Enveloppe commune à toutes les pages publiques.
 *
 * Elle est rendue par chaque page plutôt que par le layout, car la classe
 * `theme-dark-header` doit être posée sur un ancêtre de `.site-header` et
 * dépend de la page affichée — information dont un layout App Router ne
 * dispose pas. L'en-tête et le pied de page restent alimentés par les globals,
 * donc une modification s'applique bien partout.
 */
export const SiteShell = ({
  children,
  darkHeader = false,
}: {
  children: ReactNode
  darkHeader?: boolean | null
}) => (
  <div className={darkHeader ? 'theme-dark-header' : ''}>
    <Header />
    <main id="contenu">{children}</main>
    <Footer />
  </div>
)
