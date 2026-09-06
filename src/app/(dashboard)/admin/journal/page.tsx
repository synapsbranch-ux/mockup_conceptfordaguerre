import { ScrollText } from 'lucide-react'
import type { Metadata } from 'next'
import type { Where } from 'payload'

import { EmptyState, SectionHeading } from '@/components/dashboard/states'
import { requireStaff } from '@/lib/auth/dal'
import { getPayloadClient } from '@/lib/payload'

export const metadata: Metadata = { title: 'Journal d’activité' }

const ACTION_LABELS: Record<string, string> = {
  'user.role_changed': 'Rôle modifié',
  'user.suspended': 'Compte suspendu',
  'user.reinstated': 'Compte réactivé',
  'user.forum_banned': 'Forum bloqué',
  'user.forum_unbanned': 'Forum rétabli',
  'comment.moderated': 'Commentaire modéré',
  'comment.deleted': 'Commentaire supprimé',
  'forum.topic_moderated': 'Discussion modérée',
  'forum.reply_moderated': 'Réponse modérée',
  'forum.report_resolved': 'Signalement traité',
  'document.uploaded': 'Document ajouté',
  'document.deleted': 'Document supprimé',
  'quote.updated': 'Devis modifié',
  'proposal.sent': 'Proposition',
  'invoice.issued': 'Facture émise',
  'invoice.cancelled': 'Facture annulée',
  'appointment.confirmed': 'Rendez-vous confirmé',
  'appointment.cancelled': 'Rendez-vous annulé',
}

const stamp = (value: string | null | undefined): string =>
  value ? new Intl.DateTimeFormat('fr-CA', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—'

/**
 * Journal des actions sensibles.
 *
 * En lecture seule : la collection refuse toute mise à jour et toute
 * suppression. Un journal que l'on peut réécrire ne prouve rien.
 */
const AuditPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ action?: string }>
}) => {
  await requireStaff()
  const params = await searchParams
  const payload = await getPayloadClient()

  const action = (params.action ?? '').trim()
  const filters: Where[] = []
  if (action && action in ACTION_LABELS) filters.push({ action: { equals: action } })

  const entries = await payload.find({
    collection: 'auditLog',
    where: filters.length > 0 ? { and: filters } : undefined,
    sort: '-createdAt',
    limit: 200,
    depth: 1,
    overrideAccess: true,
  })

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Journal d’activité</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Actions sensibles, en ajout seul. Aucune adresse IP n’est conservée.
        </p>
      </div>

      <form method="get" className="flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="action" className="mb-1 block text-sm font-medium">
            Type d’action
          </label>
          <select
            id="action"
            name="action"
            defaultValue={action}
            className="border-input bg-background rounded-md border px-3 py-2 text-sm"
          >
            <option value="">Toutes</option>
            {Object.entries(ACTION_LABELS).map(([value, label]) => (
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
        <SectionHeading title={`${entries.totalDocs} entrée${entries.totalDocs > 1 ? 's' : ''}`} />

        {entries.docs.length === 0 ? (
          <EmptyState
            icon={ScrollText}
            title="Aucune entrée"
            description="Aucune action sensible n’a encore été consignée."
          />
        ) : (
          <ul className="text-sm">
            {entries.docs.map((entry) => (
              <li key={entry.id} className="border-border border-b py-3 last:border-0">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-medium">
                    {ACTION_LABELS[entry.action as string] ?? entry.action}
                  </span>
                  <span className="text-muted-foreground text-xs">{stamp(entry.createdAt)}</span>
                </div>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  {entry.actorEmail ?? 'Système'}
                  {entry.targetLabel ? ` → ${entry.targetLabel}` : ''}
                </p>
                {entry.summary && <p className="mt-1 text-sm">{entry.summary}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

export default AuditPage
