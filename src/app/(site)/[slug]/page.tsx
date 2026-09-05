import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { RenderBlocks } from '@/components/blocks/RenderBlocks'
import { SiteShell } from '@/components/site/SiteShell'
import { StructuredData } from '@/components/site/StructuredData'
import { getPage, getSiteSettings } from '@/lib/payload'
import { buildMetadata } from '@/lib/seo'
import { breadcrumbSchema, buildGraph } from '@/lib/structuredData'

type Args = { params: Promise<{ slug: string }> }

/**
 * Pages du site pilotees par le CMS.
 *
 * Le segment est unique et dynamique : les segments statiques de Payload
 * (`/admin`, `/api`) restent prioritaires, et les pages de detail a deux
 * segments (`/projects/...`, `/blog/...`) ont leurs propres routes.
 *
 * Le slug `home` n'est pas servi ici : l'accueil vit a la racine.
 */
export const generateMetadata = async ({ params }: Args): Promise<Metadata> => {
  const { slug } = await params
  const page = await getPage(slug)
  if (!page) return {}
  return buildMetadata({ seo: page.seo, fallbackTitle: page.title, path: `/${slug}` })
}

const CMSPage = async ({ params }: Args) => {
  const { slug } = await params
  if (slug === 'home') notFound()

  const [page, settings] = await Promise.all([getPage(slug), getSiteSettings()])
  if (!page) notFound()

  const graph = buildGraph([
    breadcrumbSchema([
      { name: settings.siteName ?? 'Accueil', path: '/' },
      { name: page.title ?? page.name ?? slug, path: `/${slug}` },
    ]),
  ])

  return (
    <SiteShell darkHeader={page.darkHeader}>
      <StructuredData json={graph} />
      <RenderBlocks blocks={page.layout} />
    </SiteShell>
  )
}

export default CMSPage
