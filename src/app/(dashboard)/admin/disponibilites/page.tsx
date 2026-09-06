import { CalendarRange, Plus } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'

import { EmptyState, SectionHeading } from '@/components/dashboard/states'
import { Button } from '@/components/ui/button'
import { requireStaff } from '@/lib/auth/dal'
import { getPayloadClient } from '@/lib/payload'

export const metadata: Metadata = { title: 'Disponibilités' }

const WEEKDAYS: Record<string, string> = {
  '1': 'Lundi',
  '2': 'Mardi',
  '3': 'Mercredi',
  '4': 'Jeudi',
  '5': 'Vendredi',
  '6': 'Samedi',
  '0': 'Dimanche',
}

const EXCEPTION_KINDS: Record<string, string> = {
  blocked: 'Journée bloquée',
  blocked_range: 'Plage bloquée',
  extra: 'Plage exceptionnelle',
}

const shortDate = (value: string | null | undefined): string =>
  value ? new Intl.DateTimeFormat('fr-CA', { dateStyle: 'full' }).format(new Date(value)) : '—'

/**
 * Règles hebdomadaires, exceptions et formats de rencontre.
 *
 * Les heures sont exprimées dans le fuseau de l'hôte ; le moteur de créneaux
 * les convertit en UTC pour chaque date, ce qui suit correctement les
 * changements d'heure.
 */
const AvailabilityPage = async () => {
  await requireStaff()
  const payload = await getPayloadClient()

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [rules, exceptions, types] = await Promise.all([
    payload.find({
      collection: 'availabilityRules',
      sort: 'weekday',
      limit: 100,
      depth: 1,
      overrideAccess: true,
    }),
    payload.find({
      collection: 'availabilityExceptions',
      where: { date: { greater_than_equal: today.toISOString() } },
      sort: 'date',
      limit: 100,
      depth: 0,
      overrideAccess: true,
    }),
    payload.find({
      collection: 'meetingTypes',
      sort: 'order',
      limit: 50,
      depth: 0,
      overrideAccess: true,
    }),
  ])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Disponibilités</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Les heures sont exprimées dans le fuseau de l’hôte. Les créneaux sont calculés côté
          serveur et suivent les changements d’heure.
        </p>
      </div>

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <SectionHeading title="Formats de rencontre" />
          <Button asChild size="sm" variant="outline">
            <Link href="/cms/collections/meetingTypes/create">
              <Plus className="mr-1.5 size-3.5" aria-hidden />
              Nouveau format
            </Link>
          </Button>
        </div>

        {types.docs.length === 0 ? (
          <EmptyState
            icon={CalendarRange}
            title="Aucun format"
            description="Sans format de rencontre, aucune réservation n’est possible."
            actionLabel="Créer un format"
            actionHref="/cms/collections/meetingTypes/create"
          />
        ) : (
          <ul className="space-y-2">
            {types.docs.map((type) => (
              <li
                key={type.id}
                className="border-border bg-card flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4"
              >
                <div>
                  <Link
                    href={`/cms/collections/meetingTypes/${type.id}`}
                    className="font-medium underline-offset-2 hover:underline"
                  >
                    {type.title}
                  </Link>
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    {type.durationMinutes} min · tampon {type.bufferMinutes ?? 0} min · préavis{' '}
                    {type.minimumNoticeHours ?? 0} h · horizon {type.horizonDays ?? 60} j
                  </p>
                </div>
                <span className="text-muted-foreground text-xs">
                  {type.active ? 'Proposé' : 'Désactivé'}
                  {type.requiresConfirmation ? ' · confirmation manuelle' : ''}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <SectionHeading title="Plages hebdomadaires" />
          <Button asChild size="sm" variant="outline">
            <Link href="/cms/collections/availabilityRules/create">
              <Plus className="mr-1.5 size-3.5" aria-hidden />
              Nouvelle plage
            </Link>
          </Button>
        </div>

        {rules.docs.length === 0 ? (
          <EmptyState
            title="Aucune plage définie"
            description="Sans plage hebdomadaire, aucun créneau n’est proposé."
            actionLabel="Définir une plage"
            actionHref="/cms/collections/availabilityRules/create"
          />
        ) : (
          <ul className="space-y-1.5">
            {rules.docs.map((rule) => (
              <li
                key={rule.id}
                className="border-border flex flex-wrap items-center justify-between gap-2 border-b py-2 text-sm last:border-0"
              >
                <span className="font-medium">{WEEKDAYS[String(rule.weekday)] ?? '—'}</span>
                <span className="tabular-nums">
                  {rule.startTime} – {rule.endTime}
                </span>
                <span className="text-muted-foreground text-xs">
                  {rule.timezone}
                  {rule.active === false ? ' · inactive' : ''}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <SectionHeading title="Exceptions à venir" />
          <Button asChild size="sm" variant="outline">
            <Link href="/cms/collections/availabilityExceptions/create">
              <Plus className="mr-1.5 size-3.5" aria-hidden />
              Bloquer une date
            </Link>
          </Button>
        </div>

        {exceptions.docs.length === 0 ? (
          <p className="text-muted-foreground text-sm">Aucune exception à venir.</p>
        ) : (
          <ul className="space-y-1.5">
            {exceptions.docs.map((exception) => (
              <li
                key={exception.id}
                className="border-border flex flex-wrap items-center justify-between gap-2 border-b py-2 text-sm last:border-0"
              >
                <span>{shortDate(exception.date)}</span>
                <span className="text-muted-foreground text-xs">
                  {EXCEPTION_KINDS[exception.kind as string] ?? exception.kind}
                  {exception.startTime ? ` · ${exception.startTime}–${exception.endTime}` : ''}
                  {exception.reason ? ` · ${exception.reason}` : ''}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

export default AvailabilityPage
