import { NextResponse } from 'next/server'

import { subscriptionSchema } from '@/lib/server/community'
import { getPayloadClient } from '@/lib/payload'
import { notFound, ok, readBody, withUser } from '@/lib/server/api'

/**
 * Suivi d'une discussion (bascule).
 * Unicite (personne, discussion) garantie par index unique compose.
 */
export const POST = async (request: Request): Promise<NextResponse> =>
  withUser(request, { scope: 'forum:subscribe', limit: 60, windowSeconds: 10 * 60 }, async (user) => {
    const parsed = await readBody(request, subscriptionSchema)
    if (!parsed.ok) return parsed.response
    const { topicId } = parsed.data

    const payload = await getPayloadClient()

    const topic = await payload
      .findByID({ collection: 'forumTopics', id: topicId, depth: 0, overrideAccess: true })
      .catch(() => null)
    if (!topic || topic.status !== 'published') return notFound()

    const existing = await payload.find({
      collection: 'forumSubscriptions',
      where: { and: [{ user: { equals: user.id } }, { topic: { equals: topicId } }] },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })

    if (existing.docs.length > 0) {
      await payload.delete({
        collection: 'forumSubscriptions',
        id: existing.docs[0].id,
        overrideAccess: true,
        context: { disableRevalidate: true },
      })
      return ok({ following: false })
    }

    try {
      await payload.create({
        collection: 'forumSubscriptions',
        data: { user: user.id, topic: topicId },
        overrideAccess: true,
        context: { disableRevalidate: true },
      })
    } catch {
      // Deja abonne : resultat identique.
    }
    return ok({ following: true })
  })
