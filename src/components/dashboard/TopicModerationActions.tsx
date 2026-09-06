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
 * Leviers de moderation d'une discussion.
 *
 * Chaque bascule appelle la route d'administration, qui reverifie le role.
 * Le retrait passe par une confirmation : il previent l'auteur et sort la
 * discussion des pages publiques.
 */
export const TopicModerationActions = ({
  topicId,
  pinned,
  locked,
  resolved,
  status,
}: {
  topicId: string
  pinned: boolean
  locked: boolean
  resolved: boolean
  status: string
}) => {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [confirmHide, setConfirmHide] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const patch = async (data: Record<string, unknown>) => {
    setBusy(true)
    setError(null)
    try {
      const response = await fetch(`/api/admin/forum/topics/${topicId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!response.ok) {
        setError('L’action a echoue.')
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
      <Button size="sm" variant="outline" onClick={() => patch({ pinned: !pinned })} disabled={busy}>
        {pinned ? 'Desepingler' : 'Epingler'}
      </Button>
      <Button size="sm" variant="outline" onClick={() => patch({ locked: !locked })} disabled={busy}>
        {locked ? 'Deverrouiller' : 'Verrouiller'}
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => patch({ resolved: !resolved })}
        disabled={busy}
      >
        {resolved ? 'Marquer non resolue' : 'Marquer resolue'}
      </Button>

      {status === 'published' ? (
        <Button size="sm" variant="destructive" onClick={() => setConfirmHide(true)} disabled={busy}>
          Masquer
        </Button>
      ) : (
        <Button
          size="sm"
          variant="outline"
          onClick={() => patch({ status: 'published' })}
          disabled={busy}
        >
          Restaurer
        </Button>
      )}

      {error && <span className="text-destructive text-xs">{error}</span>}

      <Dialog open={confirmHide} onOpenChange={setConfirmHide}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Masquer cette discussion ?</DialogTitle>
            <DialogDescription>
              Elle disparaitra du forum public et du plan du site, et son auteur en sera informe.
              Rien n’est supprime : les reponses sont conservees et la discussion reste
              restaurable.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmHide(false)} disabled={busy}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={() => patch({ status: 'hidden' })} disabled={busy}>
              Masquer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
