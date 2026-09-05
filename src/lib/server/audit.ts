import 'server-only'

import { getPayloadClient } from '@/lib/payload'
import type { SessionUser } from '@/lib/auth/dal'

/**
 * Journalisation des actions sensibles.
 *
 * Comme les notifications, c'est un effet de bord : un échec d'écriture ne doit
 * jamais faire échouer l'action elle-même. En revanche il est journalisé côté
 * serveur, car un journal d'audit muet est un problème en soi.
 *
 * Aucun secret, aucune adresse IP, aucun corps de message n'est consigné :
 * seulement qui a fait quoi, sur quoi, et quand.
 */

export type AuditAction =
  | 'user.role_changed'
  | 'user.suspended'
  | 'user.reinstated'
  | 'user.forum_banned'
  | 'user.forum_unbanned'
  | 'comment.moderated'
  | 'comment.deleted'
  | 'forum.topic_moderated'
  | 'forum.reply_moderated'
  | 'forum.report_resolved'
  | 'document.uploaded'
  | 'document.deleted'
  | 'quote.updated'
  | 'proposal.sent'
  | 'invoice.issued'
  | 'invoice.cancelled'
  | 'appointment.confirmed'
  | 'appointment.cancelled'

export type AuditInput = {
  action: AuditAction
  actor: SessionUser | null
  targetCollection?: string
  targetId?: string
  targetLabel?: string
  summary?: string
}

export const recordAudit = async (input: AuditInput): Promise<boolean> => {
  try {
    const payload = await getPayloadClient()
    await payload.create({
      collection: 'auditLog',
      data: {
        action: input.action,
        actor: input.actor?.id,
        // L'adresse est recopiée : l'entrée reste lisible si le compte disparaît.
        actorEmail: input.actor?.email,
        targetCollection: input.targetCollection,
        targetId: input.targetId,
        targetLabel: input.targetLabel?.slice(0, 240),
        summary: input.summary?.slice(0, 600),
      },
      overrideAccess: true,
      context: { disableRevalidate: true },
    })
    return true
  } catch (error) {
    console.error('[audit]', error)
    return false
  }
}
