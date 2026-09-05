import type { Metadata } from 'next'
import Link from 'next/link'

import { CommentModerationActions } from '@/components/dashboard/ModerationActions'
import type { CommentStatus } from '@/components/dashboard/ModerationActions'
import { EmptyState, SectionHeading } from '@/components/dashboard/states'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { requireStaff } from '@/lib/auth/dal'
import { getPayloadClient } from '@/lib/payload'
import type { Article, User } from '@/payload-types'

export const metadata: Metadata = { title: 'Commentaires' }

type SearchParams = Promise<Record<string, string | string[] | undefined>>

const first = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value

const STATUSES: { value: string; label: string }[] = [
  { value: 'pending', label: 'En attente' },
  { value: 'published', label: 'Publiés' },
  { value: 'hidden', label: 'Masqués' },
  { value: 'spam', label: 'Indésirables' },
  { value: 'all', label: 'Tous' },
]

const STATUS_LABEL: Record<string, string> = {
  published: 'Publié',
  pending: 'En attente',
  hidden: 'Masqué',
  spam: 'Indésirable',
}

const authorLabel = (author: unknown): string => {
  if (author && typeof author === 'object') {
    const user = author as Partial<User>
    const full = [user.firstName, user.lastName].filter(Boolean).join(' ').trim()
    return full || user.name || user.email || 'Membre'
  }
  return 'Membre'
}

const dateLabel = (value: string): string =>
  new Intl.DateTimeFormat('fr-CA', { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(value),
  )

/**
 * File de modération des commentaires.
 *
 * Par défaut, elle montre ce qui attend réellement une décision. Le filtre est
 * porté par l'URL, donc l'état de la vue est partageable et rechargeable.
 */
const AdminCommentsPage = async ({ searchParams }: { searchParams: SearchParams }) => {
  await requireStaff('/admin/commentaires')

  const params = await searchParams
  const status = first(params.statut) ?? 'pending'
  const payload = await getPayloadClient()

  const { docs, totalDocs } = await payload.find({
    collection: 'articleComments',
    where: status === 'all' ? {} : { status: { equals: status } },
    limit: 50,
    depth: 1,
    sort: '-createdAt',
    overrideAccess: true,
  })

  return (
    <div className="space-y-8">
      <SectionHeading
        title="Commentaires"
        description="Publier, masquer, restaurer ou marquer comme indésirable. Chaque action est journalisée."
      />

      <nav className="flex flex-wrap gap-2" aria-label="Filtrer par statut">
        {STATUSES.map((option) => (
          <Link
            key={option.value}
            href={`/admin/commentaires?statut=${option.value}`}
            className={
              option.value === status
                ? 'bg-primary text-primary-foreground rounded-md px-3 py-1.5 text-sm'
                : 'border-border hover:border-ring rounded-md border px-3 py-1.5 text-sm transition-colors'
            }
            aria-current={option.value === status ? 'page' : undefined}
          >
            {option.label}
          </Link>
        ))}
      </nav>

      {docs.length > 0 ? (
        <div className="space-y-4">
          <p className="text-muted-foreground text-sm">
            {totalDocs} commentaire{totalDocs > 1 ? 's' : ''}
          </p>
          {docs.map((comment) => {
            const article =
              typeof comment.article === 'object' && comment.article !== null
                ? (comment.article as Article)
                : null
            return (
              <Card key={comment.id}>
                <CardContent className="space-y-3 pt-6">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-sm font-medium">{authorLabel(comment.author)}</span>
                    <Badge variant={comment.status === 'published' ? 'default' : 'secondary'}>
                      {STATUS_LABEL[comment.status] ?? comment.status}
                    </Badge>
                    {(comment.reportCount ?? 0) > 0 && (
                      <Badge variant="destructive">
                        {comment.reportCount} signalement{(comment.reportCount ?? 0) > 1 ? 's' : ''}
                      </Badge>
                    )}
                    <span className="text-muted-foreground ml-auto text-xs">
                      {dateLabel(comment.createdAt)}
                    </span>
                  </div>

                  {/* Texte brut : aucun balisage n'est interprété ici non plus. */}
                  <p className="text-sm whitespace-pre-line">{comment.body}</p>

                  {article && (
                    <p className="text-muted-foreground text-xs">
                      Sur{' '}
                      <Link href={`/blog/${article.slug}`} className="underline" target="_blank">
                        {article.title}
                      </Link>
                    </p>
                  )}

                  <CommentModerationActions
                    commentId={String(comment.id)}
                    status={comment.status as CommentStatus}
                  />
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <EmptyState
          title={
            status === 'pending'
              ? 'Aucun commentaire en attente'
              : 'Aucun commentaire dans cette vue'
          }
          description="Les commentaires apparaîtront ici dès qu’il y en aura."
        />
      )}
    </div>
  )
}

export default AdminCommentsPage
