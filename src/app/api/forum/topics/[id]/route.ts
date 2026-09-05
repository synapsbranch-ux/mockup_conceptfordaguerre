import { NextResponse } from 'next/server'

import { canPublish, updateTopicSchema } from '@/lib/server/community'
import { getPayloadClient } from '@/lib/payload'
import { fail, notFound, ok, readBody, withUser } from '@/lib/server/api'
import { isStaffRole } from '@/lib/auth/roles'
import { recordAudit } from '@/lib/server/audit'
import { z } from 'zod'

type Params = { params: Promise<{ id: string }> }

/**
 * Modification d'une discussion par son auteur.
 *
 * Deux capacites distinctes, volontairement separees :
 *  - l'auteur modifie le titre et le corps, et marque sa discussion resolue ;
 *  - l'epinglage, le verrouillage et le masquage sont des actes de moderation,
 *    refuses ici et traites par la route d'administration.
 *
 * `resolved` est accepte pour l'auteur : c'est lui qui sait si sa question a
 * trouve reponse.
 */
const patchSchema = updateTopicSchema.extend({ resolved: z.boolean().optional() })

export const PATCH = async (request: Request, { params }: Params): Promise<NextResponse> =>
  withUser(request, { scope: 'forum:topic:update', limit: 30, windowSeconds: 15 * 60 }, async (user) => {
    const permission = canPublish(user)
    if (!permission.ok) return fail(permission.code, 403)

    const { id } = await params
    const parsed = await readBody(request, patchSchema)
    if (!parsed.ok) return parsed.response

    const payload = await getPayloadClient()
    const topic = await payload
      .findByID({ collection: 'forumTopics', id, depth: 0, overrideAccess: true })
      .catch(() => null)
    if (!topic || topic.status !== 'published') return notFound()

    // Seul l'auteur modifie sa discussion. Le personnel modere mais ne
    // reecrit pas les propos d'autrui.
    if (String(topic.author) !== user.id) return notFound()
    if (topic.locked) return fail('locked', 403, 'Cette discussion est verrouillee.')

    const data: Record<string, unknown> = {}
    if (parsed.data.title !== undefined) data.title = parsed.data.title
    if (parsed.data.body !== undefined) data.body = parsed.data.body
    if (parsed.data.resolved !== undefined) data.resolved = parsed.data.resolved
    if (parsed.data.title !== undefined || parsed.data.body !== undefined) {
      data.editedAt = new Date().toISOString()
    }

    if (Object.keys(data).length === 0) return ok({ id })

    const updated = await payload.update({
      collection: 'forumTopics',
      id,
      data,
      overrideAccess: true,
      context: { disableRevalidate: true },
    })

    return ok({ id: updated.id, resolved: updated.resolved })
  })

export const DELETE = async (request: Request, { params }: Params): Promise<NextResponse> =>
  withUser(request, { scope: 'forum:topic:delete', limit: 10, windowSeconds: 60 * 60 }, async (user) => {
    const { id } = await params
    const payload = await getPayloadClient()

    const topic = await payload
      .findByID({ collection: 'forumTopics', id, depth: 0, overrideAccess: true })
      .catch(() => null)
    if (!topic) return notFound()

    const isOwner = String(topic.author) === user.id
    const isStaff = isStaffRole(user.role)
    if (!isOwner && !isStaff) return notFound()

    // Une discussion avec des reponses est masquee plutot que supprimee :
    // effacer le fil ferait disparaitre les contributions des autres.
    if ((topic.replyCount ?? 0) > 0) {
      await payload.update({
        collection: 'forumTopics',
        id,
        data: { status: 'archived' },
        overrideAccess: true,
        context: { disableRevalidate: true },
      })
      if (isStaff && !isOwner) {
        await recordAudit({
          action: 'forum.topic_moderated',
          actor: user,
          targetCollection: 'forumTopics',
          targetId: id,
          targetLabel: topic.title,
          summary: 'Archivage : la discussion portait des reponses.',
        })
      }
      return ok({ archived: true })
    }

    await payload.delete({
      collection: 'forumTopics',
      id,
      overrideAccess: true,
      context: { disableRevalidate: true },
    })
    return ok({ deleted: true })
  })
