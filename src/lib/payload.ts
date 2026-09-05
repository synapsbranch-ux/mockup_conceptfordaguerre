import 'server-only'

import config from '@payload-config'
import { unstable_cache } from 'next/cache'
import { draftMode } from 'next/headers'
import { getPayload } from 'payload'
import type { Payload } from 'payload'

import type { Article, Commitment, Page, Project, Service } from '@/payload-types'

export const getPayloadClient = async (): Promise<Payload> => getPayload({ config })

/**
 * Vrai lorsque la prévisualisation de brouillon est active.
 * `draftMode()` n'existe pas hors requête (génération statique) : on retombe
 * alors sur `false`, ce qui garantit qu'un brouillon ne fuite jamais.
 */
export const isDraftEnabled = async (): Promise<boolean> => {
  try {
    return (await draftMode()).isEnabled
  } catch {
    return false
  }
}

/** Tag invalidé par les hooks Payload à chaque publication. */
const CONTENT_TAG = 'content'

/**
 * Mémoïse une lecture publique.
 * Le mode brouillon court-circuite systématiquement le cache : un aperçu doit
 * refléter l'état exact du document, sans latence d'invalidation.
 */
const withCache = <T>(
  fetcher: () => Promise<T>,
  keyParts: string[],
  tags: string[],
): (() => Promise<T>) => unstable_cache(fetcher, keyParts, { tags: [...tags, CONTENT_TAG] })

// --- Pages -------------------------------------------------------------------

const fetchPage = async (slug: string, draft: boolean): Promise<Page | null> => {
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'pages',
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 3,
    draft,
    overrideAccess: draft,
  })
  return docs[0] ?? null
}

export const getPage = async (slug: string): Promise<Page | null> => {
  const draft = await isDraftEnabled()
  if (draft) return fetchPage(slug, true)
  return withCache(() => fetchPage(slug, false), ['page', slug], ['pages'])()
}

export const getPageSlugs = async (): Promise<string[]> => {
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'pages',
    limit: 0,
    pagination: false,
    depth: 0,
    select: { slug: true },
  })
  return docs.map((doc) => doc.slug).filter((slug): slug is string => Boolean(slug))
}

// --- Projets -----------------------------------------------------------------

const fetchProjects = async (draft: boolean): Promise<Project[]> => {
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'projects',
    limit: 0,
    pagination: false,
    depth: 2,
    sort: 'order',
    draft,
    overrideAccess: draft,
  })
  return docs
}

export const getProjects = async (): Promise<Project[]> => {
  const draft = await isDraftEnabled()
  if (draft) return fetchProjects(true)
  return withCache(() => fetchProjects(false), ['projects'], ['projects'])()
}

const fetchProject = async (slug: string, draft: boolean): Promise<Project | null> => {
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'projects',
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 3,
    draft,
    overrideAccess: draft,
  })
  return docs[0] ?? null
}

export const getProject = async (slug: string): Promise<Project | null> => {
  const draft = await isDraftEnabled()
  if (draft) return fetchProject(slug, true)
  return withCache(() => fetchProject(slug, false), ['project', slug], ['projects'])()
}

// --- Articles ----------------------------------------------------------------

const fetchArticles = async (draft: boolean): Promise<Article[]> => {
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'articles',
    limit: 0,
    pagination: false,
    depth: 2,
    sort: 'order',
    // Un article archivé sort des listes publiques sans être dépublié.
    where: { archived: { not_equals: true } },
    draft,
    // Hors mode brouillon, les règles d'accès s'appliquent : sans session,
    // `articleReadAccess` restreint à « publié ET visibilité publique ».
    // Les articles réservés ne peuvent donc pas atteindre le plan du site
    // ni les listes publiques.
    overrideAccess: draft,
  })
  return docs
}

export const getArticles = async (): Promise<Article[]> => {
  const draft = await isDraftEnabled()
  if (draft) return fetchArticles(true)
  return withCache(() => fetchArticles(false), ['articles'], ['articles'])()
}

const fetchArticle = async (slug: string, draft: boolean): Promise<Article | null> => {
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'articles',
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 3,
    draft,
    overrideAccess: draft,
  })
  return docs[0] ?? null
}

export const getArticle = async (slug: string): Promise<Article | null> => {
  const draft = await isDraftEnabled()
  if (draft) return fetchArticle(slug, true)
  return withCache(() => fetchArticle(slug, false), ['article', slug], ['articles'])()
}

// --- Services et engagements --------------------------------------------------

const fetchServices = async (draft: boolean): Promise<Service[]> => {
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'services',
    limit: 0,
    pagination: false,
    depth: 2,
    sort: 'order',
    draft,
    overrideAccess: draft,
  })
  return docs
}

export const getServices = async (): Promise<Service[]> => {
  const draft = await isDraftEnabled()
  if (draft) return fetchServices(true)
  return withCache(() => fetchServices(false), ['services'], ['services'])()
}

const fetchCommitments = async (draft: boolean): Promise<Commitment[]> => {
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'commitments',
    limit: 0,
    pagination: false,
    depth: 2,
    sort: 'order',
    draft,
    overrideAccess: draft,
  })
  return docs
}

export const getCommitments = async (): Promise<Commitment[]> => {
  const draft = await isDraftEnabled()
  if (draft) return fetchCommitments(true)
  return withCache(() => fetchCommitments(false), ['commitments'], ['commitments'])()
}

// --- Globals -----------------------------------------------------------------

const fetchGlobal = async <S extends 'header' | 'footer' | 'siteSettings'>(slug: S) => {
  const payload = await getPayloadClient()
  return payload.findGlobal({ slug, depth: 2 })
}

export const getHeader = () =>
  withCache(() => fetchGlobal('header'), ['global', 'header'], ['globals'])()

export const getFooter = () =>
  withCache(() => fetchGlobal('footer'), ['global', 'footer'], ['globals'])()

export const getSiteSettings = () =>
  withCache(() => fetchGlobal('siteSettings'), ['global', 'siteSettings'], ['globals'])()
