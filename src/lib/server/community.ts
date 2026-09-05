import 'server-only'

import { z } from 'zod'

import { getPayloadClient } from '@/lib/payload'
import type { SessionUser } from '@/lib/auth/dal'

/**
 * Règles partagées par les commentaires et le forum.
 *
 * Le droit de publier n'est jamais déduit de l'interface : chaque route le
 * revérifie ici, à partir de l'état réel du compte.
 */

/** Un compte suspendu ou banni du forum conserve la lecture, perd la publication. */
export const canPublish = (user: SessionUser): { ok: true } | { ok: false; code: string } => {
  if (user.suspended) return { ok: false, code: 'suspended' }
  if (user.forumBanned) return { ok: false, code: 'community_banned' }
  return { ok: true }
}

/**
 * Mode de modération applicable à un article.
 * Le réglage de l'article prime, sinon le réglage global du site.
 */
export const resolveCommentMode = async (article: {
  commentsMode?: string | null
}): Promise<'direct' | 'premoderated'> => {
  if (article.commentsMode === 'direct' || article.commentsMode === 'premoderated') {
    return article.commentsMode
  }
  try {
    const payload = await getPayloadClient()
    const settings = await payload.findGlobal({ slug: 'communitySettings', depth: 0 })
    return settings.commentsModeration === 'premoderated' ? 'premoderated' : 'direct'
  } catch {
    // En cas de doute, on prémodère : mieux vaut retenir un message légitime
    // que publier un abus sans contrôle.
    return 'premoderated'
  }
}

// --- Schémas de validation ------------------------------------------------------

/** Corps d'un contenu communautaire : borné, non vide une fois nettoyé. */
const body = (max: number) =>
  z
    .string()
    .trim()
    .min(2, 'Le message est trop court.')
    .max(max, `Le message ne peut pas dépasser ${max} caractères.`)

/** Identifiant Mongo, refusé s'il n'a pas la forme attendue. */
export const objectId = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, 'Identifiant invalide.')

export const createCommentSchema = z.object({
  articleId: objectId,
  body: body(4000),
  // Une réponse cible un commentaire racine. La profondeur est revérifiée
  // côté serveur : un identifiant de réponse est refusé.
  parentId: objectId.optional().nullable(),
})

export const updateCommentSchema = z.object({ body: body(4000) })

export const reportSchema = z.object({
  reason: z.enum(['offensive', 'spam', 'off_topic', 'personal_data', 'other']),
  detail: z.string().trim().max(1000).optional(),
})

export const moderateCommentSchema = z.object({
  status: z.enum(['published', 'pending', 'hidden', 'spam']),
})

export const createTopicSchema = z.object({
  title: z.string().trim().min(5, 'Le titre est trop court.').max(160),
  body: body(12000),
  categoryId: objectId,
  tags: z.array(z.string().trim().min(1).max(30)).max(5).optional(),
})

export const updateTopicSchema = z.object({
  title: z.string().trim().min(5).max(160).optional(),
  body: body(12000).optional(),
})

export const createReplySchema = z.object({
  topicId: objectId,
  body: body(8000),
  parentId: objectId.optional().nullable(),
})

export const updateReplySchema = z.object({ body: body(8000) })

export const reactionSchema = z.object({
  targetType: z.enum(['topic', 'reply']),
  targetId: objectId,
  type: z.enum(['helpful', 'thanks', 'insightful']),
})

export const subscriptionSchema = z.object({ topicId: objectId })

/**
 * Recalcule un compteur depuis la source, plutôt que de l'incrémenter.
 * Un incrément à l'aveugle dérive dès qu'une suppression ou une modération
 * intervient ; un recomptage reste juste.
 */
export const recountReplies = async (topicId: string): Promise<number> => {
  const payload = await getPayloadClient()
  const result = await payload.count({
    collection: 'forumReplies',
    where: { and: [{ topic: { equals: topicId } }, { status: { equals: 'published' } }] },
    overrideAccess: true,
  })
  await payload.update({
    collection: 'forumTopics',
    id: topicId,
    data: { replyCount: result.totalDocs, lastActivityAt: new Date().toISOString() },
    overrideAccess: true,
    context: { disableRevalidate: true },
  })
  return result.totalDocs
}

/** Recompte les réactions d'une cible. */
export const recountReactions = async (
  targetType: 'topic' | 'reply',
  targetId: string,
): Promise<number> => {
  const payload = await getPayloadClient()
  const result = await payload.count({
    collection: 'forumReactions',
    where: {
      and: [{ targetType: { equals: targetType } }, { targetId: { equals: targetId } }],
    },
    overrideAccess: true,
  })
  await payload.update({
    collection: targetType === 'topic' ? 'forumTopics' : 'forumReplies',
    id: targetId,
    data: { reactionCount: result.totalDocs },
    overrideAccess: true,
    context: { disableRevalidate: true },
  })
  return result.totalDocs
}
