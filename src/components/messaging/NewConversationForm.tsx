'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'

/** Ouverture d'une conversation avec l'équipe. */
export const NewConversationForm = () => {
  const router = useRouter()
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [contextKind, setContextKind] = useState('general')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    if (subject.trim().length < 3 || body.trim().length === 0) {
      setError('Un objet et un message sont nécessaires.')
      return
    }

    setBusy(true)
    setError(null)

    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ subject: subject.trim(), body: body.trim(), contextKind }),
      })
      const payload = await response.json()

      if (!response.ok || !payload.ok) {
        setError(payload.message ?? 'La conversation n’a pas pu être ouverte.')
        return
      }

      router.push(`/espace-client/messages/${payload.data.id}`)
      router.refresh()
    } catch {
      setError('La conversation n’a pas pu être ouverte.')
    } finally {
      setBusy(false)
    }
  }

  const field = 'border-input bg-background w-full rounded-md border px-3 py-2 text-sm'

  return (
    <form
      className="max-w-2xl space-y-4"
      onSubmit={(event) => {
        event.preventDefault()
        void submit()
      }}
    >
      <div>
        <label htmlFor="subject" className="mb-1 block text-sm font-medium">
          Objet
        </label>
        <input
          id="subject"
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
          maxLength={200}
          required
          className={field}
        />
      </div>

      <div>
        <label htmlFor="context" className="mb-1 block text-sm font-medium">
          Sujet concerné
        </label>
        <select
          id="context"
          value={contextKind}
          onChange={(event) => setContextKind(event.target.value)}
          className={field}
        >
          <option value="general">Question générale</option>
          <option value="quote">Une demande de devis</option>
          <option value="service">Un service</option>
          <option value="invoice">Une facture</option>
          <option value="project">Un projet</option>
          <option value="appointment">Un rendez-vous</option>
          <option value="document">Un document</option>
        </select>
      </div>

      <div>
        <label htmlFor="body" className="mb-1 block text-sm font-medium">
          Message
        </label>
        <textarea
          id="body"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          rows={7}
          maxLength={10000}
          required
          className={field}
        />
      </div>

      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}

      <Button type="submit" disabled={busy}>
        {busy && <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />}
        Ouvrir la conversation
      </Button>
    </form>
  )
}
