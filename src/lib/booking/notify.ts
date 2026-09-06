import 'server-only'

import { buildCalendarEvent, calendarFilename } from '@/lib/email/ics'
import { sendEmail } from '@/lib/email/send'
import type { EmailResult } from '@/lib/email/send'
import { env } from '@/lib/env'
import { getPayloadClient } from '@/lib/payload'

/**
 * Courriels de rendez-vous : confirmation, report, annulation.
 *
 * Le résultat réel de l'envoi est **consigné sur le rendez-vous**
 * (`notificationState`). L'interface d'administration l'affiche tel quel : si
 * Resend n'est pas configuré ou renvoie une erreur, on le dit, plutôt que de
 * laisser croire que le client a été prévenu.
 */

type Kind = 'created' | 'confirmed' | 'rescheduled' | 'cancelled'

export type AppointmentEmailInput = {
  appointmentId: string
  reference: string
  kind: Kind
  to: string
  recipientName?: string | null
  title: string
  startAt: Date
  endAt: Date
  timezone: string
  meetingUrl?: string | null
  objective?: string | null
  previousStartAt?: Date | null
  cancellationReason?: string | null
}

const formatInZone = (date: Date, timezone: string): string => {
  try {
    return new Intl.DateTimeFormat('fr-CA', {
      timeZone: timezone,
      dateStyle: 'full',
      timeStyle: 'short',
    }).format(date)
  } catch {
    return date.toISOString()
  }
}

const SUBJECTS: Record<Kind, (title: string) => string> = {
  created: (title) => `Demande de rendez-vous reçue — ${title}`,
  confirmed: (title) => `Rendez-vous confirmé — ${title}`,
  rescheduled: (title) => `Rendez-vous reporté — ${title}`,
  cancelled: (title) => `Rendez-vous annulé — ${title}`,
}

const buildBody = (input: AppointmentEmailInput): string => {
  const when = formatInZone(input.startAt, input.timezone)
  const greeting = input.recipientName ? `Bonjour ${input.recipientName},` : 'Bonjour,'

  const lines: string[] = [greeting, '']

  switch (input.kind) {
    case 'created':
      lines.push(
        `Votre demande de rendez-vous « ${input.title} » a bien été reçue.`,
        `Créneau demandé : ${when} (${input.timezone}).`,
        '',
        'Elle sera confirmée sous peu. Vous recevrez alors une confirmation.',
      )
      break
    case 'confirmed':
      lines.push(
        `Votre rendez-vous « ${input.title} » est confirmé.`,
        `Date : ${when} (${input.timezone}).`,
      )
      break
    case 'rescheduled':
      lines.push(
        `Votre rendez-vous « ${input.title} » a été reporté.`,
        input.previousStartAt
          ? `Ancienne date : ${formatInZone(input.previousStartAt, input.timezone)}.`
          : '',
        `Nouvelle date : ${when} (${input.timezone}).`,
      )
      break
    case 'cancelled':
      lines.push(
        `Votre rendez-vous « ${input.title} » du ${when} a été annulé.`,
        input.cancellationReason ? `Motif : ${input.cancellationReason}` : '',
      )
      break
  }

  if (input.kind !== 'cancelled' && input.meetingUrl) {
    lines.push('', `Lien de la rencontre : ${input.meetingUrl}`)
  }

  if (input.objective) lines.push('', `Objet indiqué : ${input.objective}`)

  lines.push('', `Référence : ${input.reference}`, '', 'Jacques-Daguerre Valcy')

  return lines.filter((line) => line !== '').join('\n')
}

/**
 * Envoie le courriel puis consigne le résultat réel sur le rendez-vous.
 * Ne lève jamais : l'action métier a déjà réussi.
 */
export const sendAppointmentEmail = async (
  input: AppointmentEmailInput,
): Promise<EmailResult> => {
  let result: EmailResult

  try {
    // L'invitation calendrier accompagne tout sauf l'annulation, où elle
    // porte le statut CANCELLED pour retirer l'événement de l'agenda.
    const calendar = buildCalendarEvent({
      uid: `${input.reference}@${new URL(env.serverURL).hostname}`,
      title: input.title,
      description: input.objective ?? undefined,
      location: input.meetingUrl ?? undefined,
      startAt: input.startAt,
      endAt: input.endAt,
      url: input.meetingUrl ?? undefined,
      // Le report doit remplacer l'événement précédent chez le destinataire.
      sequence: input.kind === 'rescheduled' ? 1 : 0,
      status: input.kind === 'cancelled' ? 'CANCELLED' : 'CONFIRMED',
    })

    result = await sendEmail({
      to: input.to,
      subject: SUBJECTS[input.kind](input.title),
      text: buildBody(input),
      attachments: [
        {
          filename: calendarFilename(input.reference),
          content: calendar,
          contentType: 'text/calendar; charset=utf-8; method=REQUEST',
        },
      ],
    })
  } catch (error) {
    result = { status: 'failed', error: String((error as Error)?.message ?? error).slice(0, 300) }
  }

  try {
    const payload = await getPayloadClient()
    await payload.update({
      collection: 'appointments',
      id: input.appointmentId,
      data: {
        notificationState: {
          lastAttemptAt: new Date().toISOString(),
          lastResult: result.status,
          lastError: result.status === 'failed' ? result.error : undefined,
        },
      },
      overrideAccess: true,
      context: { disableRevalidate: true },
    })
  } catch (error) {
    // Consigner l'état ne doit pas non plus casser le flux.
    console.error('[booking:notify] impossible de consigner l’état d’envoi', error)
  }

  return result
}
