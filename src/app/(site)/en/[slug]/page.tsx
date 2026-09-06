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
 * Pages CMS, version anglaise.
 *
 * Le repli est appliqué champ par champ : une page partiellement traduite
 * affiche l'anglais là où il existe et le français ailleurs, plutôt que de
 * mélanger une page vide et une page complète.
 */
/*
 * Volontairement PAS de `generateStaticParams`.
 *
 * La version française de cette route est rendue dynamiquement ; en pré-générer
 * la liste ici rendrait la construction dépendante de la base, alors qu'elle ne
 * l'était pas. Une base momentanément injoignable ferait alors échouer un
 * déploiement qui, autrement, aurait abouti — le contenu étant de toute façon
 * lu à la requête.
 */
export const generateMetadata = async ({ params }: Args): Promise<Metadata> => {
  const { slug } = await params
  const page = await getPage(slug, 'en')
  if (!page) return {}

  return buildMetadata({
    seo: page.seo,
    fallbackTitle: page.title,
    path: `/en/${slug}`,
    locale: 'en',
  })
}

const EnglishCMSPage = async ({ params }: Args) => {
  const { slug } = await params

  // L'accueil vit à `/en`, jamais à `/en/home`.
  if (slug === 'home') notFound()

  const [page, settings] = await Promise.all([getPage(slug, 'en'), getSiteSettings()])
  if (!page) notFound()

  const graph = buildGraph([
    breadcrumbSchema([
      { name: settings.siteName ?? 'Home', path: '/en' },
      { name: page.title ?? page.name ?? slug, path: `/en/${slug}` },
    ]),
  ])

  return (
    <SiteShell darkHeader={page.darkHeader}>
      <StructuredData json={graph} />
      <RenderBlocks blocks={page.layout} />
    </SiteShell>
  )
}

export default EnglishCMSPage
