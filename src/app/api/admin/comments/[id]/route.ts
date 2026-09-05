import { NextResponse } from 'next/server'

import { moderateCommentSchema } from '@/lib/server/community'
import { getPayloadClient } from '@/lib/payload'
import { notFound, ok, readBody, withStaff } from '@/lib/server/api'
import { recordAudit } from '@/lib/server/audit'
import { notify } from '@/lib/server/notify'

type Params = { params: Promise<{ id: string }> }

/**
 * Moderation d'un commentaire : publier, masquer, restaurer, marquer indesirable.
 *
 * Reserve au personnel, verifie ici et non par l'absence de bouton. Chaque
 * action est journalisee, et l'auteur est prevenu lorsque son contenu est
 * retire — une moderation silencieuse est incomprehensible pour qui la subit.
 */
export const PATCH = async (request: Request, { params }: Params): Promise<NextResponse> =>
  withStaff(request, { scope: 'comment:moderate', limit: 120, windowSeconds: 60 * 60 }, async (user) => {
    const { id } = await params
    const parsed = await readBody(request, moderateCommentSchema)
    if (!parsed.ok) return parsed.response

    const payload = await getPayloadClient()

    const existing = await payload
      .findByID({ collection: 'articleComments', id, depth: 0, overrideAccess: true })
      .catch(() => null)
    if (!existing) return notFound()

    const previous = existing.status
    const next = parsed.data.status

    const updated = await payload.update({
      collection: 'articleComments',
      id,
      data: { status: next, moderatedBy: user.id },
      overrideAccess: true,
      context: { disableRevalidate: true },
    })

    await recordAudit({
      action: 'comment.moderated',
      actor: user,
      targetCollection: 'articleComments',
      targetId: id,
      targetLabel: existing.excerpt ?? undefined,
      summary: `Statut : ${previous} vers ${next}.`,
    })

    // Prevenir l'auteur d'un retrait, ou d'une publication apres attente.
    const author = existing.author ? String(existing.author) : null
    if (author && author !== user.id && previous !== next) {
      if (next === 'hidden' || next === 'spam') {
        await notify({
          recipient: author,
          type: 'moderation',
          title: 'Votre commentaire a ete retire',
          body: 'Un commentaire que vous aviez publie n’est plus visible publiquement.',
        })
      } else if (previous === 'pending' && next === 'published') {
        await notify({
          recipient: author,
          type: 'moderation',
          title: 'Votre commentaire est publie',
          body: 'Votre commentaire a ete approuve et est maintenant visible.',
        })
      }
    }

    return ok({ id: updated.id, status: next })
  })
