'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'

/**
 * Acceptation ou refus d'une proposition.
 *
 * L'acceptation engage : elle passe par une **confirmation explicite** en deux
 * temps, et le serveur exige lui aussi `confirm: true`. Un appel accidentel ou
 * un lien pré-rempli ne peut donc pas engager le client.
 */
export const ProposalDecision = ({
  proposalId,
  total,
}: {
  proposalId: string
  total: string
}) => {
  const router = useRouter()
  const [stage, setStage] = useState<'idle' | 'accept' | 'decline'>('idle')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const decide = async (action: 'accept' | 'decline') => {
    setBusy(true)
    setError(null)

    try {
      const response = await fetch(`/api/propositions/${proposalId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(
          action === 'accept'
            ? { action: 'accept', confirm: true, note: note.trim() || undefined }
            : { action: 'decline', note: note.trim() || undefined },
        ),
      })
      const payload = await response.json()

      if (!response.ok || !payload.ok) {
        setError(payload.message ?? 'La décision n’a pas pu être enregistrée.')
        return
      }

      setStage('idle')
      router.refresh()
    } catch {
      setError('La décision n’a pas pu être enregistrée.')
    } finally {
      setBusy(false)
    }
  }

  if (stage === 'idle') {
    return (
      <div className="flex flex-wrap gap-3">
        <Button onClick={() => setStage('accept')}>Accepter la proposition</Button>
        <Button variant="outline" onClick={() => setStage('decline')}>
          Refuser
        </Button>
      </div>
    )
  }

  return (
    <div className="border-border bg-muted/30 rounded-lg border p-4">
      <h3 className="font-medium">
        {stage === 'accept' ? 'Confirmer l’acceptation' : 'Refuser la proposition'}
      </h3>

      {stage === 'accept' && (
        <p className="text-muted-foreground mt-1 text-sm">
          Vous acceptez cette proposition pour un montant de <strong>{total}</strong>. Un projet
          sera créé à la suite de cette acceptation.
        </p>
      )}

      <label htmlFor="decision-note" className="mt-3 mb-1 block text-sm font-medium">
        Commentaire (facultatif)
      </label>
      <textarea
        id="decision-note"
        value={note}
        onChange={(event) => setNote(event.target.value)}
        rows={3}
        maxLength={2000}
        className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
      />

      {error && (
        <p role="alert" className="text-destructive mt-2 text-sm">
          {error}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-3">
        <Button
          onClick={() => void decide(stage)}
          disabled={busy}
          variant={stage === 'accept' ? 'default' : 'destructive'}
        >
          {busy && <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />}
          {stage === 'accept' ? 'Oui, j’accepte' : 'Confirmer le refus'}
        </Button>
        <Button variant="ghost" onClick={() => setStage('idle')} disabled={busy}>
          Revenir
        </Button>
      </div>
    </div>
  )
}
