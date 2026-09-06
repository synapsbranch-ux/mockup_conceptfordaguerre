import { NextResponse } from 'next/server'
import { z } from 'zod'

import { getAvailableSlots, loadMeetingType } from '@/lib/booking/availability'
import { sendAppointmentEmail } from '@/lib/booking/notify'
import { canTransitionAppointment } from '@/lib/commerce/transitions'
import type { AppointmentStatus } from '@/lib/commerce/transitions'
import { getPayloadClient } from '@/lib/payload'
import { fail, notFound, ok, readBody, withUser } from '@/lib/server/api'
import { recordAudit } from '@/lib/server/audit'
import { notify } from '@/lib/server/notify'
import { cleanText } from '@/lib/sanitize'

/**
 * Report et annulation d'un rendez-vous par le client.
 *
 * La propriété est vérifiée à chaque appel : un identifiant appartenant à
 * quelqu'un d'autre répond 404, pas 403 — l'existence d'un rendez-vous tiers
 * n'a pas à être confirmée.
 */

const actionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('reschedule'),
    startAt: z.string().datetime(),
  }),
  z.object({
    action: z.literal('cancel'),
    reason: z.string().max(1000).optional(),
  }),
])

export const PATCH = async (
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> =>
  withUser(request, { scope: 'booking-update', limit: 20, windowSeconds: 3600 }, async (user) => {
    const { id } = await params

    const body = await readBody(request, actionSchema)
    if (!body.ok) return body.response

    const payload = await getPayloadClient()

    const existing = await payload
      .findByID({ collection: 'appointments', id, depth: 0, overrideAccess: true })
      .catch(() => null)

    if (!existing) return notFound()

    // Vérification de propriété — jamais déduite de l'interface appelante.
    const ownerId =
      typeof existing.customer === 'object'
        ? String((existing.customer as { id: string })?.id)
        : String(existing.customer ?? '')
    if (ownerId !== user.id) return notFound()

    const current = existing.status as AppointmentStatus

    // --- Annulation ---------------------------------------------------------
    if (body.data.action === 'cancel') {
      if (!canTransitionAppointment(current, 'cancelled', 'customer')) {
        return fail('forbidden_transition', 409, 'Ce rendez-vous ne peut plus être annulé.')
      }

      const updated = await payload.update({
        collection: 'appointments',
        id,
        data: {
          status: 'cancelled',
          cancellationReason: body.data.reason ? cleanText(body.data.reason, 1000) : undefined,
        },
        overrideAccess: true,
        context: { disableRevalidate: true, actor: 'customer' },
      })

      const emailResult = await sendAppointmentEmail({
        appointmentId: id,
        reference: String(updated.reference ?? id),
        kind: 'cancelled',
        to: user.email,
        recipientName: user.name,
        title: 'Rendez-vous',
        startAt: new Date(existing.startAt as string),
        endAt: new Date(existing.endAt as string),
        timezone: (existing.customerTimezone as string) ?? 'America/Toronto',
        cancellationReason: body.data.reason,
      })

      const hostId =
        typeof existing.host === 'object'
          ? String((existing.host as { id: string })?.id)
          : String(existing.host ?? '')
      if (hostId) {
        await notify({
          recipient: hostId,
          type: 'appointment_cancelled',
          title: 'Rendez-vous annulé par le client',
          body: `${user.name ?? user.email}`,
          link: `/admin/rendez-vous/${id}`,
        })
      }

      await recordAudit({
        action: 'appointment.cancelled',
        actor: user,
        targetCollection: 'appointments',
        targetId: id,
        targetLabel: String(updated.reference ?? id),
        summary: 'Annulation par le client.',
      })

      return ok({ status: 'cancelled', email: emailResult.status })
    }

    // --- Report -------------------------------------------------------------
    if (current !== 'requested' && current !== 'confirmed') {
      return fail('forbidden_transition', 409, 'Ce rendez-vous ne peut plus être reporté.')
    }

    const meetingTypeId =
      typeof existing.meetingType === 'object'
        ? String((existing.meetingType as { id: string })?.id)
        : String(existing.meetingType ?? '')

    const meetingType = await loadMeetingType(meetingTypeId)
    if (!meetingType) return fail('not_found', 404, 'Type de rencontre introuvable.')

    const startAt = new Date(body.data.startAt)
    if (Number.isNaN(startAt.getTime())) return fail('invalid', 400, 'Créneau invalide.')

    // Le nouveau créneau est soumis aux mêmes règles que la réservation
    // initiale : rien n'est accordé au motif qu'il s'agit d'un report.
    const offered = await getAvailableSlots(meetingType)
    const match = offered.find((slot) => slot.startAt.getTime() === startAt.getTime())
    if (!match) return fail('slot_unavailable', 409, 'Ce créneau n’est plus disponible.')

    const previousStartAt = new Date(existing.startAt as string)

    let updated
    try {
      updated = await payload.update({
        collection: 'appointments',
        id,
        data: {
          startAt: match.startAt.toISOString(),
          endAt: match.endAt.toISOString(),
          rescheduledFrom: previousStartAt.toISOString(),
          // Un report repasse en « demandé » lorsque le format exige une
          // confirmation : la nouvelle date n'est pas confirmée d'office.
          status: meetingType.requiresConfirmation ? 'requested' : 'confirmed',
        },
        overrideAccess: true,
        context: { disableRevalidate: true, actor: 'customer' },
      })
    } catch (error) {
      const code = (error as { code?: number })?.code
      const message = String((error as Error)?.message ?? '').toLowerCase()
      if (code === 11000 || message.includes('duplicate') || message.includes('slotkey')) {
        return fail('slot_taken', 409, 'Ce créneau vient d’être réservé par quelqu’un d’autre.')
      }
      throw error
    }

    const emailResult = await sendAppointmentEmail({
      appointmentId: id,
      reference: String(updated.reference ?? id),
      kind: 'rescheduled',
      to: user.email,
      recipientName: user.name,
      title: meetingType.title,
      startAt: match.startAt,
      endAt: match.endAt,
      timezone: (existing.customerTimezone as string) ?? 'America/Toronto',
      previousStartAt,
    })

    return ok({
      status: updated.status,
      startAt: match.startAt.toISOString(),
      email: emailResult.status,
    })
  })
