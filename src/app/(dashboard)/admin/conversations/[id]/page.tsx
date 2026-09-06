import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { ReplyForm } from '@/components/messaging/ReplyForm'
import { requireStaff } from '@/lib/auth/dal'
import { UserText } from '@/lib/content/userText'
import { getPayloadClient } from '@/lib/payload'

export const metadata: Metadata = { title: 'Conversation' }

const stamp = (value: string | null | undefined): string =>
  value ? new Intl.DateTimeFormat('fr-CA', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : ''

/**
 * Fil d'une conversation, côté équipe.
 *
 * Les notes internes sont volontairement absentes de cet écran : elles vivent
 * dans la collection `internalNotes`, consultable depuis le CMS. Les mêler au
 * fil ferait courir le risque qu'un futur composant partagé les rende aussi
 * côté client.
 */
const AdminConversationPage = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params
  await requireStaff()
  const payload = await getPayloadClient()

  const conversation = await payload
    .findByID({ collection: 'conversations', id, depth: 1, overrideAccess: true })
    .catch(() => null)

  if (!conversation) notFound()

  const messages = await payload.find({
    collection: 'messages',
    where: { conversation: { equals: id } },
    sort: 'createdAt',
    limit: 200,
    depth: 0,
    overrideAccess: true,
  })

  if ((conversation.unreadForStaff ?? 0) > 0) {
    await payload
      .update({
        collection: 'conversations',
        id,
        data: { unreadForStaff: 0 },
        overrideAccess: true,
        context: { disableRevalidate: true },
      })
      .catch(() => {})
  }

  const customer =
    typeof conversation.customer === 'object' && conversation.customer
      ? ((conversation.customer as { name?: string; email?: string }).name ??
        (conversation.customer as { email?: string }).email)
      : '—'

  return (
    <div className="space-y-6">
      <div>
        <p className="text-muted-foreground text-sm">
          <Link href="/admin/conversations" className="underline underline-offset-2">
            Retour aux conversations
          </Link>
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">{conversation.subject}</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {customer} ·{' '}
          <Link
            href={`/cms/collections/conversations/${id}`}
            className="underline underline-offset-2"
          >
            Gérer dans le CMS
          </Link>
        </p>
      </div>

      <ul className="space-y-4">
        {messages.docs.map((message) => {
          const fromStaff = message.authorSide === 'staff'
          return (
            <li
              key={message.id}
              className={`rounded-lg border p-4 ${
                fromStaff ? 'border-border bg-muted/40' : 'border-border bg-card'
              }`}
            >
              <p className="text-muted-foreground mb-1 text-xs">
                {fromStaff ? 'Équipe' : customer} · {stamp(message.createdAt)}
              </p>
              <UserText text={String(message.body ?? '')} className="text-sm" />
            </li>
          )
        })}
      </ul>

      {conversation.status !== 'archived' ? (
        <ReplyForm conversationId={id} />
      ) : (
        <p className="text-muted-foreground text-sm">Cette conversation est archivée.</p>
      )}
    </div>
  )
}

export default AdminConversationPage
