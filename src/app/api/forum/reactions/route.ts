import { NextResponse } from 'next/server'

import { canPublish, reactionSchema, recountReactions } from '@/lib/server/community'
import { getPayloadClient } from '@/lib/payload'
import { fail, notFound, ok, readBody, withUser } from '@/lib/server/api'

/**
 * Ajout ou retrait d'une reaction (bascule).
 *
 * L'unicite du triplet (personne, cible, type) est garantie par un index unique
 * compose : un double-clic ou deux requetes concurrentes ne peuvent pas creer
 * deux lignes. La bascule s'appuie donc sur la base, pas sur l'etat du client.
 */
export const POST = async (request: Request): Promise<NextResponse> =>
  withUser(request, { scope: 'forum:reaction', limit: 60, windowSeconds: 10 * 60 }, async (user) => {
    const permission = canPublish(user)
    if (!permission.ok) return fail(permission.code, 403)

    const parsed = await readBody(request, reactionSchema)
    if (!parsed.ok) return parsed.response
    const { targetType, targetId, type } = parsed.data

    const payload = await getPayloadClient()

    // La cible doit exister et etre publiee.
    const collection = targetType === 'topic' ? 'forumTopics' : 'forumReplies'
    const target = await payload
      .findByID({ collection, id: targetId, depth: 0, overrideAccess: true })
      .catch(() => null)
    if (!target || target.status !== 'published') return notFound()

    const existing = await payload.find({
      collection: 'forumReactions',
      where: {
        and: [
          { user: { equals: user.id } },
          { targetType: { equals: targetType } },
          { targetId: { equals: targetId } },
          { type: { equals: type } },
        ],
      },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })

    let active: boolean
    if (existing.docs.length > 0) {
      await payload.delete({
        collection: 'forumReactions',
        id: existing.docs[0].id,
        overrideAccess: true,
        context: { disableRevalidate: true },
      })
      active = false
    } else {
      try {
        await payload.create({
          collection: 'forumReactions',
          data: { user: user.id, targetType, targetId, type },
          overrideAccess: true,
          context: { disableRevalidate: true },
        })
        active = true
      } catch {
        // Course perdue contre une requete concurrente : l'index a tranche,
        // la reaction existe deja. C'est le resultat voulu.
        active = true
      }
    }

    const count = await recountReactions(targetType, targetId).catch(() => 0)
    return ok({ active, count })
  })
