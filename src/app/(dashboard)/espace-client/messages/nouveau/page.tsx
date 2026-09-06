import type { Metadata } from 'next'
import Link from 'next/link'

import { NewConversationForm } from '@/components/messaging/NewConversationForm'
import { requireUser } from '@/lib/auth/dal'

export const metadata: Metadata = { title: 'Nouvelle conversation' }

const NewConversationPage = async () => {
  await requireUser()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Nouvelle conversation</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          <Link href="/espace-client/messages" className="underline underline-offset-2">
            Retour à mes messages
          </Link>
        </p>
      </div>

      <NewConversationForm />
    </div>
  )
}

export default NewConversationPage
