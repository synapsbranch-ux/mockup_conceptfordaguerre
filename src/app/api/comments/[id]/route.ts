import { NextResponse } from 'next/server'

import { canPublish, updateCommentSchema } from '@/lib/server/community'
import { getPayloadClient } from '@/lib/payload'
import { fail, notFound, ok, readBody, withUser } from '@/lib/server/api'
import { isStaffRole } from '@/lib/auth/roles'
import { recordAudit } from '@/lib/server/audit'

type Params = { params: Promise<{ id: string }> }

/**
 * Modification et suppression d'un commentaire.
 *
 * La propriété est vérifiée à chaque appel, contre l'auteur enregistré en base
 * et non contre une valeur transmise. Un commentaire appartenant à quelqu'un
 * d'autre remonte en 404 : l'existence d'un contenu qu'on n'a pas le droit de
 * toucher n'est pas divulguée.
 */

export const PATCH = async (request: Request, { params }: Params): Promise<NextResponse> =>
  withUser(request, { scope: 'comment:update', limit: 20, windowSeconds: 10 * 60 }, async (user) => {
    const permission = canPublish(user)
    if (!permission.ok) return fail(permission.code, 403)

    const { id } = await params
    const parsed = await readBody(request, updateCommentSchema)
    if (!parsed.ok) return parsed.response

    const payload = await getPayloadClient()

    const existing = await payload
      .findByID({ collection: 'articleComments', id, depth: 0, overrideAccess: true })
      .catch(() => null)

    if (!existing) return notFound()
    // Seul l'auteur modifie son propre commentaire. Le personnel modère mais
    // ne réécrit pas les propos d'autrui.
    if (String(existing.author) !== user.id) return notFound()
    if (existing.status === 'spam' || existing.status === 'hidden') {
      return fail('moderated', 403, 'Ce commentaire a été modéré et n’est plus modifiable.')
    }

    const updated = await payload.update({
      collection: 'articleComments',
      id,
      data: { body: parsed.data.body, editedAt: new Date().toISOString() },
      overrideAccess: true,
      context: { disableRevalidate: true },
    })

    return ok({ id: updated.id, editedAt: updated.editedAt })
  })

export const DELETE = async (request: Request, { params }: Params): Promise<NextResponse> =>
  withUser(request, { scope: 'comment:delete', limit: 20, windowSeconds: 10 * 60 }, async (user) => {
    const { id } = await params
    const payload = await getPayloadClient()

    const existing = await payload
      .findByID({ collection: 'articleComments', id, depth: 0, overrideAccess: true })
      .catch(() => null)

    if (!existing) return notFound()

    const isOwner = String(existing.author) === user.id
    const isStaff = isStaffRole(user.role)
    if (!isOwner && !isStaff) return notFound()

    await payload.delete({
      collection: 'articleComments',
      id,
      overrideAccess: true,
      context: { disableRevalidate: true },
    })

    if (isStaff && !isOwner) {
      await recordAudit({
        action: 'comment.deleted',
        actor: user,
        targetCollection: 'articleComments',
        targetId: id,
        targetLabel: existing.excerpt ?? undefined,
        summary: 'Suppression definitive par la moderation.',
      })
    }

    return ok({ deleted: true })
  })
