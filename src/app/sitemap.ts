import type { MetadataRoute } from 'next'

import { env } from '@/lib/env'
import { getArticles, getPayloadClient, getProjects, getSiteSettings } from '@/lib/payload'
import { getPublicTopicSlugs } from '@/lib/forum'
import { pagePath } from '@/lib/links'

/**
 * Plan du site.
 *
 * Ne liste que du contenu reellement atteignable :
 *  - documents publies uniquement (l'API Local filtre les brouillons) ;
 *  - pages marquees « ne pas indexer » exclues ;
 *  - `/space` exclu, c'est une maquette sans contenu indexable.
 *
 * Aucune URL du plan ne peut donc mener a une 404 ou a une page vide.
 */

/** Pages exclues du plan : maquettes ou zones privees. */
const EXCLUDED_SLUGS = new Set(['space'])

const url = (path: string): string => `${env.serverURL}${path === '/' ? '' : path}`

const sitemap = async (): Promise<MetadataRoute.Sitemap> => {
  const settings = await getSiteSettings()
  if (settings.allowIndexing === false) return []

  const payload = await getPayloadClient()

  const { docs: pages } = await payload.find({
    collection: 'pages',
    limit: 0,
    pagination: false,
    depth: 0,
    where: { _status: { equals: 'published' } },
  })

  const [projects, articles] = await Promise.all([getProjects(), getArticles()])

  const entries: MetadataRoute.Sitemap = []

  for (const page of pages) {
    if (!page.slug || EXCLUDED_SLUGS.has(page.slug)) continue
    if (page.seo?.noIndex) continue

    const path = pagePath(page.slug)
    const isHome = path === '/'
    entries.push({
      url: url(path),
      lastModified: new Date(page.updatedAt),
      changeFrequency: isHome ? 'weekly' : 'monthly',
      priority: isHome ? 1 : 0.8,
    })
  }

  for (const project of projects) {
    if (!project.slug || project.seo?.noIndex) continue
    entries.push({
      url: url(`/projects/${project.slug}`),
      lastModified: new Date(project.updatedAt),
      changeFrequency: 'monthly',
      priority: 0.7,
    })
  }

  for (const article of articles) {
    if (!article.slug || article.seo?.noIndex) continue
    entries.push({
      url: url(`/blog/${article.slug}`),
      lastModified: new Date(article.updatedAt),
      changeFrequency: 'monthly',
      priority: 0.7,
    })
  }

  // Forum : uniquement les discussions publiees. `getPublicTopicSlugs` borne
  // deja la requete au statut « published », donc aucun contenu masque,
  // archive ou en brouillon ne peut atteindre le plan du site.
  const community = await payload
    .findGlobal({ slug: 'communitySettings', depth: 0 })
    .catch(() => null)

  if (community?.forumEnabled !== false) {
    entries.push({
      url: url('/forum'),
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.6,
    })

    for (const topic of await getPublicTopicSlugs()) {
      entries.push({
        url: url(`/forum/${topic.slug}`),
        lastModified: new Date(topic.updatedAt),
        changeFrequency: 'weekly',
        priority: 0.5,
      })
    }
  }

  return entries
}

export default sitemap
