'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { FormEvent } from 'react'

/**
 * Formulaire de commentaire et de réponse.
 *
 * Le composant n'a aucune autorité : il poste, puis affiche ce que le serveur
 * répond. En particulier, il n'invente pas la publication d'un message retenu
 * en prémodération — la réponse indique `pending`, et le message le dit.
 *
 * Le style reste celui du site public (`globals.css`), Tailwind n'étant chargé
 * que par les tableaux de bord.
 */
export const CommentForm = ({
  articleId,
  parentId,
  onDone,
  autoFocus = false,
  placeholder = 'Votre commentaire…',
  submitLabel = 'Publier',
}: {
  articleId: string
  parentId?: string
  onDone?: () => void
  autoFocus?: boolean
  placeholder?: string
  submitLabel?: string
}) => {
  const router = useRouter()
  const [value, setValue] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const MAX = 4000
  const remaining = MAX - value.length

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setNotice(null)

    const trimmed = value.trim()
    if (trimmed.length < 2) {
      setError('Votre message est trop court.')
      return
    }

    setPending(true)
    try {
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ articleId, body: trimmed, parentId: parentId ?? null }),
      })
      const payload = (await response.json()) as {
        ok: boolean
        code?: string
        message?: string
        data?: { pending?: boolean }
      }

      if (!response.ok || !payload.ok) {
        setError(
          payload.message ??
            (payload.code === 'unauthenticated'
              ? 'Votre session a expiré. Reconnectez-vous.'
              : payload.code === 'rate_limited'
                ? 'Trop de messages envoyés. Patientez quelques minutes.'
                : 'Votre message n’a pas pu être publié.'),
        )
        setPending(false)
        return
      }

      setValue('')
      setPending(false)

      if (payload.data?.pending) {
        // Dire la vérité : le message est enregistré mais pas encore visible.
        setNotice('Votre message est enregistré et sera publié après relecture.')
      } else {
        onDone?.()
        router.refresh()
      }
    } catch {
      setError('Le service est momentanément indisponible. Réessayer dans un instant.')
      setPending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="comment-form">
      <label className="sr-only" htmlFor={`comment-${parentId ?? 'root'}`}>
        {placeholder}
      </label>
      <textarea
        id={`comment-${parentId ?? 'root'}`}
        value={value}
        onChange={(event) => setValue(event.target.value.slice(0, MAX))}
        placeholder={placeholder}
        rows={parentId ? 3 : 5}
        maxLength={MAX}
        autoFocus={autoFocus}
        disabled={pending}
        required
      />

      <div className="comment-form-footer">
        <span className={remaining < 200 ? 'comment-count comment-count-low' : 'comment-count'}>
          {remaining} caractères restants
        </span>
        <div className="comment-form-actions">
          {onDone && (
            <button type="button" className="comment-link" onClick={onDone} disabled={pending}>
              Annuler
            </button>
          )}
          <button className="button button-dark" type="submit" disabled={pending}>
            {pending ? 'Envoi…' : submitLabel}
          </button>
        </div>
      </div>

      {error && (
        <p role="alert" className="comment-error">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="comment-notice">
          {notice}
        </p>
      )}
    </form>
  )
}
