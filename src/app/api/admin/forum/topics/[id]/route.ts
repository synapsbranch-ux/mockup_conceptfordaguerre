import { NextResponse } from 'next/server'

import { z } from 'zod'

import { getPayloadClient } from '@/lib/payload'
import { notFound, ok, readBody, withStaff } from '@/lib/server/api'
import { recordAudit } from '@/lib/server/audit'
import { notify } from '@/lib/server/notify'

type Params = { params: Promise<{ id: string }> }

/**
 * Moderation d'une discussion : epingler, verrouiller, resoudre, masquer,
 * archiver.
 *
 * Ces leviers sont **distincts** de l'edition par l'auteur, traitee ailleurs :
 * le personnel modere la visibilite et l'etat d'une discussion, il ne reecrit
 * jamais le contenu de quelqu'un d'autre.
 *
 * Un retrait previent l'auteur : une moderation silencieuse est
 * incomprehensible pour qui la subit.
 */
const schema = z.object({
  pinned: z.boolean().optional(),
  locked: z.boolean().optional(),
  resolved: z.boolean().optional(),
  status: z.enum(['published', 'hidden', 'archived']).optional(),
})

export const PATCH = async (request: Request, { params }: Params): Promise<NextResponse> =>
  withStaff(request, { scope: 'forum:moderate', limit: 120, windowSeconds: 60 * 60 }, async (user) => {
    const { id } = await params
    const parsed = await readBody(request, schema)
    if (!parsed.ok) return parsed.response

    const payload = await getPayloadClient()
    const topic = await payload
      .findByID({ collection: 'forumTopics', id, depth: 0, overrideAccess: true })
      .catch(() => null)
    if (!topic) return notFound()

    const data = Object.fromEntries(
      Object.entries(parsed.data).filter(([, value]) => value !== undefined),
    )
    if (Object.keys(data).length === 0) return ok({ id })

    const updated = await payload.update({
      collection: 'forumTopics',
      id,
      data,
      overrideAccess: true,
      context: { disableRevalidate: true },
    })

    const changes = Object.entries(data)
      .map(([key, value]) => `${key}=${String(value)}`)
      .join(', ')

    await recordAudit({
      action: 'forum.topic_moderated',
      actor: user,
      targetCollection: 'forumTopics',
      targetId: id,
      targetLabel: topic.title,
      summary: changes,
    })

    // Prevenir l'auteur d'un retrait.
    const author = topic.author ? String(topic.author) : null
    const removed = data.status === 'hidden' || data.status === 'archived'
    if (author && author !== user.id && removed) {
      await notify({
        recipient: author,
        type: 'moderation',
        title: 'Votre discussion a ete retiree',
        body: `« ${topic.title} » n’est plus visible publiquement.`,
      })
    }

    return ok({ id: updated.id })
  })
