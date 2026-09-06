import { CalendarClock } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import type { Where } from 'payload'

import { AdminAppointmentActions } from '@/components/booking/AdminAppointmentActions'
import { EmptyState, SectionHeading } from '@/components/dashboard/states'
import { requireStaff } from '@/lib/auth/dal'
import { getPayloadClient } from '@/lib/payload'

export const metadata: Metadata = { title: 'Rendez-vous' }

const STATUS_LABELS: Record<string, string> = {
  requested: 'À confirmer',
  confirmed: 'Confirmé',
  completed: 'Terminé',
  cancelled: 'Annulé',
  no_show: 'Absence',
}

/**
 * Rendez-vous, vue liste.
 *
 * Chaque date est rendue dans le fuseau enregistré avec le rendez-vous —
 * celui du client — et non dans celui du serveur, avec le fuseau affiché pour
 * lever toute ambiguïté.
 */
const AdminAppointmentsPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ statut?: string }>
}) => {
  await requireStaff()
  const params = await searchParams
  const payload = await getPayloadClient()

  const status = (params.statut ?? '').trim()
  const filters: Where[] = []
  if (status && status in STATUS_LABELS) filters.push({ status: { equals: status } })

  const [appointments, pending] = await Promise.all([
    payload.find({
      collection: 'appointments',
      where: filters.length > 0 ? { and: filters } : undefined,
      sort: '-startAt',
      limit: 100,
      depth: 1,
      overrideAccess: true,
    }),
    payload.count({
      collection: 'appointments',
      where: { status: { equals: 'requested' } },
      overrideAccess: true,
    }),
  ])

  const format = (value: string, timezone: string): string => {
    try {
      return new Intl.DateTimeFormat('fr-CA', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: timezone,
      }).format(new Date(value))
    } catch {
      return new Intl.DateTimeFormat('fr-CA', { dateStyle: 'medium', timeStyle: 'short' }).format(
        new Date(value),
      )
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Rendez-vous</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {pending.totalDocs} demande{pending.totalDocs > 1 ? 's' : ''} à confirmer.
          </p>
        </div>
        <Link
          href="/admin/disponibilites"
          className="border-border rounded-md border px-4 py-2 text-sm font-medium"
        >
          Gérer les disponibilités
        </Link>
      </div>

      <form method="get" className="flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="statut" className="mb-1 block text-sm font-medium">
            Statut
          </label>
          <select
            id="statut"
            name="statut"
            defaultValue={status}
            className="border-input bg-background rounded-md border px-3 py-2 text-sm"
          >
            <option value="">Tous</option>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium"
        >
          Filtrer
        </button>
      </form>

      <section>
        <SectionHeading title={`${appointments.totalDocs} rendez-vous`} />

        {appointments.docs.length === 0 ? (
          <EmptyState
            icon={CalendarClock}
            title="Aucun rendez-vous"
            description="Aucun rendez-vous ne correspond à ces critères."
          />
        ) : (
          <ul className="space-y-3">
            {appointments.docs.map((appointment) => {
              const timezone = (appointment.customerTimezone as string) ?? 'America/Toronto'
              const customer =
                typeof appointment.customer === 'object' && appointment.customer
                  ? ((appointment.customer as { name?: string; email?: string }).name ??
                    (appointment.customer as { email?: string }).email)
                  : (appointment.guestEmail ?? '—')
              const type =
                typeof appointment.meetingType === 'object' && appointment.meetingType
                  ? (appointment.meetingType as { title?: string }).title
                  : 'Rencontre'

              return (
                <li
                  key={appointment.id}
                  className="border-border bg-card flex flex-wrap items-start justify-between gap-3 rounded-lg border p-4"
                >
                  <div className="min-w-0">
                    <p className="font-medium">
                      {type} — {customer}
                    </p>
                    <p className="text-muted-foreground mt-1 text-sm">
                      {format(appointment.startAt as string, timezone)}{' '}
                      <span className="text-xs">({timezone})</span>
                    </p>
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      {STATUS_LABELS[appointment.status as string]} · {appointment.reference}
                    </p>
                    {appointment.objective && (
                      <p className="border-border text-muted-foreground mt-2 border-l-2 pl-3 text-sm">
                        {appointment.objective as string}
                      </p>
                    )}
                  </div>

                  <AdminAppointmentActions
                    appointmentId={String(appointment.id)}
                    status={appointment.status as string}
                  />
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}

export default AdminAppointmentsPage
