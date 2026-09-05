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

export type CommentStatus = 'published' | 'pending' | 'hidden' | 'spam'

/**
 * Actions de modération d'un commentaire.
 *
 * Les boutons ne portent aucune autorité : chaque appel est revérifié par la
 * route d'administration, qui exige un membre du personnel. Masquer un bouton
 * n'a jamais empêché quiconque d'appeler l'API.
 *
 * Les actions destructrices passent par une confirmation explicite.
 */
export const CommentModerationActions = ({
  commentId,
  status,
}: {
  commentId: string
  status: CommentStatus
}) => {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const moderate = async (next: CommentStatus) => {
    setBusy(true)
    setError(null)
    try {
      const response = await fetch(`/api/admin/comments/${commentId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status: next }),
      })
      if (!response.ok) {
        setError('L’action a échoué.')
        setBusy(false)
        return
      }
      router.refresh()
      setBusy(false)
    } catch {
      setError('Service indisponible.')
      setBusy(false)
    }
  }

  const remove = async () => {
    setBusy(true)
    try {
      const response = await fetch(`/api/comments/${commentId}`, { method: 'DELETE' })
      if (!response.ok) {
        setError('La suppression a échoué.')
        setBusy(false)
        return
      }
      setConfirmDelete(false)
      router.refresh()
      setBusy(false)
    } catch {
      setError('Service indisponible.')
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {status !== 'published' && (
        <Button size="sm" variant="outline" onClick={() => moderate('published')} disabled={busy}>
          Publier
        </Button>
      )}
      {status !== 'hidden' && (
        <Button size="sm" variant="outline" onClick={() => moderate('hidden')} disabled={busy}>
          Masquer
        </Button>
      )}
      {status !== 'spam' && (
        <Button size="sm" variant="outline" onClick={() => moderate('spam')} disabled={busy}>
          Indésirable
        </Button>
      )}
      <Button
        size="sm"
        variant="ghost"
        className="text-destructive"
        onClick={() => setConfirmDelete(true)}
        disabled={busy}
      >
        Supprimer
      </Button>

      {error && <span className="text-destructive text-xs">{error}</span>}

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer définitivement ce commentaire ?</DialogTitle>
            <DialogDescription>
              Cette action est irréversible. Pour retirer le commentaire de la vue publique sans
              le détruire, préférez « Masquer » — le contenu reste alors consultable en modération.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(false)} disabled={busy}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={remove} disabled={busy}>
              Supprimer définitivement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
