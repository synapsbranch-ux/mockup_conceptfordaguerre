import { NextResponse } from 'next/server'
import { z } from 'zod'

import { normalizeRole } from '@/lib/auth/roles'
import type { Role } from '@/lib/auth/roles'
import { getPayloadClient } from '@/lib/payload'
import { canAssignRole, canChangeRole, canSuspend } from '@/lib/server/adminGuard'
import { fail, notFound, ok, readBody, withStaff } from '@/lib/server/api'
import { recordAudit } from '@/lib/server/audit'
import { notify } from '@/lib/server/notify'

/**
 * Actions d'administration sur un compte.
 *
 * Chaque action repasse par `adminGuard`, qui garantit deux choses que
 * l'interface seule ne peut pas tenir : le site conserve toujours un
 * administrateur actif, et personne ne modifie son propre rôle ni son propre
 * statut.
 *
 * Toutes les actions sont journalisées : ce sont précisément celles qu'il faut
 * pouvoir reconstituer après coup.
 */

const actionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('setRole'), role: z.enum(['customer', 'editor', 'super-admin']) }),
  z.object({ action: z.literal('suspend'), reason: z.string().max(500).optional() }),
  z.object({ action: z.literal('reinstate') }),
  z.object({ action: z.literal('banForum') }),
  z.object({ action: z.literal('unbanForum') }),
])

export const PATCH = async (
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> =>
  withStaff(request, { scope: 'admin-user', limit: 60, windowSeconds: 3600 }, async (actor) => {
    const { id } = await params

    const body = await readBody(request, actionSchema)
    if (!body.ok) return body.response

    const payload = await getPayloadClient()

    const target = await payload
      .findByID({ collection: 'users', id, depth: 0, overrideAccess: true })
      .catch(() => null)

    if (!target) return notFound()

    const currentRole = normalizeRole(target.role)
    const actorRole = normalizeRole(actor.role)

    switch (body.data.action) {
      case 'setRole': {
        const nextRole = body.data.role as Role

        // Un éditeur ne peut pas fabriquer un super-administrateur.
        const assignable = canAssignRole(actorRole, nextRole)
        if (!assignable.ok) return fail('forbidden', 403, assignable.reason)

        const allowed = await canChangeRole({
          actorId: actor.id,
          targetId: id,
          currentRole,
          nextRole,
        })
        if (!allowed.ok) return fail('forbidden', 409, allowed.reason)

        await payload.update({
          collection: 'users',
          id,
          data: { role: nextRole },
          overrideAccess: true,
          context: { disableRevalidate: true },
        })

        await recordAudit({
          action: 'user.role_changed',
          actor,
          targetCollection: 'users',
          targetId: id,
          targetLabel: target.email,
          summary: `Rôle « ${currentRole} » → « ${nextRole} ».`,
        })

        return ok({ role: nextRole })
      }

      case 'suspend': {
        const allowed = await canSuspend({ actorId: actor.id, targetId: id, currentRole })
        if (!allowed.ok) return fail('forbidden', 409, allowed.reason)

        await payload.update({
          collection: 'users',
          id,
          data: { suspended: true },
          overrideAccess: true,
          context: { disableRevalidate: true },
        })

        await recordAudit({
          action: 'user.suspended',
          actor,
          targetCollection: 'users',
          targetId: id,
          targetLabel: target.email,
          summary: body.data.reason ?? 'Suspension du compte.',
        })

        return ok({ suspended: true })
      }

      case 'reinstate': {
        await payload.update({
          collection: 'users',
          id,
          data: { suspended: false },
          overrideAccess: true,
          context: { disableRevalidate: true },
        })

        await recordAudit({
          action: 'user.reinstated',
          actor,
          targetCollection: 'users',
          targetId: id,
          targetLabel: target.email,
          summary: 'Réactivation du compte.',
        })

        await notify({
          recipient: id,
          type: 'moderation',
          title: 'Votre compte est réactivé',
          body: 'Vous avez de nouveau accès à votre espace.',
          link: '/espace-client',
        })

        return ok({ suspended: false })
      }

      case 'banForum':
      case 'unbanForum': {
        const banned = body.data.action === 'banForum'

        await payload.update({
          collection: 'users',
          id,
          data: { forumBanned: banned },
          overrideAccess: true,
          context: { disableRevalidate: true },
        })

        await recordAudit({
          action: banned ? 'user.forum_banned' : 'user.forum_unbanned',
          actor,
          targetCollection: 'users',
          targetId: id,
          targetLabel: target.email,
          summary: banned
            ? 'Publication dans la communauté suspendue.'
            : 'Publication dans la communauté rétablie.',
        })

        await notify({
          recipient: id,
          type: 'moderation',
          title: banned
            ? 'Votre droit de publication est suspendu'
            : 'Votre droit de publication est rétabli',
          body: banned
            ? 'Vous pouvez toujours lire le forum et les commentaires.'
            : 'Vous pouvez de nouveau publier dans la communauté.',
          link: '/forum',
        })

        return ok({ forumBanned: banned })
      }
    }
  })
