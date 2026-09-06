import { MessageSquare } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'

import { EmptyState, SectionHeading } from '@/components/dashboard/states'
import { Button } from '@/components/ui/button'
import { requireUser } from '@/lib/auth/dal'
import { getPayloadClient } from '@/lib/payload'
import { getClientSpaceSettings } from '@/lib/settings'

export const metadata: Metadata = { title: 'Mes messages' }

const CONTEXT_LABELS: Record<string, string> = {
  general: 'Général',
  quote: 'Devis',
  service: 'Service',
  invoice: 'Facture',
  project: 'Projet',
  appointment: 'Rendez-vous',
  document: 'Document',
}

const STATUS_LABELS: Record<string, string> = {
  open: 'Ouverte',
  closed: 'Fermée',
  archived: 'Archivée',
}

const shortDate = (value: string | null | undefined): string =>
  value ? new Intl.DateTimeFormat('fr-CA', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—'

/** Conversations du client. */
const MessagesPage = async () => {
  const user = await requireUser()
  const payload = await getPayloadClient()
  const settings = await getClientSpaceSettings()

  const conversations = await payload.find({
    collection: 'conversations',
    where: { customer: { equals: user.id } },
    sort: '-lastMessageAt',
    limit: 100,
    depth: 0,
    overrideAccess: false,
    user: { ...user, collection: 'users' },
  })

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Mes messages</h1>
          <p className="text-muted-foreground mt-1 text-sm">Vos échanges avec l’équipe.</p>
        </div>
        <Button asChild>
          <Link href="/espace-client/messages/nouveau">Nouvelle conversation</Link>
        </Button>
      </div>

      <section>
        <SectionHeading title={`${conversations.totalDocs} conversation${conversations.totalDocs > 1 ? 's' : ''}`} />

        {conversations.docs.length === 0 ? (
          <EmptyState
            icon={MessageSquare}
            title="Aucune conversation"
            description={settings.emptyMessages ?? 'Aucune conversation en cours.'}
            actionLabel="Nous écrire"
            actionHref="/espace-client/messages/nouveau"
          />
        ) : (
          <ul className="space-y-2">
            {conversations.docs.map((conversation) => {
              const unread = conversation.unreadForCustomer ?? 0
              return (
                <li key={conversation.id}>
                  <Link
                    href={`/espace-client/messages/${conversation.id}`}
                    className="border-border bg-card hover:bg-muted/40 flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4 transition"
                  >
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 font-medium">
                        {conversation.subject}
                        {unread > 0 && (
                          <span className="bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs tabular-nums">
                            {unread}
                          </span>
                        )}
                      </p>
                      <p className="text-muted-foreground mt-0.5 text-xs">
                        {CONTEXT_LABELS[conversation.contextKind as string] ?? ''} ·{' '}
                        {STATUS_LABELS[conversation.status as string] ?? conversation.status}
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

export default MessagesPage
