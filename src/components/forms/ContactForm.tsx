'use client'

import { useState } from 'react'

import type { ContactFormBlock } from '@/payload-types'

type Status = 'idle' | 'sending' | 'sent' | 'error' | 'rate-limited'

/**
 * Formulaire de contact.
 * La structure des champs et la validation vivent dans le code ; seuls les
 * libellés, sujets et messages viennent du CMS.
 */
export const ContactForm = ({ block }: { block: ContactFormBlock }) => {
  const labels = block.labels
  const [status, setStatus] = useState<Status>('idle')
  const [openedAt] = useState(() => Date.now())

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (status === 'sending') return

    const form = event.currentTarget
    const data = new FormData(form)
    setStatus('sending')

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.get('name'),
          email: data.get('email'),
          organisation: data.get('organisation'),
          subject: data.get('subject'),
          message: data.get('message'),
          consent: data.get('consent') === 'on',
          company: data.get('company'),
          elapsed: Date.now() - openedAt,
        }),
      })

      if (response.status === 429) setStatus('rate-limited')
      else if (response.ok) {
        setStatus('sent')
        form.reset()
      } else setStatus('error')
    } catch {
      setStatus('error')
    }
  }

  return (
    <form className="contact-form" onSubmit={submit}>
      <div className="field-pair">
        <label>
          {labels?.name}
          <input name="name" required placeholder={labels?.namePlaceholder ?? undefined} autoComplete="name" />
        </label>
        <label>
          {labels?.email}
          <input
            type="email"
            name="email"
            required
            placeholder={labels?.emailPlaceholder ?? undefined}
            autoComplete="email"
          />
        </label>
      </div>

      <label>
        {labels?.organisation}
        <input
          name="organisation"
          placeholder={labels?.organisationPlaceholder ?? undefined}
          autoComplete="organization"
        />
      </label>

      <label>
        {labels?.subject}
        <select name="subject" defaultValue="">
          <option value="" disabled>
            {labels?.subjectPlaceholder}
          </option>
          {(block.subjects ?? []).map((subject, index) => (
            <option key={subject.id ?? `s-${index}`}>{subject.label}</option>
          ))}
        </select>
      </label>

      <label>
        {labels?.message}
        <textarea
          name="message"
          required
          rows={6}
          placeholder={labels?.messagePlaceholder ?? undefined}
        />
      </label>

      {/* Pot de miel : invisible et hors du parcours clavier. */}
      <input
        type="text"
        name="company"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="sr-only"
      />

      <label className="checkbox">
        <input type="checkbox" name="consent" required /> <span>{labels?.consent}</span>
      </label>

      <button className="button button-dark" type="submit" disabled={status === 'sending'}>
        {labels?.submit} ↗
      </button>

      {status === 'sent' && (
        <p className="success-message" role="status">
          {block.messages?.success}
        </p>
      )}
      {status === 'error' && (
        <p className="form-note" role="alert">
          {block.messages?.error}
        </p>
      )}
      {status === 'rate-limited' && (
        <p className="form-note" role="alert">
          {block.messages?.rateLimited ?? block.messages?.error}
        </p>
      )}
    </form>
  )
}
