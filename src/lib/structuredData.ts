import 'server-only'

import { mediaUrl } from '@/components/media/CMSImage'
import { env } from '@/lib/env'
import type { Article, Media, Project, SiteSetting } from '@/payload-types'

/**
 * Donnees structurees JSON-LD.
 *
 * Alimentent les fiches enrichies des moteurs de recherche. Regle de fond :
 * aucun champ n'est invente. Une valeur absente du CMS est simplement omise du
 * document JSON-LD plutot que remplie par defaut — une fiche partielle vaut
 * mieux qu'une fiche fausse.
 */

type Json = Record<string, unknown>

const absolute = (url: string | null | undefined): string | undefined => {
  if (!url) return undefined
  return url.startsWith('http') ? url : `${env.serverURL}${url}`
}

/** Retire les cles vides, nulles ou tableaux vides, en profondeur. */
const compact = (input: Json): Json =>
  Object.fromEntries(
    Object.entries(input).filter(([, value]) => {
      if (value === undefined || value === null || value === '') return false
      if (Array.isArray(value) && value.length === 0) return false
      return true
    }),
  )

/** Adresses de reseaux effectivement renseignees, pour `sameAs`. */
const sameAs = (settings: SiteSetting): string[] =>
  (settings.socials ?? [])
    .map((social) => social.url?.trim())
    .filter((url): url is string => Boolean(url))
    .filter((url) => !url.startsWith('mailto:'))

const imageFrom = (media: (string | null) | Media | null | undefined): string | undefined =>
  absolute(mediaUrl(media, 'content'))

/** Identifiant stable de la personne, reference par les autres noeuds. */
const personId = `${env.serverURL}/#person`
const siteId = `${env.serverURL}/#website`
const orgId = `${env.serverURL}/#organization`

export const personSchema = (settings: SiteSetting): Json | null => {
  const data = settings.structuredData
  const name = data?.personName?.trim() || settings.siteName?.trim()
  if (!name) return null

  return compact({
    '@type': 'Person',
    '@id': personId,
    name,
    url: env.serverURL,
    jobTitle: data?.jobTitle?.trim(),
    description: data?.description?.trim() || settings.defaultSeoDescription?.trim(),
    email: settings.email ? `mailto:${settings.email}` : undefined,
    image: imageFrom(data?.portrait) ?? imageFrom(settings.defaultSeoImage),
    address: settings.location?.trim()
      ? { '@type': 'PostalAddress', addressLocality: settings.location.trim() }
      : undefined,
    knowsAbout: (data?.knowsAbout ?? []).map((entry) => entry.label).filter(Boolean),
    sameAs: sameAs(settings),
    worksFor: data?.organizationName?.trim() ? { '@id': orgId } : undefined,
  })
}

export const organizationSchema = (settings: SiteSetting): Json | null => {
  const data = settings.structuredData
  const name = data?.organizationName?.trim() || settings.brandName?.trim()
  if (!name) return null

  return compact({
    '@type': 'Organization',
    '@id': orgId,
    name,
    url: env.serverURL,
    description: data?.organizationDescription?.trim(),
    email: settings.email ? `mailto:${settings.email}` : undefined,
    logo: imageFrom(settings.defaultSeoImage),
    founder: data?.personName?.trim() ? { '@id': personId } : undefined,
    areaServed: (data?.areaServed ?? []).map((entry) => entry.label).filter(Boolean),
    sameAs: sameAs(settings),
  })
}

export const websiteSchema = (settings: SiteSetting): Json =>
  compact({
    '@type': 'WebSite',
    '@id': siteId,
    url: env.serverURL,
    name: settings.siteName?.trim(),
    description: settings.defaultSeoDescription?.trim(),
    inLanguage: 'fr-CA',
    publisher: settings.structuredData?.personName?.trim() ? { '@id': personId } : undefined,
  })

/** Fil d'Ariane, pour l'affichage du chemin sous le titre dans les resultats. */
export const breadcrumbSchema = (trail: { name: string; path: string }[]): Json => ({
  '@type': 'BreadcrumbList',
  itemListElement: trail.map((step, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: step.name,
    item: `${env.serverURL}${step.path === '/' ? '' : step.path}`,
  })),
})

export const articleSchema = (article: Article, settings: SiteSetting): Json => {
  const author =
    typeof article.author === 'object' && article.author?.name
      ? { '@type': 'Person', name: article.author.name }
      : settings.structuredData?.personName?.trim()
        ? { '@id': personId }
        : undefined

  return compact({
    '@type': 'BlogPosting',
    '@id': `${env.serverURL}/blog/${article.slug}#article`,
    headline: article.title,
    description: article.excerpt,
    image: imageFrom(article.hero),
    datePublished: article.publishedAt ?? undefined,
    dateModified: article.updatedAt ?? article.publishedAt ?? undefined,
    articleSection: article.category,
    keywords: (article.tags ?? []).map((tag) => tag.label).filter(Boolean),
    inLanguage: 'fr-CA',
    author,
    publisher: settings.structuredData?.organizationName?.trim() ? { '@id': orgId } : author,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${env.serverURL}/blog/${article.slug}`,
    },
    isPartOf: { '@id': siteId },
  })
}

export const projectSchema = (project: Project, settings: SiteSetting): Json =>
  compact({
    '@type': 'CreativeWork',
    '@id': `${env.serverURL}/projects/${project.slug}#project`,
    name: project.title,
    description: project.summary,
    image: imageFrom(project.cover),
    dateCreated: project.projectDate ?? undefined,
    datePublished: project.publishedAt ?? undefined,
    dateModified: project.updatedAt ?? undefined,
    genre: project.type,
    inLanguage: 'fr-CA',
    keywords: (project.technologies ?? []).map((tech) => tech.label).filter(Boolean),
    creator: settings.structuredData?.personName?.trim() ? { '@id': personId } : undefined,
    isPartOf: { '@id': siteId },
  })

/**
 * Assemble un document JSON-LD unique.
 * Un seul `@graph` par page : plus lisible pour les moteurs qu'une succession
 * de blocs independants, et les noeuds peuvent se referencer par `@id`.
 */
export const buildGraph = (nodes: (Json | null)[]): string =>
  JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': nodes.filter((node): node is Json => node !== null),
  })
