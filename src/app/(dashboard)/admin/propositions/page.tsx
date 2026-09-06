import { FileSignature } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'

import { EmptyState, SectionHeading } from '@/components/dashboard/states'
import { Button } from '@/components/ui/button'
import { requireStaff } from '@/lib/auth/dal'
import { formatMoney } from '@/lib/commerce/money'
import { getPayloadClient } from '@/lib/payload'

export const metadata: Metadata = { title: 'Propositions' }

const STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon',
  sent: 'En attente de décision',
  accepted: 'Acceptée',
  declined: 'Refusée',
  expired: 'Expirée',
}

const shortDate = (value: string | null | undefined): string =>
  value ? new Intl.DateTimeFormat('fr-CA', { dateStyle: 'medium' }).format(new Date(value)) : '—'

/**
 * Propositions commerciales.
 *
 * L'édition reste dans le CMS : une proposition envoyée y est de toute façon
 * verrouillée par le hook de la collection, qui refuse toute modification de
 * son contenu.
 */
const AdminProposalsPage = async () => {
  await requireStaff()
  const payload = await getPayloadClient()

  const [proposals, pending] = await Promise.all([
    payload.find({
      collection: 'proposals',
      sort: '-createdAt',
      limit: 100,
      depth: 1,
      overrideAccess: true,
    }),
    payload.count({
      collection: 'proposals',
      where: { status: { equals: 'sent' } },
      overrideAccess: true,
    }),
  ])

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Propositions</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {pending.totalDocs} en attente de décision client.
          </p>
        </div>
        <Button asChild>
          <Link href="/cms/collections/proposals/create">Nouvelle proposition</Link>
        </Button>
      </div>

      <section>
        <SectionHeading title={`${proposals.totalDocs} proposition${proposals.totalDocs > 1 ? 's' : ''}`} />

        {proposals.docs.length === 0 ? (
          <EmptyState
            icon={FileSignature}
            title="Aucune proposition"
            description="Aucune proposition n’a encore été créée."
            actionLabel="Nouvelle proposition"
            actionHref="/cms/collections/proposals/create"
          />
        ) : (
          <div className="border-border overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-4 py-2 font-medium">Référence</th>
                  <th className="px-4 py-2 font-medium">Objet</th>
                  <th className="px-4 py-2 font-medium">Client</th>
                  <th className="px-4 py-2 text-right font-medium">Total</th>
                  <th className="px-4 py-2 font-medium">Statut</th>
                  <th className="px-4 py-2 font-medium">Envoyée</th>
                </tr>
              </thead>
              <tbody>
                {proposals.docs.map((proposal) => {
                  const customer =
                    typeof proposal.customer === 'object' && proposal.customer
                      ? ((proposal.customer as { name?: string; email?: string }).name ??
                        (proposal.customer as { email?: string }).email)
                      : '—'
                  return (
                    <tr key={proposal.id} className="border-border border-t">
                      <td className="px-4 py-2">
                        <Link
                          href={`/cms/collections/proposals/${proposal.id}`}
                          className="font-mono text-xs underline-offset-2 hover:underline"
                        >
                          {proposal.reference}
                        </Link>
                      </td>
                      <td className="px-4 py-2">{proposal.title}</td>
                      <td className="text-muted-foreground px-4 py-2">{customer}</td>
                      <td className="px-4 py-2 text-right tabular-nums">
                        {formatMoney(
                          proposal.totals?.total ?? 0,
                          (proposal.currency as string) ?? 'CAD',
                        )}
                      </td>
                      <td className="px-4 py-2">
                        {STATUS_LABELS[proposal.status as string] ?? proposal.status}
                      </td>
                      <td className="text-muted-foreground px-4 py-2">
                        {shortDate(proposal.sentAt)}
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

export default AdminProposalsPage
