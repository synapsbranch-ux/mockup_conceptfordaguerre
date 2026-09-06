import { MessagesSquare } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import type { Where } from 'payload'

import { EmptyState, SectionHeading } from '@/components/dashboard/states'
import { requireStaff } from '@/lib/auth/dal'
import { getPayloadClient } from '@/lib/payload'

export const metadata: Metadata = { title: 'Conversations' }

const STATUS_LABELS: Record<string, string> = {
  open: 'Ouverte',
  closed: 'Fermée',
  archived: 'Archivée',
}

const shortDate = (value: string | null | undefined): string =>
  value ? new Intl.DateTimeFormat('fr-CA', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—'

/** Toutes les conversations clientes. */
const AdminConversationsPage = async ({
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

  const [conversations, unread] = await Promise.all([
    payload.find({
      collection: 'conversations',
      where: filters.length > 0 ? { and: filters } : undefined,
      sort: '-lastMessageAt',
      limit: 100,
      depth: 1,
      overrideAccess: true,
    }),
    payload.count({
      collection: 'conversations',
      where: { unreadForStaff: { greater_than: 0 } },
      overrideAccess: true,
    }),
  ])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Conversations</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {unread.totalDocs} conversation{unread.totalDocs > 1 ? 's' : ''} avec des messages non
          lus.
        </p>
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
            <option value="">Toutes</option>
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
        <SectionHeading title={`${conversations.totalDocs} conversation${conversations.totalDocs > 1 ? 's' : ''}`} />

        {conversations.docs.length === 0 ? (
          <EmptyState
            icon={MessagesSquare}
            title="Aucune conversation"
            description="Aucune conversation ne correspond à ces critères."
          />
        ) : (
          <ul className="space-y-2">
            {conversations.docs.map((conversation) => {
              const customer =
                typeof conversation.customer === 'object' && conversation.customer
                  ? ((conversation.customer as { name?: string; email?: string }).name ??
                    (conversation.customer as { email?: string }).email)
                  : '—'
              const unreadCount = conversation.unreadForStaff ?? 0
              return (
                <li key={conversation.id}>
                  <Link
                    href={`/admin/conversations/${conversation.id}`}
                    className="border-border bg-card hover:bg-muted/40 flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4 transition"
                  >
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 font-medium">
                        {conversation.subject}
                        {unreadCount > 0 && (
                          <span className="bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs tabular-nums">
                            {unreadCount}
                          </span>
                        )}
                      </p>
                      <p className="text-muted-foreground mt-0.5 text-xs">
                        {customer} · {STATUS_LABELS[conversation.status as string]}
                      </p>
                    </div>
                    <span className="text-muted-foreground shrink-0 text-xs">
                      {shortDate(conversation.lastMessageAt)}
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}

export default AdminConversationsPage
