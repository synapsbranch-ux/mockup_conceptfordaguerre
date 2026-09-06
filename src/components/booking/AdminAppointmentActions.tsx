'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'

type Status = 'confirmed' | 'completed' | 'cancelled' | 'no_show'

/**
 * Actions d'équipe sur un rendez-vous.
 * Le serveur revérifie la transition et rapporte l'état réel de l'envoi du
 * courriel, qui est affiché sans embellissement.
 */
export const AdminAppointmentActions = ({
  appointmentId,
  status,
}: {
  appointmentId: string
  status: string
}) => {
  const router = useRouter()
  const [busy, setBusy] = useState<Status | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const run = async (next: Status) => {
    setBusy(next)
    setError(null)
    setNotice(null)

    try {
      const response = await fetch(`/api/admin/rendez-vous/${appointmentId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status: next }),
      })
      const payload = await response.json()

      if (!response.ok || !payload.ok) {
        setError(payload.message ?? 'L’action n’a pas abouti.')
        return
      }

      if (payload.data.email && payload.data.email !== 'sent') {
        setNotice(
          payload.data.email === 'not_configured'
            ? 'Statut mis à jour. Courriel non envoyé : l’envoi n’est pas configuré.'
            : 'Statut mis à jour. Le courriel au client n’a pas pu être envoyé.',
        )
      }

      router.refresh()
    } catch {
      setError('L’action n’a pas abouti.')
    } finally {
      setBusy(null)
    }
  }

  const terminal = ['completed', 'cancelled', 'no_show'].includes(status)

  return (
    <div className="flex flex-col items-end gap-2">
      {!terminal && (
        <div className="flex flex-wrap justify-end gap-2">
          {status === 'requested' && (
            <Button size="sm" disabled={busy !== null} onClick={() => void run('confirmed')}>
              {busy === 'confirmed' && <Loader2 className="mr-1 size-3 animate-spin" aria-hidden />}
              Confirmer
            </Button>
          )}
          {status === 'confirmed' && (
            <>
              <Button size="sm" variant="outline" disabled={busy !== null} onClick={() => void run('completed')}>
                Terminé
              </Button>
              <Button size="sm" variant="ghost" disabled={busy !== null} onClick={() => void run('no_show')}>
                Absence
              </Button>
            </>
          )}
          <Button size="sm" variant="ghost" disabled={busy !== null} onClick={() => void run('cancelled')}>
            Annuler
          </Button>
        </div>
      )}

      {notice && <p className="text-muted-foreground max-w-xs text-right text-xs">{notice}</p>}
      {error && (
        <p role="alert" className="text-destructive max-w-xs text-right text-xs">
          {error}
        </p>
      )}
    </div>
  )
}
