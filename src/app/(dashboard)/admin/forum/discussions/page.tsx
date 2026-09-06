import type { Metadata } from 'next'
import Link from 'next/link'
import type { Where } from 'payload'

import { EmptyState, SectionHeading } from '@/components/dashboard/states'
import { TopicModerationActions } from '@/components/dashboard/TopicModerationActions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { requireStaff } from '@/lib/auth/dal'
import { getPayloadClient } from '@/lib/payload'
import type { ForumCategory, User } from '@/payload-types'

export const metadata: Metadata = { title: 'Discussions' }

type SearchParams = Promise<Record<string, string | string[] | undefined>>

const first = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value

const authorLabel = (author: unknown): string => {
  if (author && typeof author === 'object') {
    const user = author as Partial<User>
    return user.name || user.email || 'Membre'
  }
  return 'Membre'
}

const dateLabel = (value: string | null | undefined): string =>
  value ? new Intl.DateTimeFormat('fr-CA', { dateStyle: 'medium' }).format(new Date(value)) : '—'

/**
 * Moderation des discussions du forum.
 * Contrairement au fil public, cette vue montre aussi les contenus masques et
 * archives — c'est precisement son role.
 */
const AdminTopicsPage = async ({ searchParams }: { searchParams: SearchParams }) => {
  await requireStaff('/admin/forum/discussions')

  const params = await searchParams
  const status = first(params.statut) ?? 'published'
  const search = first(params.q)?.trim()

  const payload = await getPayloadClient()

  const clauses: Where[] = []
  if (status !== 'all') clauses.push({ status: { equals: status } })
  if (search) clauses.push({ or: [{ title: { like: search } }, { body: { like: search } }] })

  const { docs, totalDocs } = await payload.find({
    collection: 'forumTopics',
    where: clauses.length === 0 ? {} : clauses.length === 1 ? clauses[0] : { and: clauses },
    limit: 50,
    depth: 1,
    sort: '-lastActivityAt',
    overrideAccess: true,
  })

  const filters = [
    { value: 'published', label: 'Publiees' },
    { value: 'hidden', label: 'Masquees' },
    { value: 'archived', label: 'Archivees' },
    { value: 'all', label: 'Toutes' },
  ]

  return (
    <div className="space-y-8">
      <SectionHeading
        title="Discussions"
        description="Epingler, verrouiller, resoudre, masquer. Chaque action est journalisee."
      />

      <div className="flex flex-wrap items-center gap-3">
        <nav className="flex flex-wrap gap-2" aria-label="Filtrer par statut">
          {filters.map((filter) => (
            <Link
              key={filter.value}
              href={`/admin/forum/discussions?statut=${filter.value}`}
              className={
                filter.value === status
                  ? 'bg-primary text-primary-foreground rounded-md px-3 py-1.5 text-sm'
                  : 'border-border hover:border-ring rounded-md border px-3 py-1.5 text-sm transition-colors'
              }
              aria-current={filter.value === status ? 'page' : undefined}
            >
              {filter.label}
            </Link>
          ))}
        </nav>

        <form action="/admin/forum/discussions" className="ml-auto flex gap-2">
          <input type="hidden" name="statut" value={status} />
          <Input name="q" defaultValue={search ?? ''} placeholder="Rechercher…" type="search" className="w-56" />
          <Button type="submit" variant="outline" size="sm">
            Rechercher
          </Button>
        </form>
      </div>

      {docs.length > 0 ? (
        <div className="space-y-4">
          <p className="text-muted-foreground text-sm">
            {totalDocs} discussion{totalDocs > 1 ? 's' : ''}
          </p>
          {docs.map((topic) => {
            const category =
              typeof topic.category === 'object' && topic.category !== null
                ? (topic.category as ForumCategory)
                : null
            return (
              <Card key={topic.id}>
                <CardContent className="space-y-3 pt-6">
                  <div className="flex flex-wrap items-center gap-2">
                    {topic.pinned && <Badge>Epinglee</Badge>}
                    {topic.locked && <Badge variant="secondary">Verrouillee</Badge>}
                    {topic.resolved && <Badge variant="outline">Resolue</Badge>}
                    {topic.status !== 'published' && (
                      <Badge variant="destructive">
                        {topic.status === 'hidden' ? 'Masquee' : 'Archivee'}
                      </Badge>
                    )}
                    {category && <Badge variant="secondary">{category.title}</Badge>}
                    {(topic.reportCount ?? 0) > 0 && (
                      <Badge variant="destructive">{topic.reportCount} signalement(s)</Badge>
                    )}
                    <span className="text-muted-foreground ml-auto text-xs">
                      {dateLabel(topic.lastActivityAt)}
                    </span>
                  </div>

                  <h3 className="font-medium">
                    <Link href={`/forum/${topic.slug}`} target="_blank" className="hover:underline">
                      {topic.title}
                    </Link>
                  </h3>

                  <p className="text-muted-foreground text-xs">
                    {authorLabel(topic.author)} · {topic.replyCount ?? 0} reponse(s) ·{' '}
                    {topic.viewCount ?? 0} vue(s)
                  </p>

                  <TopicModerationActions
                    topicId={String(topic.id)}
                    pinned={Boolean(topic.pinned)}
                    locked={Boolean(topic.locked)}
                    resolved={Boolean(topic.resolved)}
                    status={topic.status}
                  />
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <EmptyState
          title="Aucune discussion dans cette vue"
          description="Les discussions ouvertes par les membres apparaitront ici."
        />
      )}
    </div>
  )
}

export default AdminTopicsPage
