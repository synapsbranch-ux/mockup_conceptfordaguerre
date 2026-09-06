import { CalendarClock, Video } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'

import { AppointmentActions } from '@/components/booking/AppointmentActions'
import { EmptyState, SectionHeading } from '@/components/dashboard/states'
import { Button } from '@/components/ui/button'
import { requireUser } from '@/lib/auth/dal'
import { getPayloadClient } from '@/lib/payload'
import { getClientSpaceSettings } from '@/lib/settings'

export const metadata: Metadata = { title: 'Mes rendez-vous' }

const STATUS_LABELS: Record<string, string> = {
  requested: 'Demandé',
  confirmed: 'Confirmé',
  completed: 'Terminé',
  cancelled: 'Annulé',
  no_show: 'Absence',
}

/**
 * Rendez-vous du client, à venir et passés.
 *
 * Les dates sont stockées en UTC et rendues ici dans le fuseau enregistré avec
 * le rendez-vous — celui du navigateur au moment de la réservation — et non
 * dans celui du serveur.
 */
const AppointmentsPage = async () => {
  const user = await requireUser()
  const payload = await getPayloadClient()
  const settings = await getClientSpaceSettings()

  const now = new Date().toISOString()

  const [upcoming, past] = await Promise.all([
    payload.find({
      collection: 'appointments',
      where: {
        and: [
          { customer: { equals: user.id } },
          { startAt: { greater_than_equal: now } },
          { status: { in: ['requested', 'confirmed'] } },
        ],
      },
      sort: 'startAt',
      limit: 50,
      depth: 1,
      overrideAccess: true,
    }),
    payload.find({
      collection: 'appointments',
      where: {
        and: [
          { customer: { equals: user.id } },
          {
            or: [
              { startAt: { less_than: now } },
              { status: { in: ['completed', 'cancelled', 'no_show'] } },
            ],
          },
        ],
      },
      sort: '-startAt',
      limit: 30,
      depth: 1,
      overrideAccess: true,
    }),
  ])

  const format = (value: string, timezone: string): string => {
    try {
      return new Intl.DateTimeFormat('fr-CA', {
        dateStyle: 'full',
        timeStyle: 'short',
        timeZone: timezone,
      }).format(new Date(value))
    } catch {
      return new Intl.DateTimeFormat('fr-CA', { dateStyle: 'full', timeStyle: 'short' }).format(
        new Date(value),
      )
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Mes rendez-vous</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Vos rencontres à venir et passées.
          </p>
        </div>
        {settings.bookingEnabled !== false && (
          <Button asChild>
            <Link href="/espace-client/rendez-vous/reserver">Réserver une rencontre</Link>
          </Button>
        )}
      </div>

      <section>
        <SectionHeading title="À venir" />
        {upcoming.docs.length === 0 ? (
          <EmptyState
            icon={CalendarClock}
            title="Aucun rendez-vous prévu"
            description={settings.emptyAppointments ?? 'Aucun rendez-vous prévu.'}
            actionLabel={settings.bookingEnabled !== false ? 'Réserver une rencontre' : undefined}
            actionHref={
              settings.bookingEnabled !== false ? '/espace-client/rendez-vous/reserver' : undefined
            }
          />
        ) : (
          <ul className="space-y-3">
            {upcoming.docs.map((appointment) => {
              const timezone = (appointment.customerTimezone as string) ?? 'America/Toronto'
              const type =
                typeof appointment.meetingType === 'object'
                  ? (appointment.meetingType as { title?: string })?.title
                  : null

              return (
                <li
                  key={appointment.id}
                  className="border-border bg-card rounded-lg border p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{type ?? 'Rencontre'}</p>
                      <p className="text-muted-foreground mt-1 text-sm">
                        {format(appointment.startAt as string, timezone)}
                      </p>
                      <p className="text-muted-foreground mt-0.5 text-xs">
                        {timezone} · {STATUS_LABELS[appointment.status as string] ?? appointment.status}
                        {appointment.reference ? ` · ${appointment.reference}` : ''}
                      </p>
                      {appointment.meetingUrl && (
                        <a
                          href={appointment.meetingUrl as string}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 inline-flex items-center gap-1.5 text-sm underline underline-offset-2"
                        >
                          <Video className="size-3.5" aria-hidden />
                          Rejoindre la rencontre
                        </a>
                      )}
                    </div>

                    <AppointmentActions
                      appointmentId={String(appointment.id)}
                      meetingTypeSlug={
                        typeof appointment.meetingType === 'object'
                          ? ((appointment.meetingType as { slug?: string })?.slug ?? '')
                          : ''
                      }
                    />
                  </div>

                  {appointment.objective && (
                    <p className="border-border text-muted-foreground mt-3 border-l-2 pl-3 text-sm">
                      {appointment.objective as string}
                    </p>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {past.docs.length > 0 && (
        <section>
          <SectionHeading title="Historique" />
          <ul className="space-y-2">
            {past.docs.map((appointment) => {
              const timezone = (appointment.customerTimezone as string) ?? 'America/Toronto'
              const type =
                typeof appointment.meetingType === 'object'
                  ? (appointment.meetingType as { title?: string })?.title
                  : null
              return (
                <li
                  key={appointment.id}
                  className="border-border flex flex-wrap items-center justify-between gap-2 border-b py-3 text-sm last:border-0"
                >
                  <span>{type ?? 'Rencontre'}</span>
                  <span className="text-muted-foreground">
                    {format(appointment.startAt as string, timezone)}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {STATUS_LABELS[appointment.status as string] ?? appointment.status}
                  </span>
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </div>
  )
}

export default AppointmentsPage
