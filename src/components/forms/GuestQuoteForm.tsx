'use client'

import { useRef, useState } from 'react'

type Service = { id: string; title: string }

/**
 * Demande de devis sans compte.
 *
 * Deux signaux anti-robot, combinés côté serveur : un champ leurre qu'une
 * personne ne voit pas, et le délai de remplissage. Le second est mesuré à
 * partir du premier rendu — un automate soumet instantanément.
 */
export const GuestQuoteForm = ({ services }: { services: Service[] }) => {
  const mountedAt = useRef<number | null>(null)
  mountedAt.current ??= Date.now()

  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle')
  const [message, setMessage] = useState<string | null>(null)

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)

    setState('sending')
    setMessage(null)

    try {
      const response = await fetch('/api/public/devis', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: String(form.get('name') ?? ''),
          email: String(form.get('email') ?? ''),
          organisation: String(form.get('organisation') ?? '') || undefined,
          service: String(form.get('service') ?? '') || undefined,
          objectives: String(form.get('objectives') ?? ''),
          budgetRange: String(form.get('budgetRange') ?? '') || undefined,
          consent: form.get('consent') === 'on',
          company: String(form.get('company') ?? ''),
          elapsed: Date.now() - (mountedAt.current ?? Date.now()),
        }),
      })
      const payload = await response.json()

      if (!response.ok || !payload.ok) {
        setState('error')
        setMessage(payload.message ?? 'La demande n’a pas pu être envoyée.')
        return
      }

      setState('done')
    } catch {
      setState('error')
      setMessage('La demande n’a pas pu être envoyée.')
    }
  }

  if (state === 'done') {
    return (
      <div className="form-feedback" role="status">
        <p>
          <strong>Votre demande est bien reçue.</strong>
        </p>
        <p className="muted">
          Vous recevrez une réponse à l’adresse indiquée. En créant un compte avec cette même
          adresse, vous retrouverez la demande dans votre espace client.
        </p>
      </div>
    )
  }

  return (
    <form className="form" onSubmit={submit} noValidate={false}>
      <div className="form-row">
        <div className="field">
          <label htmlFor="q-name">Nom complet *</label>
          <input id="q-name" name="name" required minLength={2} maxLength={160} autoComplete="name" />
        </div>
        <div className="field">
          <label htmlFor="q-email">Courriel *</label>
          <input id="q-email" name="email" type="email" required maxLength={254} autoComplete="email" />
        </div>
      </div>

      <div className="form-row">
        <div className="field">
          <label htmlFor="q-org">Organisation</label>
          <input id="q-org" name="organisation" maxLength={200} autoComplete="organization" />
        </div>
        <div className="field">
          <label htmlFor="q-service">Service souhaité</label>
          <select id="q-service" name="service" defaultValue="">
            <option value="">Je ne sais pas encore</option>
            {services.map((service) => (
              <option key={service.id} value={service.id}>
                {service.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="field">
        <label htmlFor="q-budget">Budget estimé</label>
        <select id="q-budget" name="budgetRange" defaultValue="">
          <option value="">Non précisé</option>
          <option value="under_2k">Moins de 2 000 $</option>
          <option value="2k_5k">2 000 à 5 000 $</option>
          <option value="5k_15k">5 000 à 15 000 $</option>
          <option value="over_15k">Plus de 15 000 $</option>
          <option value="unknown">À déterminer ensemble</option>
        </select>
      </div>

      <div className="field">
        <label htmlFor="q-objectives">Objectifs et besoins *</label>
        <textarea
          id="q-objectives"
          name="objectives"
          rows={7}
          required
          minLength={20}
          maxLength={6000}
          placeholder="Ce que vous cherchez à accomplir, le contexte, les contraintes connues."
        />
      </div>

      {/* Champ leurre. `aria-hidden` et `tabIndex` le retirent du parcours
          clavier et des lecteurs d'écran : seul un automate le remplit. */}
      <div aria-hidden="true" className="honeypot">
        <label htmlFor="q-company">Ne pas remplir</label>
        <input id="q-company" name="company" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="field field-inline">
        <input id="q-consent" name="consent" type="checkbox" required />
        <label htmlFor="q-consent">
          J’accepte que ces informations soient utilisées pour répondre à ma demande. *
        </label>
      </div>

      {message && (
        <p role="alert" className="form-error">
          {message}
        </p>
      )}

      <button type="submit" className="btn btn-primary" disabled={state === 'sending'}>
        {state === 'sending' ? 'Envoi…' : 'Envoyer la demande'}
      </button>
    </form>
  )
}
