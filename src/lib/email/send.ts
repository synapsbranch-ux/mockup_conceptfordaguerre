import 'server-only'

import { env } from '@/lib/env'

/**
 * Envoi de courriels transactionnels via Resend.
 *
 * Principe directeur : **ne jamais prétendre qu'un courriel est parti**.
 * Chaque envoi retourne un résultat explicite, que l'appelant consigne et
 * affiche tel quel. Une clé absente donne `not_configured`, une erreur du
 * fournisseur donne `failed` — jamais un succès silencieux.
 *
 * L'échec d'un courriel ne doit pas annuler l'action métier : un rendez-vous
 * réservé reste réservé même si la confirmation ne part pas. L'interface
 * indique alors que la notification n'a pas pu être envoyée.
 */

export type EmailResult =
  | { status: 'sent'; id?: string }
  | { status: 'failed'; error: string }
  | { status: 'not_configured' }

export type Attachment = {
  filename: string
  /** Contenu brut du fichier. */
  content: string
  contentType?: string
}

export type EmailInput = {
  to: string | string[]
  subject: string
  /** Corps en texte brut. Toujours fourni : certains clients n'affichent que lui. */
  text: string
  /** Corps HTML optionnel. Le contenu doit déjà être échappé par l'appelant. */
  html?: string
  attachments?: Attachment[]
  replyTo?: string
}

/** `true` si un envoi est possible. Permet à l'interface de le dire d'avance. */
export const isEmailConfigured = (): boolean => env.resend !== null

export const sendEmail = async (input: EmailInput): Promise<EmailResult> => {
  if (!env.resend) {
    // Cas parfaitement normal en développement : on le signale sans bruit.
    console.warn('[email] RESEND_API_KEY absente — courriel non envoyé :', input.subject)
    return { status: 'not_configured' }
  }

  try {
    const { Resend } = await import('resend')
    const client = new Resend(env.resend.apiKey)

    const { data, error } = await client.emails.send({
      from: env.resend.from,
      to: Array.isArray(input.to) ? input.to : [input.to],
      subject: input.subject,
      text: input.text,
      ...(input.html ? { html: input.html } : {}),
      ...(input.replyTo ?? env.resend.replyTo
        ? { replyTo: input.replyTo ?? env.resend.replyTo }
        : {}),
      ...(input.attachments?.length
        ? {
            attachments: input.attachments.map((attachment) => ({
              filename: attachment.filename,
              content: Buffer.from(attachment.content).toString('base64'),
              ...(attachment.contentType ? { contentType: attachment.contentType } : {}),
            })),
          }
        : {}),
    })

    if (error) {
      // Le message du fournisseur est conservé côté serveur, tronqué avant
      // d'être stocké : il ne doit pas devenir un vecteur d'information.
      console.error('[email] échec Resend :', error)
      return { status: 'failed', error: String(error.message ?? error).slice(0, 300) }
    }

    return { status: 'sent', id: data?.id }
  } catch (error) {
    console.error('[email] exception :', error)
    return { status: 'failed', error: String((error as Error)?.message ?? error).slice(0, 300) }
  }
}

/** Formule lisible par une personne, pour l'interface d'administration. */
export const describeEmailResult = (result: EmailResult): string => {
  switch (result.status) {
    case 'sent':
      return 'Courriel envoyé.'
    case 'not_configured':
      return 'Courriel non envoyé : l’envoi de courriels n’est pas configuré sur ce site.'
    case 'failed':
      return `Courriel non envoyé : ${result.error}`
  }
}
