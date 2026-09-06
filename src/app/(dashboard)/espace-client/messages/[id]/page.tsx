import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { ReplyForm } from '@/components/messaging/ReplyForm'
import { requireUser } from '@/lib/auth/dal'
import { UserText } from '@/lib/content/userText'
import { getPayloadClient } from '@/lib/payload'

export const metadata: Metadata = { title: 'Conversation' }

const stamp = (value: string | null | undefined): string =>
  value ? new Intl.DateTimeFormat('fr-CA', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : ''

/**
 * Fil d'une conversation.
 *
 * La propriété est vérifiée avant toute lecture de message : Payload ne sachant
 * pas exprimer la jointure dans une clause d'accès, la conversation est chargée
 * d'abord, puis les messages avec `overrideAccess` — jamais l'inverse.
 *
 * Les notes internes vivent dans une collection séparée, que ce fichier
 * n'importe pas.
 */
const ConversationPage = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params
  const user = await requireUser()
  const payload = await getPayloadClient()

  const conversation = await payload
    .findByID({
      collection: 'conversations',
      id,
      depth: 0,
      overrideAccess: false,
      user: { ...user, collection: 'users' },
    })
    .catch(() => null)

  if (!conversation) notFound()

  // Propriété confirmée : la lecture des messages peut se faire.
  const messages = await payload.find({
    collection: 'messages',
    where: { conversation: { equals: id } },
    sort: 'createdAt',
    limit: 200,
    depth: 0,
    overrideAccess: true,
  })

  // Les messages sont vus : le compteur du client retombe à zéro.
  if ((conversation.unreadForCustomer ?? 0) > 0) {
    await payload
      .update({
        collection: 'conversations',
        id,
        data: { unreadForCustomer: 0 },
        overrideAccess: true,
        context: { disableRevalidate: true },
      })
      .catch(() => {})
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-muted-foreground text-sm">
          <Link href="/espace-client/messages" className="underline underline-offset-2">
            Retour à mes messages
          </Link>
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">{conversation.subject}</h1>
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
                {fromStaff ? 'Équipe' : 'Vous'} · {stamp(message.createdAt)}
              </p>
              {/* Rendu en noeuds React : aucun HTML n'est interprete. */}
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

export default ConversationPage
