import 'server-only'

import { getPayloadClient } from '@/lib/payload'

/**
 * Création de notifications.
 *
 * Toujours appelée côté serveur, avec `overrideAccess` : le destinataire, le
 * type et le lien viennent de la logique métier, jamais d'une requête.
 *
 * Une notification est un effet de bord : son échec ne doit jamais faire
 * échouer l'action qui l'a déclenchée. Publier un commentaire doit réussir même
 * si la notification de réponse ne part pas.
 */

export type NotificationType =
  | 'message'
  | 'proposal'
  | 'proposal_decision'
  | 'quote_status'
  | 'document'
  | 'invoice'
  | 'invoice_overdue'
  | 'project_update'
  | 'appointment_confirmed'
  | 'appointment_rescheduled'
  | 'appointment_cancelled'
  | 'comment_reply'
  | 'forum_reply'
  | 'moderation'

export type NotifyInput = {
  recipient: string
  type: NotificationType
  title: string
  body?: string
  /** Chemin interne uniquement. Une valeur externe est refusée par la collection. */
  link?: string
}

/** Crée une notification. Ne lève jamais. */
export const notify = async (input: NotifyInput): Promise<boolean> => {
  try {
    const payload = await getPayloadClient()
    await payload.create({
      collection: 'notifications',
      data: {
        recipient: input.recipient,
        type: input.type,
        title: input.title.slice(0, 200),
        body: input.body?.slice(0, 600),
        link: input.link,
        read: false,
      },
      overrideAccess: true,
      context: { disableRevalidate: true },
    })
    return true
  } catch (error) {
    console.error('[notify]', error)
    return false
  }
}

/**
 * Notifie plusieurs personnes, en excluant l'auteur de l'action.
 * On ne se notifie pas soi-même d'avoir répondu à sa propre discussion.
 */
export const notifyMany = async (
  recipients: string[],
  input: Omit<NotifyInput, 'recipient'>,
  exclude?: string,
): Promise<number> => {
  const unique = [...new Set(recipients)].filter((id) => id && id !== exclude)
  const results = await Promise.all(unique.map((recipient) => notify({ ...input, recipient })))
  return results.filter(Boolean).length
}
