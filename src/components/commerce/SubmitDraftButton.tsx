'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'

/**
 * Envoi d'un brouillon de demande de devis.
 * Le serveur revérifie la propriété et que la demande est bien encore un
 * brouillon : ce bouton ne fait que déclencher l'action.
 */
export const SubmitDraftButton = ({ quoteId }: { quoteId: string }) => {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    setBusy(true)
    setError(null)

    try {
      const response = await fetch('/api/devis', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: quoteId, action: 'submit' }),
      })
      const payload = await response.json()

      if (!response.ok || !payload.ok) {
        setError(payload.message ?? 'L’envoi n’a pas abouti.')
        return
      }
      router.refresh()
    } catch {
      setError('L’envoi n’a pas abouti.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <Button onClick={submit} disabled={busy}>
        {busy && <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />}
        Envoyer la demande
      </Button>
      {error && (
        <p role="alert" className="text-destructive mt-2 text-sm">
          {error}
        </p>
      )}
    </div>
  )
}
