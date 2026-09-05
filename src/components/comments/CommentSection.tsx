import Link from 'next/link'

import { getSessionUser } from '@/lib/auth/dal'
import { getPayloadClient } from '@/lib/payload'
import type { Article, User } from '@/payload-types'

import { CommentForm } from './CommentForm'
import { CommentItem } from './CommentItem'
import type { CommentView } from './CommentItem'

/**
 * Section commentaires d'un article public.
 *
 * Composant serveur : la lecture est faite ici, avec les règles d'accès de la
 * collection. Un commentaire masqué, indésirable ou en attente n'atteint donc
 * jamais le navigateur — il n'est pas simplement caché en CSS.
 *
 * Le nom affiché est celui enregistré sur le compte ; l'adresse courriel n'est
 * jamais exposée.
 */

const PAGE_SIZE = 50

const displayName = (author: unknown): { id: string; name: string } => {
  if (author && typeof author === 'object') {
    const user = author as Partial<User> & { id?: string }
    const full = [user.firstName, user.lastName].filter(Boolean).join(' ').trim()
    return {
      id: String(user.id ?? ''),
      name: full || user.name || 'Membre',
    }
  }
  return { id: String(author ?? ''), name: 'Membre' }
}

export const CommentSection = async ({ article }: { article: Article }) => {
  // Commentaires fermés : la section disparaît, y compris pour les membres.
  if (article.commentsEnabled === false) return null

  const [user, payload] = await Promise.all([getSessionUser(), getPayloadClient()])

  const settings = await payload
    .findGlobal({ slug: 'communitySettings', depth: 0 })
    .catch(() => null)

  // `overrideAccess: false` : la règle de la collection s'applique. Un visiteur
  // anonyme ne voit que les commentaires publiés ; une personne connectée voit
  // en plus les siens, y compris en attente de relecture.
  const { docs } = await payload.find({
    collection: 'articleComments',
    where: { article: { equals: article.id } },
    limit: PAGE_SIZE,
    depth: 1,
    sort: 'createdAt',
    overrideAccess: false,
    user: (user as never) ?? undefined,
  })

  // Reconstitue l'arborescence à un seul niveau.
  const roots: CommentView[] = []
  const byId = new Map<string, CommentView>()

  for (const doc of docs) {
    if (doc.parent) continue
    const author = displayName(doc.author)
    const view: CommentView = {
      id: String(doc.id),
      body: doc.body,
      authorName: author.name,
      authorId: author.id,
      createdAt: doc.createdAt,
      editedAt: doc.editedAt ?? null,
      replies: [],
    }
    byId.set(view.id, view)
    roots.push(view)
  }

  for (const doc of docs) {
    if (!doc.parent) continue
    const parentId = String(typeof doc.parent === 'object' ? doc.parent.id : doc.parent)
    const parent = byId.get(parentId)
    if (!parent) continue
    const author = displayName(doc.author)
    parent.replies!.push({
      id: String(doc.id),
      body: doc.body,
      authorName: author.name,
      authorId: author.id,
      createdAt: doc.createdAt,
      editedAt: doc.editedAt ?? null,
    })
  }

  const total = roots.reduce((sum, root) => sum + 1 + (root.replies?.length ?? 0), 0)
  const canPublish = user !== null && !user.suspended && !user.forumBanned

  return (
    <section className="comments shell" aria-labelledby="commentaires">
      <h2 id="commentaires" className="comments-title">
        {settings?.commentsIntro ?? 'Commentaires'}
        {total > 0 && <span className="comments-count"> ({total})</span>}
      </h2>

      {user === null && (
        <p className="comments-cta">
          {settings?.commentsSignedOutCta ?? 'Connectez-vous pour laisser un commentaire.'}{' '}
          <Link href={`/connexion?next=/blog/${article.slug}`} className="comment-link">
            Se connecter
          </Link>
        </p>
      )}

      {user !== null && !canPublish && (
        <p className="comments-cta" role="status">
          Votre compte ne permet pas de publier pour le moment.
        </p>
      )}

      {canPublish && <CommentForm articleId={String(article.id)} />}

      {roots.length > 0 ? (
        <ul className="comment-list">
          {roots.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              currentUserId={user?.id ?? null}
              articleId={String(article.id)}
              canReply={canPublish}
            />
          ))}
        </ul>
      ) : (
        <p className="comments-empty">
          {settings?.commentsEmptyState ?? 'Aucun commentaire pour le moment.'}
        </p>
      )}
    </section>
  )
}
