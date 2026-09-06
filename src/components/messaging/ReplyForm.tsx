'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'

/**
 * Réponse dans une conversation.
 * `authorSide` n'est pas envoyé : le serveur le déduit du rôle en session, pour
 * qu'un client ne puisse pas publier un message se présentant comme l'équipe.
 */
export const ReplyForm = ({ conversationId }: { conversationId: string }) => {
  const router = useRouter()
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const send = async () => {
    if (body.trim().length === 0) return

    setBusy(true)
    setError(null)

    try {
      const response = await fetch('/api/messages', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ conversation: conversationId, body: body.trim() }),
      })
      const payload = await response.json()

      if (!response.ok || !payload.ok) {
        setError(payload.message ?? 'Le message n’a pas pu être envoyé.')
        return
      }

      setBody('')
      router.refresh()
    } catch {
      setError('Le message n’a pas pu être envoyé.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault()
        void send()
      }}
    >
      <label htmlFor="reply" className="sr-only">
        Votre message
      </label>
      <textarea
        id="reply"
        value={body}
        onChange={(event) => setBody(event.target.value)}
        rows={4}
        maxLength={10000}
        required
        placeholder="Votre message…"
        className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
      />

      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}

      <Button type="submit" disabled={busy || body.trim().length === 0}>
        {busy && <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />}
        Envoyer
      </Button>
    </form>
  )
}
