import { ScrollText } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'

import { EmptyState, SectionHeading } from '@/components/dashboard/states'
import { Button } from '@/components/ui/button'
import { requireUser } from '@/lib/auth/dal'
import { getPayloadClient } from '@/lib/payload'
import { getClientSpaceSettings } from '@/lib/settings'

export const metadata: Metadata = { title: 'Mes demandes de devis' }

export const QUOTE_STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon',
  submitted: 'Envoyée',
  in_review: 'En cours d’étude',
  quoted: 'Proposition reçue',
  accepted: 'Acceptée',
  declined: 'Refusée',
  closed: 'Close',
}

const shortDate = (value: string | null | undefined): string =>
  value ? new Intl.DateTimeFormat('fr-CA', { dateStyle: 'medium' }).format(new Date(value)) : '—'

/** Demandes de devis du client, brouillons compris. */
const QuotesPage = async () => {
  const user = await requireUser()
  const payload = await getPayloadClient()
  const settings = await getClientSpaceSettings()

  const quotes = await payload.find({
    collection: 'quoteRequests',
    where: { customer: { equals: user.id } },
    sort: '-createdAt',
    limit: 100,
    depth: 1,
    overrideAccess: false,
    user: { ...user, collection: 'users' },
  })

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Mes demandes de devis</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Vos demandes, de leur brouillon à leur clôture.
          </p>
        </div>
        <Button asChild>
          <Link href="/espace-client/devis/nouveau">Demander un devis</Link>
        </Button>
      </div>

      <section>
        <SectionHeading title={`${quotes.totalDocs} demande${quotes.totalDocs > 1 ? 's' : ''}`} />

        {quotes.docs.length === 0 ? (
          <EmptyState
            icon={ScrollText}
            title="Aucune demande"
            description={settings.emptyQuotes ?? 'Vous n’avez pas encore de demande de devis.'}
            actionLabel="Demander un devis"
            actionHref="/espace-client/devis/nouveau"
          />
        ) : (
          <ul className="space-y-3">
            {quotes.docs.map((quote) => {
              const service =
                typeof quote.service === 'object' && quote.service
                  ? (quote.service as { title?: string }).title
                  : null

              return (
                <li key={quote.id} className="border-border bg-card rounded-lg border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium">{service ?? 'Demande générale'}</p>
                      <p className="text-muted-foreground mt-1 line-clamp-2 text-sm">
                        {quote.objectives}
                      </p>
                      <p className="text-muted-foreground mt-1 text-xs">
                        {quote.reference} · {shortDate(quote.createdAt)}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-3">
                      <span className="border-border rounded-full border px-2.5 py-1 text-xs">
                        {QUOTE_STATUS_LABELS[quote.status as string] ?? quote.status}
                      </span>
                      <Link
                        href={`/espace-client/devis/${quote.id}`}
                        className="text-sm underline underline-offset-2"
                      >
                        Détail
                      </Link>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}

export default QuotesPage
