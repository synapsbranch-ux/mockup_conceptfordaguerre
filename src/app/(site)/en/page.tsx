import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { RenderBlocks } from '@/components/blocks/RenderBlocks'
import { SiteShell } from '@/components/site/SiteShell'
import { StructuredData } from '@/components/site/StructuredData'
import { getPage, getSiteSettings } from '@/lib/payload'
import { buildMetadata } from '@/lib/seo'
import {
  buildGraph,
  organizationSchema,
  personSchema,
  websiteSchema,
} from '@/lib/structuredData'

const HOME_SLUG = 'home'

/**
 * Accueil, version anglaise.
 *
 * Même document CMS que la version française, lu avec `locale: 'en'`. Les
 * champs non traduits retombent sur le français, de sorte que la page reste
 * complète dès le premier jour plutôt que d'afficher des blocs vides.
 */
export const generateMetadata = async (): Promise<Metadata> => {
  const page = await getPage(HOME_SLUG, 'en')
  return buildMetadata({
    seo: page?.seo,
    fallbackTitle: page?.title,
    path: '/en',
    locale: 'en',
  })
}

const EnglishHomePage = async () => {
  const [page, settings] = await Promise.all([getPage(HOME_SLUG, 'en'), getSiteSettings()])
  if (!page) notFound()

  const graph = buildGraph([
    websiteSchema(settings),
    personSchema(settings),
    organizationSchema(settings),
  ])

  return (
    <SiteShell darkHeader={page.darkHeader}>
      <StructuredData json={graph} />
      <RenderBlocks blocks={page.layout} />
    </SiteShell>
  )
}

export default EnglishHomePage
