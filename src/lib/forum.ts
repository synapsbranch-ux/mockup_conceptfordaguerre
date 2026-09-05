import 'server-only'

import type { Where } from 'payload'

import { getPayloadClient } from '@/lib/payload'
import type { ForumCategory, ForumTopic } from '@/payload-types'

/**
 * Lectures du forum public.
 *
 * Les clauses correspondent aux index composés déclarés sur `forumTopics` :
 * `(category, status, pinned, lastActivityAt)` et `(status, pinned,
 * lastActivityAt)`. Un fil filtré par catégorie et trié par activité reste
 * donc servi par un index, sans tri en mémoire.
 *
 * Seules les discussions `published` sont exposées : brouillons, contenus
 * masqués et archives n'atteignent jamais une surface publique, ni le plan du
 * site.
 */

export const FORUM_SORTS = ['recent', 'active', 'popular', 'unanswered'] as const
export type ForumSort = (typeof FORUM_SORTS)[number]

export const parseSort = (value: unknown): ForumSort =>
  typeof value === 'string' && (FORUM_SORTS as readonly string[]).includes(value)
    ? (value as ForumSort)
    : 'active'

export const PAGE_SIZE = 20

/** Clause de base : uniquement ce qui est réellement public. */
export const PUBLIC_TOPIC_WHERE: Where = { status: { equals: 'published' } }

type FeedOptions = {
  page?: number
  categorySlug?: string
  tag?: string
  search?: string
  sort?: ForumSort
}

const sortExpression = (sort: ForumSort): string => {
  switch (sort) {
    case 'recent':
      return '-createdAt'
    case 'popular':
      return '-reactionCount'
    case 'unanswered':
      return '-createdAt'
    case 'active':
    default:
      return '-lastActivityAt'
  }
}

export const getForumCategories = async (): Promise<ForumCategory[]> => {
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'forumCategories',
    where: { archived: { not_equals: true } },
    limit: 50,
    depth: 0,
    sort: 'order',
    overrideAccess: true,
  })
  return docs
}

export const getForumFeed = async (options: FeedOptions = {}) => {
  const payload = await getPayloadClient()
  const page = Math.max(1, options.page ?? 1)
  const sort = options.sort ?? 'active'

  const clauses: Where[] = [PUBLIC_TOPIC_WHERE]

  if (options.categorySlug) {
    const category = await payload.find({
      collection: 'forumCategories',
      where: { slug: { equals: options.categorySlug } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
    // Catégorie inconnue : fil vide plutôt que fil complet, pour que l'URL ne
    // mente pas sur ce qu'elle montre.
    if (category.docs.length === 0) {
      return { docs: [] as ForumTopic[], totalDocs: 0, totalPages: 0, page, hasMore: false }
    }
    clauses.push({ category: { equals: category.docs[0].id } })
  }

  if (options.tag) {
    clauses.push({ 'tags.label': { equals: options.tag } })
  }

  if (options.search) {
    const term = options.search.trim().slice(0, 120)
    if (term) {
      clauses.push({
        or: [{ title: { like: term } }, { body: { like: term } }],
      })
    }
  }

  if (sort === 'unanswered') {
    clauses.push({ replyCount: { equals: 0 } })
  }

  const result = await payload.find({
    collection: 'forumTopics',
    where: clauses.length === 1 ? clauses[0] : { and: clauses },
    limit: PAGE_SIZE,
    page,
    depth: 1,
    // Les discussions épinglées remontent en tête, quel que soit le tri choisi.
    sort: ['-pinned', sortExpression(sort)].join(','),
    overrideAccess: true,
  })

  return {
    docs: result.docs,
    totalDocs: result.totalDocs,
    totalPages: result.totalPages,
    page: result.page ?? page,
    hasMore: Boolean(result.hasNextPage),
  }
}

export const getForumTopic = async (slug: string): Promise<ForumTopic | null> => {
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'forumTopics',
    where: { and: [{ slug: { equals: slug } }, PUBLIC_TOPIC_WHERE] },
    limit: 1,
    depth: 2,
    overrideAccess: true,
  })
  return docs[0] ?? null
}

export const getTopicReplies = async (topicId: string) => {
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'forumReplies',
    where: { and: [{ topic: { equals: topicId } }, { status: { equals: 'published' } }] },
    limit: 200,
    depth: 1,
    sort: 'createdAt',
    overrideAccess: true,
  })
  return docs
}

/** Slugs des discussions publiques, pour le plan du site. */
export const getPublicTopicSlugs = async (): Promise<{ slug: string; updatedAt: string }[]> => {
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'forumTopics',
    where: PUBLIC_TOPIC_WHERE,
    limit: 0,
    pagination: false,
    depth: 0,
    select: { slug: true, updatedAt: true },
    overrideAccess: true,
  })
  return docs
    .filter((doc): doc is typeof doc & { slug: string } => Boolean(doc.slug))
    .map((doc) => ({ slug: doc.slug, updatedAt: doc.updatedAt }))
}

/**
 * Incrémente le compteur de vues sans bloquer l'affichage.
 * Un échec est silencieux : une statistique ne doit jamais empêcher la lecture.
 */
export const recordTopicView = async (topicId: string, current: number): Promise<void> => {
  try {
    const payload = await getPayloadClient()
    await payload.update({
      collection: 'forumTopics',
      id: topicId,
      data: { viewCount: current + 1 },
      overrideAccess: true,
      context: { disableRevalidate: true },
    })
  } catch {
    // Sans conséquence.
  }
}
