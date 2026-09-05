import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { ForumReplyForm } from '@/components/forum/ForumReplyForm'
import { ForumTopicActions } from '@/components/forum/ForumTopicActions'
import { SiteShell } from '@/components/site/SiteShell'
import { StructuredData } from '@/components/site/StructuredData'
import { getSessionUser } from '@/lib/auth/dal'
import { UserText } from '@/lib/content/userText'
import { env } from '@/lib/env'
import { getForumTopic, getTopicReplies, recordTopicView } from '@/lib/forum'
import { getPayloadClient } from '@/lib/payload'
import { breadcrumbSchema, buildGraph } from '@/lib/structuredData'
import type { User } from '@/payload-types'

type Params = { params: Promise<{ slug: string }> }

const authorName = (author: unknown): string => {
  if (author && typeof author === 'object') {
    const user = author as Partial<User>
    const full = [user.firstName, user.lastName].filter(Boolean).join(' ').trim()
    return full || user.name || 'Membre'
  }
  return 'Membre'
}

const authorId = (author: unknown): string =>
  author && typeof author === 'object' ? String((author as { id?: string }).id ?? '') : String(author ?? '')

const longDate = (value: string | null | undefined): string =>
  value ? new Intl.DateTimeFormat('fr-CA', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(value)) : ''

export const generateMetadata = async ({ params }: Params): Promise<Metadata> => {
  const { slug } = await params
  const topic = await getForumTopic(slug)
  if (!topic) return { title: 'Discussion introuvable', robots: { index: false, follow: false } }

  const description = topic.body.replace(/\s+/g, ' ').trim().slice(0, 200)

  return {
    title: topic.title,
    description,
    alternates: { canonical: `${env.serverURL}/forum/${topic.slug}` },
    openGraph: {
      title: topic.title,
      description,
      url: `${env.serverURL}/forum/${topic.slug}`,
      type: 'article',
    },
  }
}

/**
 * Page d'une discussion.
 *
 * Lisible sans connexion ; publier exige un compte, vérifié côté serveur par la
 * route d'API et pas seulement par l'absence de formulaire.
 *
 * `getForumTopic` ne retourne que les discussions publiées : une discussion
 * masquée ou archivée donne un 404, sans révéler qu'elle a existé.
 */
const ForumTopicPage = async ({ params }: Params) => {
  const { slug } = await params
  const topic = await getForumTopic(slug)
  if (!topic) notFound()

  const payload = await getPayloadClient()
  const community = await payload
    .findGlobal({ slug: 'communitySettings', depth: 0 })
    .catch(() => null)
  if (community?.forumEnabled === false) notFound()

  const [replies, user] = await Promise.all([getTopicReplies(String(topic.id)), getSessionUser()])

  // Compteur de vues : effet de bord silencieux, jamais bloquant.
  await recordTopicView(String(topic.id), topic.viewCount ?? 0)

  const canPublish = user !== null && !user.suspended && !user.forumBanned
  const isAuthor = user !== null && authorId(topic.author) === user.id
  const category =
    typeof topic.category === 'object' && topic.category !== null ? topic.category : null

  // Un seul niveau : les réponses enfants sont rattachées à leur racine.
  const roots = replies.filter((reply) => !reply.parent)
  const childrenOf = (id: string) =>
    replies.filter(
      (reply) =>
        reply.parent &&
        String(typeof reply.parent === 'object' ? reply.parent.id : reply.parent) === id,
    )

  return (
    <SiteShell>
      <StructuredData
        json={buildGraph([
          {
            '@type': 'DiscussionForumPosting',
            headline: topic.title,
            text: topic.body.slice(0, 500),
            url: `${env.serverURL}/forum/${topic.slug}`,
            datePublished: topic.createdAt,
            dateModified: topic.updatedAt,
            author: { '@type': 'Person', name: authorName(topic.author) },
            interactionStatistic: {
              '@type': 'InteractionCounter',
              interactionType: 'https://schema.org/CommentAction',
              userInteractionCount: topic.replyCount ?? 0,
            },
          },
          breadcrumbSchema([
            { name: 'Accueil', path: '/' },
            { name: community?.forumTitle ?? 'Forum', path: '/forum' },
            { name: topic.title, path: `/forum/${topic.slug}` },
          ]),
        ])}
      />

      <article className="shell forum-topic">
        <Link href="/forum" className="back-link">
          Retour au forum
        </Link>

        <header className="forum-topic-header">
          <div className="forum-badges">
            {topic.pinned && <span className="forum-badge">Épinglée</span>}
            {topic.resolved && <span className="forum-badge forum-badge-ok">Résolue</span>}
            {topic.locked && <span className="forum-badge">Verrouillée</span>}
            {category && <span className="forum-category">{category.title}</span>}
          </div>
          <h1>{topic.title}</h1>
          <p className="forum-topic-meta">
            {authorName(topic.author)} · {longDate(topic.createdAt)}
            {topic.editedAt && <span className="comment-edited"> · modifiée</span>}
          </p>
        </header>

        <UserText text={topic.body} className="forum-topic-body" />

        <ForumTopicActions
          topicId={String(topic.id)}
          reactionCount={topic.reactionCount ?? 0}
          canParticipate={canPublish}
          isAuthor={isAuthor}
          resolved={Boolean(topic.resolved)}
        />

        <section className="forum-replies" aria-labelledby="reponses">
          <h2 id="reponses" className="forum-replies-title">
            {topic.replyCount ?? 0} réponse{(topic.replyCount ?? 0) > 1 ? 's' : ''}
          </h2>

          {roots.length > 0 ? (
            <ul className="forum-reply-list">
              {roots.map((reply) => (
                <li key={reply.id} id={`reponse-${reply.id}`} className="forum-reply">
                  <div className="comment-head">
                    <span className="comment-author">{authorName(reply.author)}</span>
                    <span className="comment-date">
                      {longDate(reply.createdAt)}
                      {reply.editedAt && <span className="comment-edited"> · modifiée</span>}
                    </span>
                    {reply.acceptedAnswer && (
                      <span className="forum-badge forum-badge-ok">Réponse retenue</span>
                    )}
                  </div>
                  <UserText text={reply.body} className="comment-body" />

                  {childrenOf(String(reply.id)).length > 0 && (
                    <ul className="comment-replies">
                      {childrenOf(String(reply.id)).map((child) => (
                        <li key={child.id} id={`reponse-${child.id}`} className="comment comment-reply">
                          <div className="comment-head">
                            <span className="comment-author">{authorName(child.author)}</span>
                            <span className="comment-date">{longDate(child.createdAt)}</span>
                          </div>
                          <UserText text={child.body} className="comment-body" />
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="forum-empty">Aucune réponse pour le moment.</p>
          )}

          {topic.locked ? (
            <p className="forum-cta" role="status">
              Cette discussion est verrouillée : elle n’accepte plus de nouvelle réponse.
            </p>
          ) : canPublish ? (
            <ForumReplyForm topicId={String(topic.id)} />
          ) : user === null ? (
            <p className="forum-cta">
              {community?.forumJoinCta ?? 'Connectez-vous pour participer à la discussion.'}{' '}
              <Link href={`/connexion?next=/forum/${topic.slug}`} className="forum-link">
                Se connecter
              </Link>
            </p>
          ) : (
            <p className="forum-cta" role="status">
              Votre compte ne permet pas de publier pour le moment.
            </p>
          )}
        </section>
      </article>
    </SiteShell>
  )
}

export default ForumTopicPage
