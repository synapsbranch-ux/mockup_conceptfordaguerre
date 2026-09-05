'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { FormEvent } from 'react'

/**
 * Formulaire d'ouverture de discussion.
 *
 * Le slug, l'auteur, le statut et les compteurs sont décidés par le serveur :
 * ce formulaire n'envoie que le titre, le corps, la catégorie et les
 * étiquettes.
 */
export const NewTopicForm = ({
  categories,
}: {
  categories: { id: string; title: string }[]
}) => {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    const data = new FormData(event.currentTarget)
    const categoryId = String(data.get('categoryId') ?? '')
    const rawTags = String(data.get('tags') ?? '')
    const tags = rawTags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean)
      .slice(0, 5)

    if (title.trim().length < 5) {
      setError('Le titre doit faire au moins 5 caractères.')
      return
    }
    if (body.trim().length < 2) {
      setError('Le message est trop court.')
      return
    }

    setPending(true)
    try {
      const response = await fetch('/api/forum/topics', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), body: body.trim(), categoryId, tags }),
      })
      const payload = (await response.json()) as {
        ok: boolean
        code?: string
        message?: string
        data?: { slug: string }
      }

      if (!response.ok || !payload.ok || !payload.data) {
        setError(
          payload.message ??
            (payload.code === 'forum_closed'
              ? 'Le forum est actuellement fermé.'
              : payload.code === 'rate_limited'
                ? 'Trop de discussions ouvertes récemment. Patientez un moment.'
                : 'La discussion n’a pas pu être ouverte.'),
        )
        setPending(false)
        return
      }

      router.push(`/forum/${payload.data.slug}`)
      router.refresh()
    } catch {
      setError('Le service est momentanément indisponible.')
      setPending(false)
    }
  }

  return (
    <form onSubmit={submit} className="forum-form contact-form">
      <label>
        Titre
        <input
          name="title"
          value={title}
          onChange={(event) => setTitle(event.target.value.slice(0, 160))}
          maxLength={160}
          required
          disabled={pending}
        />
      </label>

      <label>
        Catégorie
        <select name="categoryId" required disabled={pending} defaultValue={categories[0]?.id}>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.title}
            </option>
          ))}
        </select>
      </label>

      <label>
        Message
        <textarea
          name="body"
          value={body}
          onChange={(event) => setBody(event.target.value.slice(0, 12000))}
          rows={10}
          maxLength={12000}
          required
          disabled={pending}
        />
      </label>

      <label>
        Étiquettes
        <input
          name="tags"
          placeholder="données, tableau de bord (séparées par des virgules)"
          disabled={pending}
        />
      </label>

      {error && (
        <p role="alert" className="comment-error">
          {error}
        </p>
      )}

      <button className="button button-dark" type="submit" disabled={pending}>
        {pending ? 'Publication…' : 'Publier la discussion ↗'}
      </button>
    </form>
  )
}
