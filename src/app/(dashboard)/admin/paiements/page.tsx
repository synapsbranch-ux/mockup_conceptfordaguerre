import { Plus, Wallet } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'

import { EmptyState, SectionHeading } from '@/components/dashboard/states'
import { Button } from '@/components/ui/button'
import { requireStaff } from '@/lib/auth/dal'
import { formatMoney } from '@/lib/commerce/money'
import { getPayloadClient } from '@/lib/payload'

export const metadata: Metadata = { title: 'Paiements' }

const METHOD_LABELS: Record<string, string> = {
  transfer: 'Virement',
  cheque: 'Chèque',
  cash: 'Espèces',
  other: 'Autre',
}

const shortDate = (value: string | null | undefined): string =>
  value ? new Intl.DateTimeFormat('fr-CA', { dateStyle: 'medium' }).format(new Date(value)) : '—'

/**
 * Règlements constatés hors ligne.
 * Aucun encaissement n'est traité par le site, et aucune donnée bancaire n'est
 * conservée : seulement la trace d'un paiement reçu.
 */
const AdminPaymentsPage = async () => {
  await requireStaff()
  const payload = await getPayloadClient()

  const payments = await payload.find({
    collection: 'payments',
    sort: '-receivedAt',
    limit: 100,
    depth: 1,
    overrideAccess: true,
  })

  const total = payments.docs.reduce((sum, payment) => sum + (payment.amount ?? 0), 0)

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Paiements</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Règlements constatés hors ligne. Aucune donnée bancaire n’est conservée.
          </p>
        </div>
        <Button asChild>
          <Link href="/cms/collections/payments/create">
            <Plus className="mr-1.5 size-4" aria-hidden />
            Enregistrer un paiement
          </Link>
        </Button>
      </div>

      <div className="border-border bg-card rounded-lg border p-4">
        <span className="text-muted-foreground text-sm">Total enregistré</span>
        <span className="mt-1 block text-2xl font-semibold tabular-nums">
          {formatMoney(total, 'CAD')}
        </span>
      </div>

      <section>
        <SectionHeading title={`${payments.totalDocs} paiement${payments.totalDocs > 1 ? 's' : ''}`} />

        {payments.docs.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title="Aucun paiement"
            description="Aucun règlement n’a encore été consigné."
          />
        ) : (
          <div className="border-border overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-4 py-2 font-medium">Reçu le</th>
                  <th className="px-4 py-2 font-medium">Client</th>
                  <th className="px-4 py-2 font-medium">Facture</th>
                  <th className="px-4 py-2 text-right font-medium">Montant</th>
                  <th className="px-4 py-2 font-medium">Moyen</th>
                  <th className="px-4 py-2 font-medium">Référence</th>
                </tr>
              </thead>
              <tbody>
                {payments.docs.map((payment) => {
                  const customer =
                    typeof payment.customer === 'object' && payment.customer
                      ? ((payment.customer as { name?: string; email?: string }).name ??
                        (payment.customer as { email?: string }).email)
                      : '—'
                  const invoice =
                    typeof payment.invoice === 'object' && payment.invoice
                      ? (payment.invoice as { number?: string }).number
                      : '—'
                  return (
                    <tr key={payment.id} className="border-border border-t">
                      <td className="px-4 py-2">{shortDate(payment.receivedAt)}</td>
                      <td className="px-4 py-2">{customer}</td>
                      <td className="px-4 py-2 font-mono text-xs">{invoice}</td>
                      <td className="px-4 py-2 text-right tabular-nums">
                        {formatMoney(payment.amount ?? 0, 'CAD')}
                      </td>
                      <td className="text-muted-foreground px-4 py-2">
                        {METHOD_LABELS[payment.method as string] ?? payment.method}
                      </td>
                      <td className="text-muted-foreground px-4 py-2">
                        {payment.reference ?? '—'}
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

export default AdminPaymentsPage
