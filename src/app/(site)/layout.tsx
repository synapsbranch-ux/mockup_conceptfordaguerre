import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import { env } from '@/lib/env'
import { getSiteSettings } from '@/lib/payload'

import '@/styles/globals.css'

/**
 * Racine du site public.
 *
 * L'en-tete et le pied de page ne sont pas rendus ici mais par `SiteShell`,
 * appele par chaque page : la classe `theme-dark-header` doit etre posee sur un
 * ancetre de `.site-header` et depend de la page affichee, information dont un
 * layout App Router ne dispose pas.
 */
export const generateMetadata = async (): Promise<Metadata> => {
  const settings = await getSiteSettings()
  const keywords = (settings.keywords ?? []).map((entry) => entry.label).filter(Boolean)
  const indexable = settings.allowIndexing !== false

  return {
    metadataBase: new URL(env.serverURL),
    title: {
      default: settings.defaultSeoTitle ?? settings.siteName ?? 'Jacques-Daguerre Valcy',
      template: settings.titleTemplate?.includes('%s')
        ? settings.titleTemplate
        : '%s | Jacques-Daguerre Valcy',
    },
    description: settings.defaultSeoDescription ?? undefined,
    keywords: keywords.length > 0 ? keywords : undefined,
    applicationName: settings.siteName ?? undefined,
    authors: settings.structuredData?.personName
      ? [{ name: settings.structuredData.personName, url: env.serverURL }]
      : undefined,
    creator: settings.structuredData?.personName ?? undefined,
    publisher: settings.structuredData?.organizationName ?? settings.brandName ?? undefined,
    // Codes de propriete des consoles de recherche, saisis dans le CMS.
    verification: {
      google: settings.verification?.google || undefined,
      other: settings.verification?.bing ? { 'msvalidate.01': settings.verification.bing } : undefined,
    },
    // Interrupteur global : bloque l'indexation de tout le site.
    robots: indexable
      ? {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            'max-image-preview': 'large',
            'max-snippet': -1,
            'max-video-preview': -1,
          },
        }
      : { index: false, follow: false },
    formatDetection: { telephone: false },
  }
}

const SiteLayout = ({ children }: { children: ReactNode }) => (
  <html lang="fr">
    <body>{children}</body>
  </html>
)

export default SiteLayout
