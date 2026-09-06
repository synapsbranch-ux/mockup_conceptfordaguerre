'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'

type Service = { id: string; title: string }

/**
 * Formulaire de demande de devis.
 *
 * Deux issues : enregistrer un brouillon, ou envoyer. Le statut n'est pas
 * choisi par ce formulaire — il est déduit côté serveur de l'action demandée.
 *
 * Une clé d'idempotence est générée une seule fois par montage : un double clic
 * ou un renvoi réseau ne crée pas deux demandes.
 */
export const QuoteRequestForm = ({ services }: { services: Service[] }) => {
  const router = useRouter()

  const [service, setService] = useState('')
  const [objectives, setObjectives] = useState('')
  const [budgetRange, setBudgetRange] = useState('')
  const [desiredStart, setDesiredStart] = useState('')
  const [desiredDeadline, setDesiredDeadline] = useState('')

  const [busy, setBusy] = useState<'draft' | 'submit' | null>(null)
  const [error, setError] = useState<string | null>(null)

  /**
   * Cle d'idempotence, stable pour toute la duree du formulaire.
   *
   * Generee a la premiere soumission plutot que pendant le rendu :
   * `randomUUID` est impure, et l'appeler au rendu rompt les garanties du
   * compilateur React. Elle est conservee entre les tentatives, de sorte qu'un
   * renvoi apres erreur reseau ne cree pas une seconde demande.
   */
  const idempotencyKeyRef = useRef<string | null>(null)

  const getIdempotencyKey = (): string => {
    idempotencyKeyRef.current ??=
      globalThis.crypto?.randomUUID?.() ??
      `k-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
    return idempotencyKeyRef.current
  }

  const submit = async (mode: 'draft' | 'submit') => {
    if (objectives.trim().length < 20) {
      setError('Merci de décrire vos objectifs (20 caractères minimum).')
      return
    }

    setBusy(mode)
    setError(null)

    try {
      const response = await fetch('/api/devis', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          service: service || undefined,
          objectives: objectives.trim(),
          budgetRange: budgetRange || undefined,
          desiredStart: desiredStart ? new Date(desiredStart).toISOString() : undefined,
          desiredDeadline: desiredDeadline ? new Date(desiredDeadline).toISOString() : undefined,
          submit: mode === 'submit',
          idempotencyKey: getIdempotencyKey(),
        }),
      })
      const payload = await response.json()

      if (!response.ok || !payload.ok) {
        setError(payload.message ?? 'L’enregistrement n’a pas abouti.')
        return
      }

      router.push(`/espace-client/devis/${payload.data.id}`)
      router.refresh()
    } catch {
      setError('L’enregistrement n’a pas abouti.')
    } finally {
      setBusy(null)
    }
  }

  const field = 'border-input bg-background w-full rounded-md border px-3 py-2 text-sm'

  return (
    <form
      className="max-w-2xl space-y-5"
      onSubmit={(event) => {
        event.preventDefault()
        void submit('submit')
      }}
    >
      <div>
        <label htmlFor="service" className="mb-1 block text-sm font-medium">
          Service souhaité
        </label>
        <select
          id="service"
          value={service}
          onChange={(event) => setService(event.target.value)}
          className={field}
        >
          <option value="">Je ne sais pas encore</option>
          {services.map((item) => (
            <option key={item.id} value={item.id}>
              {item.title}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="objectives" className="mb-1 block text-sm font-medium">
          Objectifs et besoins <span aria-hidden>*</span>
        </label>
        <textarea
          id="objectives"
          value={objectives}
          onChange={(event) => setObjectives(event.target.value)}
          rows={7}
          maxLength={6000}
          required
          aria-describedby="objectives-help"
          className={field}
          placeholder="Ce que vous cherchez à accomplir, le contexte, les contraintes connues."
        />
        <p id="objectives-help" className="text-muted-foreground mt-1 text-xs">
          {objectives.trim().length}/6000 — 20 caractères minimum.
        </p>
      </div>

      <div>
        <label htmlFor="budget" className="mb-1 block text-sm font-medium">
          Budget estimé
        </label>
        <select
          id="budget"
          value={budgetRange}
          onChange={(event) => setBudgetRange(event.target.value)}
          className={field}
        >
          <option value="">Non précisé</option>
          <option value="under_2k">Moins de 2 000 $</option>
          <option value="2k_5k">2 000 à 5 000 $</option>
          <option value="5k_15k">5 000 à 15 000 $</option>
          <option value="over_15k">Plus de 15 000 $</option>
          <option value="unknown">À déterminer ensemble</option>
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="start" className="mb-1 block text-sm font-medium">
            Début souhaité
          </label>
          <input
            id="start"
            type="date"
            value={desiredStart}
            onChange={(event) => setDesiredStart(event.target.value)}
            className={field}
          />
        </div>
        <div>
          <label htmlFor="deadline" className="mb-1 block text-sm font-medium">
            Échéance souhaitée
          </label>
          <input
            id="deadline"
            type="date"
            value={desiredDeadline}
            onChange={(event) => setDesiredDeadline(event.target.value)}
            className={field}
          />
        </div>
      </div>

      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={busy !== null}>
          {busy === 'submit' && <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />}
          Envoyer la demande
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={busy !== null}
          onClick={() => void submit('draft')}
        >
          {busy === 'draft' && <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />}
          Enregistrer un brouillon
        </Button>
      </div>

      <p className="text-muted-foreground text-xs">
        Un brouillon reste modifiable et n’est pas transmis tant que vous ne l’envoyez pas.
      </p>
    </form>
  )
}
