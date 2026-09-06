import { ScrollText } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import type { Where } from 'payload'

import { EmptyState, SectionHeading } from '@/components/dashboard/states'
import { requireStaff } from '@/lib/auth/dal'
import { getPayloadClient } from '@/lib/payload'

export const metadata: Metadata = { title: 'Demandes de devis' }

const STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon client',
  submitted: 'À traiter',
  in_review: 'En cours d’étude',
  quoted: 'Proposition envoyée',
  accepted: 'Acceptée',
  declined: 'Refusée',
  closed: 'Close',
}

const PRIORITY_LABELS: Record<string, string> = {
  low: 'Basse',
  normal: 'Normale',
  high: 'Haute',
}

const shortDate = (value: string | null | undefined): string =>
  value ? new Intl.DateTimeFormat('fr-CA', { dateStyle: 'medium' }).format(new Date(value)) : '—'

/**
 * File des demandes de devis.
 *
 * Les brouillons clients sont exclus par défaut : ils n'ont pas été transmis et
 * n'appellent aucune action de l'équipe.
 */
const AdminQuotesPage = async ({
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
  if (status && status in STATUS_LABELS) {
    filters.push({ status: { equals: status } })
  } else {
    // Vue par défaut : ce qui est réellement actionnable.
    filters.push({ status: { not_equals: 'draft' } })
  }
  if (search) filters.push({ objectives: { like: search } })

  const [quotes, actionable] = await Promise.all([
    payload.find({
      collection: 'quoteRequests',
      where: filters.length > 1 ? { and: filters } : filters[0],
      sort: '-createdAt',
      limit: 100,
      depth: 1,
      overrideAccess: true,
    }),
    payload.count({
      collection: 'quoteRequests',
      where: { status: { in: ['submitted', 'in_review'] } },
      overrideAccess: true,
    }),
  ])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Demandes de devis</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {actionable.totalDocs} demande{actionable.totalDocs > 1 ? 's' : ''} en attente de
          traitement.
        </p>
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
            placeholder="Dans les objectifs"
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
            <option value="">Hors brouillons</option>
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
        <SectionHeading title={`${quotes.totalDocs} demande${quotes.totalDocs > 1 ? 's' : ''}`} />

        {quotes.docs.length === 0 ? (
          <EmptyState
            icon={ScrollText}
            title="Aucune demande"
            description="Aucune demande ne correspond à ces critères."
          />
        ) : (
          <div className="border-border overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-4 py-2 font-medium">Référence</th>
                  <th className="px-4 py-2 font-medium">Client</th>
                  <th className="px-4 py-2 font-medium">Service</th>
                  <th className="px-4 py-2 font-medium">Statut</th>
                  <th className="px-4 py-2 font-medium">Priorité</th>
                  <th className="px-4 py-2 font-medium">Reçue</th>
                </tr>
              </thead>
              <tbody>
                {quotes.docs.map((quote) => {
                  const customer =
                    typeof quote.customer === 'object' && quote.customer
                      ? ((quote.customer as { name?: string; email?: string }).name ??
                        (quote.customer as { email?: string }).email)
                      : (quote.guestEmail ?? '—')
                  const service =
                    typeof quote.service === 'object' && quote.service
                      ? (quote.service as { title?: string }).title
                      : '—'

                  return (
                    <tr key={quote.id} className="border-border border-t">
                      <td className="px-4 py-2">
                        <Link
                          href={`/cms/collections/quoteRequests/${quote.id}`}
                          className="font-mono text-xs underline-offset-2 hover:underline"
                        >
                          {quote.reference}
                        </Link>
                      </td>
                      <td className="px-4 py-2">{customer}</td>
                      <td className="text-muted-foreground px-4 py-2">{service}</td>
                      <td className="px-4 py-2">
                        {STATUS_LABELS[quote.status as string] ?? quote.status}
                      </td>
                      <td className="text-muted-foreground px-4 py-2">
                        {PRIORITY_LABELS[quote.priority as string] ?? '—'}
                      </td>
                      <td className="text-muted-foreground px-4 py-2">
                        {shortDate(quote.submittedAt ?? quote.createdAt)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

export default AdminQuotesPage
