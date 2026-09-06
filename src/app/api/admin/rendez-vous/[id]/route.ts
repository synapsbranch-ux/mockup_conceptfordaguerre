import { NextResponse } from 'next/server'
import { z } from 'zod'

import { sendAppointmentEmail } from '@/lib/booking/notify'
import { canTransitionAppointment } from '@/lib/commerce/transitions'
import type { AppointmentStatus } from '@/lib/commerce/transitions'
import { getPayloadClient } from '@/lib/payload'
import { fail, notFound, ok, readBody, withStaff } from '@/lib/server/api'
import { recordAudit } from '@/lib/server/audit'
import { notify } from '@/lib/server/notify'

/**
 * Actions d'équipe sur un rendez-vous.
 *
 * La transition passe par la même table que côté client, mais avec l'acteur
 * `staff` : confirmer et constater une absence lui sont réservés.
 */
const actionSchema = z.object({
  status: z.enum(['confirmed', 'completed', 'cancelled', 'no_show']),
  meetingUrl: z.string().url().startsWith('https://').max(500).optional(),
})

export const PATCH = async (
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> =>
  withStaff(request, { scope: 'admin-appointment', limit: 100, windowSeconds: 3600 }, async (actor) => {
    const { id } = await params

    const body = await readBody(request, actionSchema)
    if (!body.ok) return body.response

    const payload = await getPayloadClient()

    const appointment = await payload
      .findByID({ collection: 'appointments', id, depth: 1, overrideAccess: true })
      .catch(() => null)

    if (!appointment) return notFound()

    const current = appointment.status as AppointmentStatus
    const next = body.data.status as AppointmentStatus

    if (!canTransitionAppointment(current, next, 'staff')) {
      return fail('forbidden_transition', 409, `Transition « ${current} » → « ${next} » refusée.`)
    }

    const updated = await payload.update({
      collection: 'appointments',
      id,
      data: {
        status: next,
        ...(body.data.meetingUrl ? { meetingUrl: body.data.meetingUrl } : {}),
      },
      overrideAccess: true,
      context: { disableRevalidate: true, actor: 'staff' },
    })

    // Le client est prévenu des seules transitions qui le concernent.
    let emailStatus: string | null = null
    const customer = appointment.customer as { id?: string; email?: string; name?: string } | null

    if ((next === 'confirmed' || next === 'cancelled') && customer?.email) {
      const result = await sendAppointmentEmail({
        appointmentId: id,
        reference: String(updated.reference ?? id),
        kind: next === 'confirmed' ? 'confirmed' : 'cancelled',
        to: customer.email,
        recipientName: customer.name,
        title:
          typeof appointment.meetingType === 'object'
            ? ((appointment.meetingType as { title?: string })?.title ?? 'Rendez-vous')
            : 'Rendez-vous',
        startAt: new Date(appointment.startAt as string),
        endAt: new Date(appointment.endAt as string),
        timezone: (appointment.customerTimezone as string) ?? 'America/Toronto',
        meetingUrl: body.data.meetingUrl ?? (appointment.meetingUrl as string | null),
      })
      emailStatus = result.status

      if (customer.id) {
        await notify({
          recipient: String(customer.id),
          type: next === 'confirmed' ? 'appointment_confirmed' : 'appointment_cancelled',
          title: next === 'confirmed' ? 'Rendez-vous confirmé' : 'Rendez-vous annulé',
          link: '/espace-client/rendez-vous',
        })
      }
    }

    await recordAudit({
      action: next === 'cancelled' ? 'appointment.cancelled' : 'appointment.confirmed',
      actor,
      targetCollection: 'appointments',
      targetId: id,
      targetLabel: String(updated.reference ?? id),
      summary: `Statut « ${current} » → « ${next} ».`,
    })

    return ok({ status: next, email: emailStatus })
  })
