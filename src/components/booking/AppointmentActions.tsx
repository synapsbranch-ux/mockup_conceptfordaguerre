'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'

/**
 * Report et annulation, côté client.
 *
 * Ces boutons ne décident de rien : le serveur revalide la propriété, la
 * transition de statut et la disponibilité du nouveau créneau. Masquer un
 * bouton n'est pas une autorisation.
 */
export const AppointmentActions = ({
  appointmentId,
  meetingTypeSlug,
}: {
  appointmentId: string
  meetingTypeSlug: string
}) => {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const cancel = async () => {
    setBusy(true)
    setError(null)

    try {
      const response = await fetch(`/api/rendez-vous/${appointmentId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'cancel' }),
      })
      const payload = await response.json()

      if (!response.ok || !payload.ok) {
        setError(payload.message ?? 'L’annulation n’a pas abouti.')
        return
      }

      // L'état réel de l'envoi est rapporté sans embellissement.
      if (payload.data.email !== 'sent') {
        setNotice('Rendez-vous annulé. Le courriel de confirmation n’a pas pu être envoyé.')
      }

      setConfirming(false)
      router.refresh()
    } catch {
      setError('L’annulation n’a pas abouti.')
    } finally {
      setBusy(false)
    }
  }

  if (notice) {
    return <p className="text-muted-foreground max-w-xs text-xs">{notice}</p>
  }

  return (
    <div className="flex flex-col items-end gap-2">
      {confirming ? (
        <div className="border-border bg-muted/40 rounded-md border p-3">
          <p className="text-sm">Annuler ce rendez-vous ?</p>
          <div className="mt-2 flex gap-2">
            <Button size="sm" variant="destructive" onClick={cancel} disabled={busy}>
              {busy && <Loader2 className="mr-1.5 size-3 animate-spin" aria-hidden />}
              Confirmer l’annulation
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirming(false)} disabled={busy}>
              Revenir
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          {meetingTypeSlug && (
            <Button size="sm" variant="outline" asChild>
              <a
                href={`/espace-client/rendez-vous/reserver?type=${encodeURIComponent(meetingTypeSlug)}&reporter=${appointmentId}`}
              >
                Reporter
              </a>
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => setConfirming(true)}>
            Annuler
          </Button>
        </div>
      )}

      {error && (
        <p role="alert" className="text-destructive text-xs">
          {error}
        </p>
      )}
    </div>
  )
}
