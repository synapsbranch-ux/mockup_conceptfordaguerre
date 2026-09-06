import { Mail } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import type { Where } from 'payload'

import { EmptyState, SectionHeading } from '@/components/dashboard/states'
import { requireStaff } from '@/lib/auth/dal'
import { getPayloadClient } from '@/lib/payload'

export const metadata: Metadata = { title: 'Abonnés' }

const STATUS_LABELS: Record<string, string> = {
  pending: 'En attente de confirmation',
  subscribed: 'Confirmé',
  unsubscribed: 'Désabonné',
}

const shortDate = (value: string | null | undefined): string =>
  value ? new Intl.DateTimeFormat('fr-CA', { dateStyle: 'medium' }).format(new Date(value)) : '—'

/**
 * Abonnés à l'infolettre.
 *
 * Seuls les abonnés **confirmés** reçoivent une campagne : le double opt-in est
 * porté par le statut, pas par une case cochée à l'inscription.
 */
const SubscribersPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ statut?: string; q?: string }>
}) => {
  await requireStaff()
  const params = await searchParams
  const payload = await getPayloadClient()

  const status = (params.statut ?? '').trim()
  const search = (params.q ?? '').trim().slice(0, 120)

  const filters: Where[] = []
  if (status && status in STATUS_LABELS) filters.push({ status: { equals: status } })
  if (search) filters.push({ email: { like: search } })

  const [subscribers, confirmed] = await Promise.all([
    payload.find({
      collection: 'newsletterSubscribers',
      where: filters.length > 0 ? { and: filters } : undefined,
      sort: '-createdAt',
      limit: 200,
      depth: 0,
      overrideAccess: true,
    }),
    payload.count({
      collection: 'newsletterSubscribers',
      where: { status: { equals: 'subscribed' } },
      overrideAccess: true,
    }),
  ])

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Abonnés</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {confirmed.totalDocs} abonné{confirmed.totalDocs > 1 ? 's' : ''} confirmé
            {confirmed.totalDocs > 1 ? 's' : ''} — seuls ceux-ci reçoivent les campagnes.
          </p>
        </div>
        <Link
          href="/cms/collections/newsletterSubscribers"
          className="border-border rounded-md border px-4 py-2 text-sm font-medium"
        >
          Gérer dans le CMS
        </Link>
      </div>

      <form method="get" className="flex flex-wrap items-end gap-3">
        <div className="min-w-56 flex-1">
          <label htmlFor="q" className="mb-1 block text-sm font-medium">
            Rechercher
          </label>
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={search}
            placeholder="Adresse courriel"
            className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
          />
        </div>
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
        <SectionHeading title={`${subscribers.totalDocs} abonné${subscribers.totalDocs > 1 ? 's' : ''}`} />

        {subscribers.docs.length === 0 ? (
          <EmptyState
            icon={Mail}
            title="Aucun abonné"
            description="Aucun abonné ne correspond à ces critères."
          />
        ) : (
          <div className="border-border overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-4 py-2 font-medium">Adresse</th>
                  <th className="px-4 py-2 font-medium">Nom</th>
                  <th className="px-4 py-2 font-medium">Statut</th>
                  <th className="px-4 py-2 font-medium">Source</th>
                  <th className="px-4 py-2 font-medium">Inscrit</th>
                </tr>
              </thead>
              <tbody>
                {subscribers.docs.map((subscriber) => (
                  <tr key={subscriber.id} className="border-border border-t">
                    <td className="px-4 py-2">{subscriber.email}</td>
                    <td className="text-muted-foreground px-4 py-2">{subscriber.name ?? '—'}</td>
                    <td className="px-4 py-2">
                      {STATUS_LABELS[subscriber.status as string] ?? subscriber.status}
                    </td>
                    <td className="text-muted-foreground px-4 py-2">{subscriber.source ?? '—'}</td>
                    <td className="text-muted-foreground px-4 py-2">
                      {shortDate(subscriber.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

export default SubscribersPage
