import { Download, ReceiptText } from 'lucide-react'
import type { Metadata } from 'next'
import type { Where } from 'payload'

import { EmptyState, SectionHeading } from '@/components/dashboard/states'
import { requireUser } from '@/lib/auth/dal'
import { formatMoney } from '@/lib/commerce/money'
import { getPayloadClient } from '@/lib/payload'
import { getClientSpaceSettings } from '@/lib/settings'

export const metadata: Metadata = { title: 'Mes factures' }

const STATUS_LABELS: Record<string, string> = {
  sent: 'Envoyée',
  partially_paid: 'Partiellement payée',
  paid: 'Payée',
  overdue: 'En retard',
  cancelled: 'Annulée',
}

const shortDate = (value: string | null | undefined): string =>
  value ? new Intl.DateTimeFormat('fr-CA', { dateStyle: 'medium' }).format(new Date(value)) : '—'

/**
 * Factures du client.
 *
 * Les brouillons sont exclus : une facture n'existe pour le client qu'à partir
 * de son émission. Le filtre est explicite ici, en plus de la clause de
 * propriété portée par la collection.
 */
const InvoicesPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ statut?: string }>
}) => {
  const user = await requireUser()
  const params = await searchParams
  const payload = await getPayloadClient()
  const settings = await getClientSpaceSettings()

  const status = (params.statut ?? '').trim()

  const filters: Where[] = [
    { customer: { equals: user.id } },
    // Un brouillon appartient encore à l'équipe.
    { status: { not_equals: 'draft' } },
  ]
  if (status && status in STATUS_LABELS) filters.push({ status: { equals: status } })

  const invoices = await payload.find({
    collection: 'invoices',
    where: { and: filters },
    sort: '-issueDate',
    limit: 100,
    depth: 0,
    overrideAccess: false,
    user: { ...user, collection: 'users' },
  })

  // Montant réellement dû, calculé depuis les documents lus — jamais estimé.
  const outstanding = invoices.docs
    .filter((invoice) => ['sent', 'partially_paid', 'overdue'].includes(invoice.status as string))
    .reduce((sum, invoice) => sum + (invoice.totals?.balanceDue ?? 0), 0)

  const currency = (invoices.docs[0]?.currency as string) ?? 'CAD'

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Mes factures</h1>
        {outstanding > 0 ? (
          <p className="text-muted-foreground mt-1 text-sm">
            Solde à régler : <strong>{formatMoney(outstanding, currency)}</strong>
          </p>
        ) : (
          <p className="text-muted-foreground mt-1 text-sm">Aucun solde en attente.</p>
        )}
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
            description={settings.emptyInvoices ?? 'Aucune facture pour le moment.'}
          />
        ) : (
          <div className="border-border overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-4 py-2 font-medium">Numéro</th>
                  <th className="px-4 py-2 font-medium">Émise</th>
                  <th className="px-4 py-2 font-medium">Échéance</th>
                  <th className="px-4 py-2 text-right font-medium">Total</th>
                  <th className="px-4 py-2 text-right font-medium">Reste</th>
                  <th className="px-4 py-2 font-medium">Statut</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody>
                {invoices.docs.map((invoice) => {
                  const invoiceCurrency = (invoice.currency as string) ?? 'CAD'
                  const overdue = invoice.status === 'overdue'
                  return (
                    <tr key={invoice.id} className="border-border border-t">
                      <td className="px-4 py-2 font-mono text-xs">{invoice.number}</td>
                      <td className="text-muted-foreground px-4 py-2">
                        {shortDate(invoice.issueDate)}
                      </td>
                      <td className={`px-4 py-2 ${overdue ? 'text-destructive' : 'text-muted-foreground'}`}>
                        {shortDate(invoice.dueDate)}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums">
                        {formatMoney(invoice.totals?.total ?? 0, invoiceCurrency)}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums">
                        {formatMoney(invoice.totals?.balanceDue ?? 0, invoiceCurrency)}
                      </td>
                      <td className="px-4 py-2">
                        {STATUS_LABELS[invoice.status as string] ?? invoice.status}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <a
                          href={`/api/factures/${invoice.id}/pdf`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 underline underline-offset-2"
                        >
                          <Download className="size-3.5" aria-hidden />
                          PDF
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

export default InvoicesPage
