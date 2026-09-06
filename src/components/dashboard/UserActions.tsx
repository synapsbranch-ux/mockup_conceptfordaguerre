'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'

type Action = 'setRole' | 'suspend' | 'reinstate' | 'banForum' | 'unbanForum'

/**
 * Actions d'administration sur un compte.
 *
 * Ces contrôles ne décident de rien : le serveur revérifie la protection du
 * dernier administrateur et l'interdiction de se modifier soi-même. Ils sont
 * masqués sur son propre compte par confort, pas par sécurité.
 */
export const UserActions = ({
  userId,
  role,
  suspended,
  forumBanned,
  isSelf,
  canPromoteToSuperAdmin,
}: {
  userId: string
  role: string
  suspended: boolean
  forumBanned: boolean
  isSelf: boolean
  canPromoteToSuperAdmin: boolean
}) => {
  const router = useRouter()
  const [busy, setBusy] = useState<Action | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [confirming, setConfirming] = useState<Action | null>(null)

  const run = async (action: Action, extra: Record<string, unknown> = {}) => {
    setBusy(action)
    setError(null)

    try {
      const response = await fetch(`/api/admin/clients/${userId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action, ...extra }),
      })
      const payload = await response.json()

      if (!response.ok || !payload.ok) {
        // Le refus du serveur est affiché tel quel : c'est lui qui porte la
        // règle, et son message explique pourquoi l'action est impossible.
        setError(payload.message ?? 'L’action n’a pas abouti.')
        return
      }

      setConfirming(null)
      router.refresh()
    } catch {
      setError('L’action n’a pas abouti.')
    } finally {
      setBusy(null)
    }
  }

  if (isSelf) {
    return (
      <span className="text-muted-foreground text-xs">
        Votre compte — non modifiable ici
      </span>
    )
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap justify-end gap-2">
        <label htmlFor={`role-${userId}`} className="sr-only">
          Rôle
        </label>
        <select
          id={`role-${userId}`}
          defaultValue={role}
          disabled={busy !== null}
          onChange={(event) => void run('setRole', { role: event.target.value })}
          className="border-input bg-background rounded-md border px-2 py-1 text-xs"
        >
          <option value="customer">Client</option>
          <option value="editor">Administrateur</option>
          {/* Le palier supérieur n'est proposé qu'à un super-administrateur ;
              le serveur le refuse de toute façon aux autres. */}
          {canPromoteToSuperAdmin && <option value="super-admin">Super-administrateur</option>}
        </select>

        {suspended ? (
          <Button size="sm" variant="outline" disabled={busy !== null} onClick={() => void run('reinstate')}>
            {busy === 'reinstate' && <Loader2 className="mr-1 size-3 animate-spin" aria-hidden />}
            Réactiver
          </Button>
        ) : (
          <Button
            size="sm"
            variant="ghost"
            disabled={busy !== null}
            onClick={() => setConfirming('suspend')}
          >
            Suspendre
          </Button>
        )}

        <Button
          size="sm"
          variant="ghost"
          disabled={busy !== null}
          onClick={() => void run(forumBanned ? 'unbanForum' : 'banForum')}
        >
          {forumBanned ? 'Rétablir le forum' : 'Bloquer le forum'}
        </Button>
      </div>

      {confirming === 'suspend' && (
        <div className="border-border bg-muted/40 rounded-md border p-3 text-right">
          <p className="text-sm">Suspendre ce compte ?</p>
          <p className="text-muted-foreground mt-0.5 text-xs">
            L’accès à l’espace client et la publication seront retirés.
          </p>
          <div className="mt-2 flex justify-end gap-2">
            <Button size="sm" variant="destructive" disabled={busy !== null} onClick={() => void run('suspend')}>
              {busy === 'suspend' && <Loader2 className="mr-1 size-3 animate-spin" aria-hidden />}
              Confirmer
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirming(null)}>
              Revenir
            </Button>
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="text-destructive max-w-xs text-right text-xs">
          {error}
        </p>
      )}
    </div>
  )
}
