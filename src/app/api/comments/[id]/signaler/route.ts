import { NextResponse } from 'next/server'

import { reportSchema } from '@/lib/server/community'
import { getPayloadClient } from '@/lib/payload'
import { fail, notFound, ok, readBody, withUser } from '@/lib/server/api'

type Params = { params: Promise<{ id: string }> }

/**
 * Signalement d'un commentaire.
 *
 * L'unicite (auteur, cible) est imposee par un index compose : un meme compte
 * ne peut pas signaler deux fois le meme contenu, ce qui evite le harcelement
 * par signalements repetes. La collision est traduite en reponse neutre plutot
 * qu'en erreur, pour ne rien apprendre a l'appelant sur l'etat de la file.
 */
export const POST = async (request: Request, { params }: Params): Promise<NextResponse> =>
  withUser(request, { scope: 'comment:report', limit: 10, windowSeconds: 60 * 60 }, async (user) => {
    if (user.suspended) return fail('suspended', 403)

    const { id } = await params
    const parsed = await readBody(request, reportSchema)
    if (!parsed.ok) return parsed.response

    const payload = await getPayloadClient()

    const comment = await payload
      .findByID({ collection: 'articleComments', id, depth: 0, overrideAccess: true })
      .catch(() => null)
    if (!comment || comment.status !== 'published') return notFound()

    try {
      await payload.create({
        collection: 'forumReports',
        data: {
          reporter: user.id,
          targetType: 'comment',
          targetId: id,
          // L'extrait est fige : le signalement reste lisible meme si l'auteur
          // modifie ensuite son message.
          targetExcerpt: comment.excerpt ?? undefined,
          reason: parsed.data.reason,
          detail: parsed.data.detail,
          status: 'open',
        },
        overrideAccess: true,
        context: { disableRevalidate: true },
      })
    } catch {
      // Doublon : on repond comme un succes, sans creer de seconde ligne.
      return ok({ reported: true, alreadyReported: true })
    }

    // Le compteur sert a prioriser la file de moderation.
    await payload
      .update({
        collection: 'articleComments',
        id,
        data: { reportCount: (comment.reportCount ?? 0) + 1 },
        overrideAccess: true,
        context: { disableRevalidate: true },
      })
      .catch(() => null)

    return ok({ reported: true })
  })
