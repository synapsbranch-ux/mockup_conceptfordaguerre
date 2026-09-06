'use client'

import { Bookmark, BookmarkCheck } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { Button } from '@/components/ui/button'

/**
 * Bascule « favori ».
 * L'etat affiche suit la reponse du serveur, jamais une supposition locale.
 */
export const FavoriteButton = ({
  articleId,
  initial,
}: {
  articleId: string
  initial: boolean
}) => {
  const router = useRouter()
  const [favorite, setFavorite] = useState(initial)
  const [busy, setBusy] = useState(false)

  const toggle = async () => {
    setBusy(true)
    try {
      const response = await fetch('/api/favoris', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ articleId }),
      })
      const payload = (await response.json()) as { ok: boolean; data?: { favorite: boolean } }
      if (payload.ok && payload.data) {
        setFavorite(payload.data.favorite)
        router.refresh()
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <Button
      size="sm"
      variant="ghost"
      onClick={toggle}
      disabled={busy}
      aria-pressed={favorite}
      aria-label={favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
    >
      {favorite ? <BookmarkCheck aria-hidden="true" /> : <Bookmark aria-hidden="true" />}
      {favorite ? 'En favori' : 'Favori'}
    </Button>
  )
}
