'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

/**
 * Traitement d'un signalement.
 *
 * Deux décisions séparées, parce qu'elles ne sont pas équivalentes : retenir un
 * signalement dit que la plainte était fondée, masquer le contenu applique une
 * sanction. On peut retenir sans masquer, par exemple pour un contenu déjà
 * corrigé par son auteur.
 */
export const ReportActions = ({ reportId }: { reportId: string }) => {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [confirmHide, setConfirmHide] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const resolve = async (status: 'upheld' | 'dismissed', hideTarget = false) => {
    setBusy(true)
    setError(null)
    try {
      const response = await fetch(`/api/admin/forum/reports/${reportId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status, hideTarget }),
      })
      if (!response.ok) {
        setError('L’action a échoué.')
        setBusy(false)
        return
      }
      setConfirmHide(false)
      router.refresh()
      setBusy(false)
    } catch {
      setError('Service indisponible.')
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button size="sm" variant="outline" onClick={() => resolve('dismissed')} disabled={busy}>
        Écarter
      </Button>
      <Button size="sm" variant="outline" onClick={() => resolve('upheld')} disabled={busy}>
        Retenir sans masquer
      </Button>
      <Button size="sm" variant="destructive" onClick={() => setConfirmHide(true)} disabled={busy}>
        Retenir et masquer
      </Button>

      {error && <span className="text-destructive text-xs">{error}</span>}

      <Dialog open={confirmHide} onOpenChange={setConfirmHide}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Retenir le signalement et masquer le contenu ?</DialogTitle>
            <DialogDescription>
              Le contenu disparaîtra des pages publiques et son auteur en sera informé. Rien n’est
              supprimé : le contenu reste consultable en modération et l’action est journalisée.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmHide(false)} disabled={busy}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={() => resolve('upheld', true)} disabled={busy}>
              Masquer le contenu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
