import { FileSignature } from 'lucide-react'
import type { Metadata } from 'next'

import { ProposalDecision } from '@/components/commerce/ProposalDecision'
import { EmptyState, SectionHeading } from '@/components/dashboard/states'
import { requireUser } from '@/lib/auth/dal'
import { formatMoney } from '@/lib/commerce/money'
import { getPayloadClient } from '@/lib/payload'
import { getClientSpaceSettings } from '@/lib/settings'

export const metadata: Metadata = { title: 'Mes propositions' }

const STATUS_LABELS: Record<string, string> = {
  sent: 'En attente de votre décision',
  accepted: 'Acceptée',
  declined: 'Refusée',
  expired: 'Expirée',
}

const shortDate = (value: string | null | undefined): string =>
  value ? new Intl.DateTimeFormat('fr-CA', { dateStyle: 'medium' }).format(new Date(value)) : '—'

/**
 * Propositions reçues par le client.
 *
 * Les brouillons ne sont **jamais** listés : une proposition n'existe pour le
 * client qu'à partir de son envoi. Le filtre est explicite ici, en plus de la
 * clause de propriété.
 */
const ProposalsPage = async () => {
  const user = await requireUser()
  const payload = await getPayloadClient()
  const settings = await getClientSpaceSettings()

  const proposals = await payload.find({
    collection: 'proposals',
    where: {
      and: [
        { customer: { equals: user.id } },
        // Un brouillon appartient encore à l'équipe : il ne doit pas fuiter.
        { status: { not_equals: 'draft' } },
      ],
    },
    sort: '-createdAt',
    limit: 50,
    depth: 0,
    overrideAccess: false,
    user: { ...user, collection: 'users' },
  })

  const pending = proposals.docs.filter((proposal) => proposal.status === 'sent')
  const settled = proposals.docs.filter((proposal) => proposal.status !== 'sent')

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Mes propositions</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Les propositions commerciales qui vous ont été adressées.
        </p>
      </div>

      <section>
        <SectionHeading title="En attente de décision" />

        {pending.length === 0 ? (
          <EmptyState
            icon={FileSignature}
            title="Aucune décision en attente"
            description={settings.emptyProposals ?? 'Aucune proposition en attente.'}
          />
        ) : (
          <ul className="space-y-4">
            {pending.map((proposal) => {
              const currency = (proposal.currency as string) ?? 'CAD'
              const total = formatMoney(proposal.totals?.total ?? 0, currency)

              return (
                <li key={proposal.id} className="border-border bg-card rounded-lg border p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="font-medium">{proposal.title}</h2>
                      <p className="text-muted-foreground mt-1 text-xs">
                        {proposal.reference} · envoyée le {shortDate(proposal.sentAt)}
                        {proposal.validUntil
                          ? ` · valable jusqu’au ${shortDate(proposal.validUntil)}`
                          : ''}
                      </p>
                    </div>
                    <span className="text-lg font-semibold tabular-nums">{total}</span>
                  </div>

                  {proposal.summary && (
                    <p className="text-muted-foreground mt-3 text-sm">{proposal.summary}</p>
                  )}

                  {/* Détail des lignes — les montants viennent du serveur. */}
                  {Array.isArray(proposal.lines) && proposal.lines.length > 0 && (
                    <div className="border-border mt-4 overflow-x-auto rounded-md border">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50 text-left">
                          <tr>
                            <th className="px-3 py-2 font-medium">Désignation</th>
                            <th className="px-3 py-2 text-right font-medium">Qté</th>
                            <th className="px-3 py-2 text-right font-medium">Prix</th>
                          </tr>
                        </thead>
                        <tbody>
                          {proposal.lines.map((line, index) => (
                            <tr key={index} className="border-border border-t">
                              <td className="px-3 py-2">{line.description}</td>
                              <td className="px-3 py-2 text-right tabular-nums">{line.quantity}</td>
                              <td className="px-3 py-2 text-right tabular-nums">
                                {formatMoney(line.unitPrice ?? 0, currency)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="border-border border-t">
                          <tr>
                            <td className="text-muted-foreground px-3 py-1.5" colSpan={2}>
                              Sous-total
                            </td>
                            <td className="px-3 py-1.5 text-right tabular-nums">
                              {formatMoney(proposal.totals?.subtotal ?? 0, currency)}
                            </td>
                          </tr>
                          {(proposal.totals?.discountAmount ?? 0) > 0 && (
                            <tr>
                              <td className="text-muted-foreground px-3 py-1.5" colSpan={2}>
                                Remise
                              </td>
                              <td className="px-3 py-1.5 text-right tabular-nums">
                                −{formatMoney(proposal.totals?.discountAmount ?? 0, currency)}
                              </td>
                            </tr>
                          )}
                          {(proposal.totals?.taxAmount ?? 0) > 0 && (
                            <tr>
                              <td className="text-muted-foreground px-3 py-1.5" colSpan={2}>
                                Taxes
                              </td>
                              <td className="px-3 py-1.5 text-right tabular-nums">
                                {formatMoney(proposal.totals?.taxAmount ?? 0, currency)}
                              </td>
                            </tr>
                          )}
                          <tr className="font-semibold">
                            <td className="px-3 py-2" colSpan={2}>
                              Total
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums">{total}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}

                  {proposal.terms && (
                    <div className="border-border text-muted-foreground mt-4 border-l-2 pl-3 text-sm whitespace-pre-line">
                      {proposal.terms}
                    </div>
                  )}

                  <div className="mt-5">
                    <ProposalDecision proposalId={String(proposal.id)} total={total} />
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {settled.length > 0 && (
        <section>
          <SectionHeading title="Historique" />
          <ul className="space-y-2">
            {settled.map((proposal) => (
              <li
                key={proposal.id}
                className="border-border flex flex-wrap items-center justify-between gap-2 border-b py-3 text-sm last:border-0"
              >
                <span className="font-medium">{proposal.title}</span>
                <span className="text-muted-foreground tabular-nums">
                  {formatMoney(proposal.totals?.total ?? 0, (proposal.currency as string) ?? 'CAD')}
                </span>
                <span className="text-muted-foreground text-xs">
                  {STATUS_LABELS[proposal.status as string] ?? proposal.status}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

export default ProposalsPage
