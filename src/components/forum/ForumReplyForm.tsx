'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { FormEvent } from 'react'

/**
 * Formulaire de reponse a une discussion.
 * Ne decide rien : il poste et affiche la reponse du serveur.
 */
export const ForumReplyForm = ({ topicId, parentId }: { topicId: string; parentId?: string }) => {
  const router = useRouter()
  const [value, setValue] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const MAX = 8000

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    const trimmed = value.trim()
    if (trimmed.length < 2) {
      setError('Votre reponse est trop courte.')
      return
    }

    setPending(true)
    try {
      const response = await fetch('/api/forum/replies', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ topicId, body: trimmed, parentId: parentId ?? null }),
      })
      const payload = (await response.json()) as { ok: boolean; code?: string; message?: string }

      if (!response.ok || !payload.ok) {
        setError(
          payload.message ??
            (payload.code === 'locked'
              ? 'Cette discussion est verrouillee.'
              : payload.code === 'rate_limited'
                ? 'Trop de messages envoyes. Patientez quelques minutes.'
                : 'Votre reponse n’a pas pu etre publiee.'),
        )
        setPending(false)
        return
      }

      setValue('')
      setPending(false)
      router.refresh()
    } catch {
      setError('Le service est momentanement indisponible.')
      setPending(false)
    }
  }

  return (
    <form onSubmit={submit} className="comment-form">
      <label className="sr-only" htmlFor={`reply-${parentId ?? topicId}`}>
        Votre reponse
      </label>
      <textarea
        id={`reply-${parentId ?? topicId}`}
        value={value}
        onChange={(event) => setValue(event.target.value.slice(0, MAX))}
        placeholder="Votre reponse…"
        rows={5}
        maxLength={MAX}
        disabled={pending}
        required
      />
      <div className="comment-form-footer">
        <span className="comment-count">{MAX - value.length} caracteres restants</span>
        <div className="comment-form-actions">
          <button className="button button-dark" type="submit" disabled={pending}>
            {pending ? 'Envoi…' : 'Repondre'}
          </button>
        </div>
      </div>
      {error && (
        <p role="alert" className="comment-error">
          {error}
        </p>
      )}
    </form>
  )
}
