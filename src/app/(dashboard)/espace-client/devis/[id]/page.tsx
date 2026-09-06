import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { SubmitDraftButton } from '@/components/commerce/SubmitDraftButton'
import { SectionHeading } from '@/components/dashboard/states'
import { requireUser } from '@/lib/auth/dal'
import { getPayloadClient } from '@/lib/payload'

export const metadata: Metadata = { title: 'Détail de la demande' }

const STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon',
  submitted: 'Envoyée',
  in_review: 'En cours d’étude',
  quoted: 'Proposition reçue',
  accepted: 'Acceptée',
  declined: 'Refusée',
  closed: 'Close',
}

const BUDGET_LABELS: Record<string, string> = {
  under_2k: 'Moins de 2 000 $',
  '2k_5k': '2 000 à 5 000 $',
  '5k_15k': '5 000 à 15 000 $',
  over_15k: 'Plus de 15 000 $',
  unknown: 'À déterminer',
}

const shortDate = (value: string | null | undefined): string =>
  value ? new Intl.DateTimeFormat('fr-CA', { dateStyle: 'medium' }).format(new Date(value)) : '—'

/**
 * Détail d'une demande de devis.
 *
 * La lecture se fait avec les droits réels de la personne : un identifiant
 * appartenant à quelqu'un d'autre aboutit à un 404, sans distinction avec un
 * identifiant inexistant.
 */
const QuoteDetailPage = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params
  const user = await requireUser()
  const payload = await getPayloadClient()

  const quote = await payload
    .findByID({
      collection: 'quoteRequests',
      id,
      depth: 1,
      overrideAccess: false,
      user: { ...user, collection: 'users' },
    })
    .catch(() => null)

  if (!quote) notFound()

  const service =
    typeof quote.service === 'object' && quote.service
      ? (quote.service as { title?: string }).title
      : null

  // Propositions rattachées à cette demande, brouillons exclus.
  const proposals = await payload.find({
    collection: 'proposals',
    where: {
      and: [
        { quoteRequest: { equals: id } },
        { customer: { equals: user.id } },
        { status: { not_equals: 'draft' } },
      ],
    },
    sort: '-version',
    limit: 20,
    depth: 0,
    overrideAccess: false,
    user: { ...user, collection: 'users' },
  })

  return (
    <div className="space-y-8">
      <div>
        <p className="text-muted-foreground text-sm">
          <Link href="/espace-client/devis" className="underline underline-offset-2">
            Retour à mes demandes
          </Link>
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          {service ?? 'Demande générale'}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {quote.reference} · {STATUS_LABELS[quote.status as string] ?? quote.status} · créée le{' '}
          {shortDate(quote.createdAt)}
        </p>
      </div>

      {quote.status === 'draft' && (
        <div className="border-border bg-muted/30 rounded-lg border p-4">
          <p className="text-sm">
            Cette demande est un brouillon. Elle n’a pas encore été transmise à l’équipe.
          </p>
          <div className="mt-3">
            <SubmitDraftButton quoteId={String(quote.id)} />
          </div>
        </div>
      )}

      <section>
        <SectionHeading title="Votre demande" />
        <dl className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <dt className="text-muted-foreground text-sm">Objectifs et besoins</dt>
            <dd className="mt-1 text-sm whitespace-pre-line">{quote.objectives}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-sm">Budget estimé</dt>
            <dd className="mt-1 text-sm">
              {quote.budgetRange ? (BUDGET_LABELS[quote.budgetRange] ?? '—') : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-sm">Dates souhaitées</dt>
            <dd className="mt-1 text-sm">
              {shortDate(quote.desiredStart)} → {shortDate(quote.desiredDeadline)}
            </dd>
          </div>
        </dl>
      </section>

      {proposals.docs.length > 0 && (
        <section>
          <SectionHeading title="Propositions reçues" />
          <ul className="space-y-2">
            {proposals.docs.map((proposal) => (
              <li
                key={proposal.id}
                className="border-border flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm"
              >
                <span>
                  {proposal.title}
                  <span className="text-muted-foreground ml-2 text-xs">
                    version {proposal.version}
                  </span>
                </span>
                <Link
                  href="/espace-client/propositions"
                  className="underline underline-offset-2"
                >
                  Voir la proposition
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

export default QuoteDetailPage
