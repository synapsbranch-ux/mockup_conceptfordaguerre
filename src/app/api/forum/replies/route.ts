import { NextResponse } from 'next/server'

import { canPublish, createReplySchema, recountReplies } from '@/lib/server/community'
import { getPayloadClient } from '@/lib/payload'
import { badRequest, fail, notFound, ok, readBody, withUser } from '@/lib/server/api'
import { notifyMany } from '@/lib/server/notify'

/**
 * Reponse a une discussion.
 *
 * Verifie que la discussion existe, est publiee et n'est pas verrouillee — le
 * verrou est une decision de moderation, il ne doit pas dependre de l'absence
 * d'un champ de saisie dans l'interface.
 *
 * Les abonnes sont notifies, l'auteur de la reponse excepte : on ne se notifie
 * pas d'avoir ecrit soi-meme.
 */
export const POST = async (request: Request): Promise<NextResponse> =>
  withUser(request, { scope: 'forum:reply', limit: 20, windowSeconds: 15 * 60 }, async (user) => {
    const permission = canPublish(user)
    if (!permission.ok) return fail(permission.code, 403)

    const parsed = await readBody(request, createReplySchema)
    if (!parsed.ok) return parsed.response
    const { topicId, body, parentId } = parsed.data

    const payload = await getPayloadClient()

    const topic = await payload
      .findByID({ collection: 'forumTopics', id: topicId, depth: 0, overrideAccess: true })
      .catch(() => null)
    if (!topic || topic.status !== 'published') return notFound()
    if (topic.locked) {
      return fail('locked', 403, 'Cette discussion est verrouillee.')
    }

    // Un seul niveau d'imbrication, verifie cote serveur.
    if (parentId) {
      const parent = await payload
        .findByID({ collection: 'forumReplies', id: parentId, depth: 0, overrideAccess: true })
        .catch(() => null)
      if (!parent || parent.status !== 'published') {
        return badRequest('La reponse ciblee n’est plus disponible.')
      }
      if (parent.parent) return badRequest('Les reponses ne peuvent pas etre imbriquees davantage.')
      if (String(parent.topic) !== String(topicId)) {
        return badRequest('Cette reponse n’appartient pas a la discussion.')
      }
    }

    const created = await payload.create({
      collection: 'forumReplies',
      data: {
        topic: topicId,
        parent: parentId ?? undefined,
        author: user.id,
        body,
        status: 'published',
        reactionCount: 0,
        reportCount: 0,
      },
      overrideAccess: true,
      context: { disableRevalidate: true },
    })

    // Recompte plutot qu'incremente : reste juste apres moderation ou suppression.
    await recountReplies(topicId).catch(() => null)

    // Notifie les abonnes de la discussion.
    const subscriptions = await payload
      .find({
        collection: 'forumSubscriptions',
        where: { topic: { equals: topicId } },
        limit: 500,
        depth: 0,
        overrideAccess: true,
      })
      .catch(() => ({ docs: [] as { user: string | { id: string } }[] }))

    const recipients = subscriptions.docs.map((entry) =>
      String(typeof entry.user === 'object' ? entry.user.id : entry.user),
    )

    await notifyMany(
      recipients,
      {
        type: 'forum_reply',
        title: 'Nouvelle reponse',
        body: `${user.name || 'Une personne'} a repondu a « ${topic.title} ».`,
        link: `/forum/${topic.slug}#reponse-${created.id}`,
      },
      user.id,
    )

    return ok({ id: created.id }, 201)
  })
