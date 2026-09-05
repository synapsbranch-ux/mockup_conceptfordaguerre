'use client'

import { useState } from 'react'

import { Arrow } from '@/components/site/primitives'

export type NewsletterMessages = {
  success?: string | null
  alreadySubscribed?: string | null
  error?: string | null
  rateLimited?: string | null
}

type Props = {
  fieldLabel?: string | null
  placeholder?: string | null
  buttonLabel?: string | null
  messages?: NewsletterMessages | null
  source?: string | null
  /** Identifiant du champ, pour permettre plusieurs formulaires sur une page. */
  id?: string
}

/** Formulaire d'inscription à l'infolettre (`.newsletter`). */
export const NewsletterForm = ({
  fieldLabel,
  placeholder,
  buttonLabel,
  messages,
  source,
  id = 'newsletter-email',
}: Props) => {
  const [email, setEmail] = useState('')
  const [company, setCompany] = useState('') // pot de miel
  const [note, setNote] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [openedAt] = useState(() => Date.now())

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (pending) return

    if (!email.trim()) {
      setNote('Ajoutez votre adresse courriel.')
      return
    }

    setPending(true)
    try {
      const response = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source, company, elapsed: Date.now() - openedAt }),
      })
      const payload = (await response.json()) as { status?: string }

      if (response.status === 429) {
        setNote(messages?.rateLimited ?? 'Trop de tentatives. Réessayer plus tard.')
      } else if (payload.status === 'already-subscribed') {
        setNote(messages?.alreadySubscribed ?? 'Cette adresse est déjà inscrite.')
      } else if (response.ok) {
        setNote(messages?.success ?? 'Merci — votre inscription est enregistrée.')
        setEmail('')
      } else {
        setNote(messages?.error ?? 'L’inscription n’a pas pu être enregistrée.')
      }
    } catch {
      setNote(messages?.error ?? 'L’inscription n’a pas pu être enregistrée.')
    } finally {
      setPending(false)
    }
  }

  return (
    <>
      <form className="newsletter" onSubmit={submit}>
        <label className="sr-only" htmlFor={id}>
          {fieldLabel ?? 'Adresse courriel'}
        </label>
        <input
          id={id}
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder={placeholder ?? undefined}
          autoComplete="email"
        />
        {/* Pot de miel : invisible et hors du parcours clavier. */}
        <input
          type="text"
          name="company"
          value={company}
          onChange={(event) => setCompany(event.target.value)}
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          className="sr-only"
        />
        <button type="submit" disabled={pending}>
          {buttonLabel ?? 'S’inscrire'} <Arrow />
        </button>
      </form>
      {note && (
        <p className="form-note" role="status">
          {note}
        </p>
      )}
    </>
  )
}
