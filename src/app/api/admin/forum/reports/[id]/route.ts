import { NextResponse } from 'next/server'

import { z } from 'zod'

import { getPayloadClient } from '@/lib/payload'
import { notFound, ok, readBody, withStaff } from '@/lib/server/api'
import { recordAudit } from '@/lib/server/audit'
import { notify } from '@/lib/server/notify'

type Params = { params: Promise<{ id: string }> }

/**
 * Traitement d'un signalement.
 *
 * Deux decisions distinctes : la suite donnee au signalement (retenu / ecarte)
 * et, le cas echeant, la sanction appliquee au contenu vise. Les deux sont
 * journalisees, et l'auteur du contenu retire est prevenu.
 */
const schema = z.object({
  status: z.enum(['upheld', 'dismissed']),
  // Sanction facultative appliquee a la cible lorsque le signalement est retenu.
  hideTarget: z.boolean().optional(),
  moderatorNote: z.string().trim().max(1000).optional(),
})

export const PATCH = async (request: Request, { params }: Params): Promise<NextResponse> =>
  withStaff(request, { scope: 'forum:report', limit: 120, windowSeconds: 60 * 60 }, async (user) => {
    const { id } = await params
    const parsed = await readBody(request, schema)
    if (!parsed.ok) return parsed.response

    const payload = await getPayloadClient()
    const report = await payload
      .findByID({ collection: 'forumReports', id, depth: 0, overrideAccess: true })
      .catch(() => null)
    if (!report) return notFound()

    await payload.update({
      collection: 'forumReports',
      id,
      data: {
        status: parsed.data.status,
        resolvedBy: user.id,
        moderatorNote: parsed.data.moderatorNote,
      },
      overrideAccess: true,
      context: { disableRevalidate: true },
    })

    // Sanction du contenu vise, si demandee.
    if (parsed.data.status === 'upheld' && parsed.data.hideTarget) {
      const collection =
        report.targetType === 'comment'
          ? 'articleComments'
          : report.targetType === 'topic'
            ? 'forumTopics'
            : 'forumReplies'

      const target = await payload
        .findByID({ collection, id: String(report.targetId), depth: 0, overrideAccess: true })
        .catch(() => null)

      if (target) {
        await payload
          .update({
            collection,
            id: String(report.targetId),
            data: { status: 'hidden' },
            overrideAccess: true,
            context: { disableRevalidate: true },
          })
          .catch(() => null)

        const author = (target as { author?: unknown }).author
        const authorId = author
          ? String(typeof author === 'object' ? (author as { id?: string }).id : author)
          : null

        if (authorId) {
          await notify({
            recipient: authorId,
            type: 'moderation',
            title: 'Un de vos contenus a ete retire',
            body: 'Un contenu que vous aviez publie n’est plus visible publiquement.',
          })
        }

        await recordAudit({
          action:
            report.targetType === 'comment'
              ? 'comment.moderated'
              : report.targetType === 'topic'
                ? 'forum.topic_moderated'
                : 'forum.reply_moderated',
          actor: user,
          targetCollection: collection,
          targetId: String(report.targetId),
          targetLabel: report.targetExcerpt ?? undefined,
          summary: 'Masque a la suite d’un signalement retenu.',
        })
      }
    }

    await recordAudit({
      action: 'forum.report_resolved',
      actor: user,
      targetCollection: 'forumReports',
      targetId: id,
      targetLabel: report.targetExcerpt ?? undefined,
      summary: `Signalement ${parsed.data.status === 'upheld' ? 'retenu' : 'ecarte'}.`,
    })

    return ok({ id, status: parsed.data.status })
  })
