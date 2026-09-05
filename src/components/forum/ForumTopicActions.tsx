'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

/**
 * Reactions, suivi et resolution d'une discussion.
 *
 * Chaque action est une bascule cote serveur : l'unicite est garantie par un
 * index compose, donc un double-clic ne cree jamais de doublon. L'etat affiche
 * suit la reponse du serveur plutot qu'une supposition locale.
 */
export const ForumTopicActions = ({
  topicId,
  reactionCount,
  canParticipate,
  isAuthor,
  resolved,
}: {
  topicId: string
  reactionCount: number
  canParticipate: boolean
  isAuthor: boolean
  resolved: boolean
}) => {
  const router = useRouter()
  const [count, setCount] = useState(reactionCount)
  const [reacted, setReacted] = useState(false)
  const [following, setFollowing] = useState<boolean | null>(null)
  const [busy, setBusy] = useState(false)

  if (!canParticipate) {
    return (
      <p className="forum-topic-stats">
        {count} reaction{count > 1 ? 's' : ''}
      </p>
    )
  }

  const react = async () => {
    setBusy(true)
    try {
      const response = await fetch('/api/forum/reactions', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ targetType: 'topic', targetId: topicId, type: 'helpful' }),
      })
      const payload = (await response.json()) as {
        ok: boolean
        data?: { active: boolean; count: number }
      }
      if (payload.ok && payload.data) {
        setReacted(payload.data.active)
        setCount(payload.data.count)
      }
    } finally {
      setBusy(false)
    }
  }

  const follow = async () => {
    setBusy(true)
    try {
      const response = await fetch('/api/forum/subscriptions', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ topicId }),
      })
      const payload = (await response.json()) as { ok: boolean; data?: { following: boolean } }
      if (payload.ok && payload.data) setFollowing(payload.data.following)
    } finally {
      setBusy(false)
    }
  }

  const markResolved = async () => {
    setBusy(true)
    try {
      await fetch(`/api/forum/topics/${topicId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ resolved: !resolved }),
      })
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="forum-topic-actions">
      <button type="button" className="comment-link" onClick={react} disabled={busy}>
        {reacted ? 'Utile ✓' : 'Utile'} ({count})
      </button>
      <button type="button" className="comment-link" onClick={follow} disabled={busy}>
        {following === null ? 'Suivre' : following ? 'Suivi ✓' : 'Suivre'}
      </button>
      {isAuthor && (
        <button type="button" className="comment-link" onClick={markResolved} disabled={busy}>
          {resolved ? 'Marquer comme non resolue' : 'Marquer comme resolue'}
        </button>
      )}
    </div>
  )
}
