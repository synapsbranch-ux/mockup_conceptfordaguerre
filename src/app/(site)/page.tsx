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

/** Slug reserve a la page d'accueil, servie a la racine du site. */
const HOME_SLUG = 'home'

export const generateMetadata = async (): Promise<Metadata> => {
  const page = await getPage(HOME_SLUG)
  return buildMetadata({
    seo: page?.seo,
    fallbackTitle: page?.title,
    path: '/',
  })
}

const HomePage = async () => {
  const [page, settings] = await Promise.all([getPage(HOME_SLUG), getSiteSettings()])
  if (!page) notFound()

  // L'accueil porte l'identite du site : personne, organisation et site web.
  // Les autres pages s'y referent par `@id` plutot que de la repeter.
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

export default HomePage
