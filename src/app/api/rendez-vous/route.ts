import { NextResponse } from 'next/server'
import { z } from 'zod'

import { getAvailableSlots, loadMeetingType } from '@/lib/booking/availability'
import { sendAppointmentEmail } from '@/lib/booking/notify'
import { notify } from '@/lib/server/notify'
import { fail, ok, readBody, withUser } from '@/lib/server/api'
import { cleanText } from '@/lib/sanitize'
import { getPayloadClient } from '@/lib/payload'

/**
 * Réservation d'un rendez-vous.
 *
 * Trois barrières, dans cet ordre :
 *  1. le créneau demandé doit figurer parmi ceux réellement offerts — calculés
 *     ici, jamais fournis par le navigateur ;
 *  2. l'écriture porte une `slotKey` dérivée de l'hôte et de l'instant ;
 *  3. l'index unique partiel en base tranche les collisions simultanées.
 *
 * Seule la troisième est infaillible sous concurrence : sans transactions, deux
 * requêtes parallèles franchissent toutes deux la première. La première
 * barrière sert à donner un message clair dans le cas courant.
 */

const bookingSchema = z.object({
  meetingType: z.string().min(1).max(64),
  // Instant ISO en UTC, tel que renvoyé par la route des créneaux.
  startAt: z.string().datetime(),
  timezone: z.string().min(1).max(64),
  objective: z.string().min(10).max(2000),
  quoteRequest: z.string().max(64).optional(),
  project: z.string().max(64).optional(),
})

export const POST = async (request: Request): Promise<NextResponse> =>
  withUser(request, { scope: 'booking', limit: 10, windowSeconds: 3600 }, async (user) => {
    const body = await readBody(request, bookingSchema)
    if (!body.ok) return body.response

    const input = body.data

    const meetingType = await loadMeetingType(input.meetingType)
    if (!meetingType) return fail('not_found', 404, 'Type de rencontre introuvable.')

    const startAt = new Date(input.startAt)
    if (Number.isNaN(startAt.getTime())) return fail('invalid', 400, 'Créneau invalide.')

    // Barrière 1 — le créneau doit être réellement offert.
    const offered = await getAvailableSlots(meetingType)
    const match = offered.find((slot) => slot.startAt.getTime() === startAt.getTime())
    if (!match) {
      return fail('slot_unavailable', 409, 'Ce créneau n’est plus disponible.')
    }

    const payload = await getPayloadClient()

    // Le fuseau est validé : une valeur fantaisiste fausserait tous les
    // affichages ultérieurs.
    let timezone = input.timezone
    try {
      new Intl.DateTimeFormat('fr-CA', { timeZone: timezone })
    } catch {
      timezone = 'America/Toronto'
    }

    let appointment
    try {
      appointment = await payload.create({
        collection: 'appointments',
        data: {
          customer: user.id,
          host: meetingType.hostId,
          meetingType: meetingType.id,
          // Un type exigeant confirmation reste « demandé » : jamais confirmé
          // automatiquement au nom de l'hôte.
          status: meetingType.requiresConfirmation ? 'requested' : 'confirmed',
          startAt: match.startAt.toISOString(),
          endAt: match.endAt.toISOString(),
          customerTimezone: timezone,
          objective: cleanText(input.objective, 2000),
          links: {
            quoteRequest: input.quoteRequest || undefined,
            project: input.project || undefined,
          },
        },
        overrideAccess: true,
        context: { disableRevalidate: true },
      })
    } catch (error) {
      // Barrière 3 — collision tranchée par l'index unique partiel.
      const message = String((error as Error)?.message ?? '').toLowerCase()
      const code = (error as { code?: number })?.code
      if (code === 11000 || message.includes('duplicate') || message.includes('slotkey')) {
        return fail('slot_taken', 409, 'Ce créneau vient d’être réservé par quelqu’un d’autre.')
      }
      throw error
    }

    // Effets de bord — aucun ne peut faire échouer la réservation.
    const emailResult = await sendAppointmentEmail({
      appointmentId: String(appointment.id),
      reference: String(appointment.reference ?? appointment.id),
      kind: meetingType.requiresConfirmation ? 'created' : 'confirmed',
      to: user.email,
      recipientName: user.name,
      title: meetingType.title,
      startAt: match.startAt,
      endAt: match.endAt,
      timezone,
      objective: input.objective,
    })

    await notify({
      recipient: meetingType.hostId,
      type: 'appointment_confirmed',
      title: 'Nouvelle demande de rendez-vous',
      body: `${user.name ?? user.email} — ${meetingType.title}`,
      link: `/admin/rendez-vous/${appointment.id}`,
    })

    return ok(
      {
        id: String(appointment.id),
        reference: appointment.reference,
        status: appointment.status,
        startAt: match.startAt.toISOString(),
        endAt: match.endAt.toISOString(),
        // Le résultat réel de l'envoi remonte à l'interface : elle doit
        // pouvoir dire « rendez-vous enregistré, mais courriel non envoyé ».
        email: emailResult.status,
      },
      201,
    )
  })
