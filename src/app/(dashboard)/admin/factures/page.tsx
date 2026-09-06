import { Download, Plus, ReceiptText } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import type { Where } from 'payload'

import { EmptyState, SectionHeading } from '@/components/dashboard/states'
import { Button } from '@/components/ui/button'
import { requireStaff } from '@/lib/auth/dal'
import { formatMoney } from '@/lib/commerce/money'
import { getPayloadClient } from '@/lib/payload'

export const metadata: Metadata = { title: 'Factures' }

const STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon',
  sent: 'Envoyée',
  partially_paid: 'Partiellement payée',
  paid: 'Payée',
  overdue: 'En retard',
  cancelled: 'Annulée',
}

const shortDate = (value: string | null | undefined): string =>
  value ? new Intl.DateTimeFormat('fr-CA', { dateStyle: 'medium' }).format(new Date(value)) : '—'

/**
 * Factures.
 *
 * Les statistiques sont calculees a partir des documents reellement lus, et les
 * factures annulees sont exclues des montants : les compter fausserait le
 * chiffre facture.
 */
const AdminInvoicesPage = async ({
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

  const [invoices, all] = await Promise.all([
    payload.find({
      collection: 'invoices',
      where: filters.length > 0 ? { and: filters } : undefined,
      sort: '-issueDate',
      limit: 100,
      depth: 1,
      overrideAccess: true,
    }),
    payload.find({
      collection: 'invoices',
      where: { status: { not_equals: 'cancelled' } },
      limit: 1000,
      depth: 0,
      overrideAccess: true,
    }),
  ])

  const billed = all.docs.reduce((sum, invoice) => sum + (invoice.totals?.total ?? 0), 0)
  const outstanding = all.docs
    .filter((invoice) => ['sent', 'partially_paid', 'overdue'].includes(invoice.status as string))
    .reduce((sum, invoice) => sum + (invoice.totals?.balanceDue ?? 0), 0)
  const collected = Math.max(0, billed - outstanding)

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Factures</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Montants hors factures annulées.
          </p>
        </div>
        <Button asChild>
          <Link href="/cms/collections/invoices/create">
            <Plus className="mr-1.5 size-4" aria-hidden />
            Nouvelle facture
          </Link>
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: 'Facturé', value: billed },
          { label: 'Encaissé', value: collected },
          { label: 'En attente', value: outstanding },
        ].map((stat) => (
          <div key={stat.label} className="border-border bg-card rounded-lg border p-4">
            <span className="text-muted-foreground text-sm">{stat.label}</span>
            <span className="mt-1 block text-2xl font-semibold tabular-nums">
              {formatMoney(stat.value, 'CAD')}
            </span>
          </div>
        ))}
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
        <SectionHeading title={`${invoices.totalDocs} facture${invoices.totalDocs > 1 ? 's' : ''}`} />

        {invoices.docs.length === 0 ? (
          <EmptyState
            icon={ReceiptText}
            title="Aucune facture"
            description="Aucune facture ne correspond à ces critères."
          />
        ) : (
          <div className="border-border overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-4 py-2 font-medium">Numéro</th>
                  <th className="px-4 py-2 font-medium">Client</th>
                  <th className="px-4 py-2 text-right font-medium">Total</th>
                  <th className="px-4 py-2 text-right font-medium">Reste</th>
                  <th className="px-4 py-2 font-medium">Statut</th>
                  <th className="px-4 py-2 font-medium">Échéance</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody>
                {invoices.docs.map((invoice) => {
                  const currency = (invoice.currency as string) ?? 'CAD'
                  const customer =
                    typeof invoice.customer === 'object' && invoice.customer
                      ? ((invoice.customer as { name?: string; email?: string }).name ??
                        (invoice.customer as { email?: string }).email)
                      : '—'
                  return (
                    <tr key={invoice.id} className="border-border border-t">
                      <td className="px-4 py-2">
                        <Link
                          href={`/cms/collections/invoices/${invoice.id}`}
                          className="font-mono text-xs underline-offset-2 hover:underline"
                        >
                          {invoice.number ?? '—'}
                        </Link>
                      </td>
                      <td className="px-4 py-2">{customer}</td>
                      <td className="px-4 py-2 text-right tabular-nums">
                        {formatMoney(invoice.totals?.total ?? 0, currency)}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums">
                        {formatMoney(invoice.totals?.balanceDue ?? 0, currency)}
                      </td>
                      <td className="px-4 py-2">
                        {STATUS_LABELS[invoice.status as string] ?? invoice.status}
                      </td>
                      <td className="text-muted-foreground px-4 py-2">
                        {shortDate(invoice.dueDate)}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <a
                          href={`/api/factures/${invoice.id}/pdf`}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`PDF de ${invoice.number ?? 'la facture'}`}
                          className="text-muted-foreground hover:text-foreground inline-flex"
                        >
                          <Download className="size-4" aria-hidden />
                        </a>
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

export default AdminInvoicesPage
