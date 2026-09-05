'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { UserText } from '@/lib/content/userText'

import { CommentForm } from './CommentForm'

export type CommentView = {
  id: string
  body: string
  authorName: string
  authorId: string
  createdAt: string
  editedAt: string | null
  replies?: CommentView[]
}

const formatDate = (value: string): string => {
  try {
    return new Intl.DateTimeFormat('fr-CA', { dateStyle: 'long' }).format(new Date(value))
  } catch {
    return ''
  }
}

/**
 * Un commentaire, avec ses réponses.
 *
 * Le corps passe par `UserText`, qui le rend en nœuds React : aucun HTML n'est
 * interprété, donc un contenu piégé s'affiche tel quel au lieu de s'exécuter.
 *
 * Les actions « modifier » et « supprimer » ne sont proposées qu'à l'auteur,
 * mais c'est le serveur qui décide : masquer un bouton n'autorise rien.
 */
export const CommentItem = ({
  comment,
  currentUserId,
  articleId,
  canReply,
  depth = 0,
}: {
  comment: CommentView
  currentUserId: string | null
  articleId: string
  canReply: boolean
  depth?: number
}) => {
  const router = useRouter()
  const [mode, setMode] = useState<'view' | 'edit' | 'reply'>('view')
  const [draft, setDraft] = useState(comment.body)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reported, setReported] = useState(false)

  const isOwner = currentUserId !== null && currentUserId === comment.authorId

  const save = async () => {
    setBusy(true)
    setError(null)
    try {
      const response = await fetch(`/api/comments/${comment.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ body: draft.trim() }),
      })
      if (!response.ok) {
        setError('La modification n’a pas pu être enregistrée.')
        setBusy(false)
        return
      }
      setMode('view')
      setBusy(false)
      router.refresh()
    } catch {
      setError('Service indisponible.')
      setBusy(false)
    }
  }

  const remove = async () => {
    // Confirmation explicite : la suppression est définitive.
    if (!window.confirm('Supprimer définitivement ce commentaire ?')) return
    setBusy(true)
    try {
      const response = await fetch(`/api/comments/${comment.id}`, { method: 'DELETE' })
      if (!response.ok) {
        setError('La suppression a échoué.')
        setBusy(false)
        return
      }
      router.refresh()
    } catch {
      setError('Service indisponible.')
      setBusy(false)
    }
  }

  const report = async () => {
    setBusy(true)
    try {
      await fetch(`/api/comments/${comment.id}/signaler`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ reason: 'offensive' }),
      })
      // Réponse volontairement identique qu'il s'agisse d'un premier
      // signalement ou d'un doublon : rien n'est appris sur la file.
      setReported(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <li id={`commentaire-${comment.id}`} className={depth > 0 ? 'comment comment-reply' : 'comment'}>
      <div className="comment-head">
        <span className="comment-author">{comment.authorName}</span>
        <span className="comment-date">
          {formatDate(comment.createdAt)}
          {comment.editedAt && <span className="comment-edited"> · modifié</span>}
        </span>
      </div>

      {mode === 'edit' ? (
        <div className="comment-edit">
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value.slice(0, 4000))}
            rows={4}
            disabled={busy}
          />
          <div className="comment-form-actions">
            <button type="button" className="comment-link" onClick={() => setMode('view')}>
              Annuler
            </button>
            <button type="button" className="button button-dark" onClick={save} disabled={busy}>
              Enregistrer
            </button>
          </div>
        </div>
      ) : (
        <UserText text={comment.body} className="comment-body" />
      )}

      {error && (
        <p role="alert" className="comment-error">
          {error}
        </p>
      )}

      {mode === 'view' && (
        <div className="comment-actions">
          {canReply && depth === 0 && (
            <button type="button" className="comment-link" onClick={() => setMode('reply')}>
              Répondre
            </button>
          )}
          {isOwner && (
            <>
              <button type="button" className="comment-link" onClick={() => setMode('edit')}>
                Modifier
              </button>
              <button type="button" className="comment-link" onClick={remove} disabled={busy}>
                Supprimer
              </button>
            </>
          )}
          {!isOwner && currentUserId && (
            <button type="button" className="comment-link" onClick={report} disabled={busy || reported}>
              {reported ? 'Signalé' : 'Signaler'}
            </button>
          )}
        </div>
      )}

      {mode === 'reply' && (
        <div className="comment-reply-form">
          <CommentForm
            articleId={articleId}
            parentId={comment.id}
            autoFocus
            placeholder="Votre réponse…"
            submitLabel="Répondre"
            onDone={() => setMode('view')}
          />
        </div>
      )}

      {comment.replies && comment.replies.length > 0 && (
        <ul className="comment-replies">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              currentUserId={currentUserId}
              articleId={articleId}
              canReply={false}
              depth={depth + 1}
            />
          ))}
        </ul>
      )}
    </li>
  )
}
