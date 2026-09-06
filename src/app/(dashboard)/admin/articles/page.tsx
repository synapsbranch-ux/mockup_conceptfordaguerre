import { Newspaper, Plus } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'

import { EmptyState, SectionHeading } from '@/components/dashboard/states'
import { Button } from '@/components/ui/button'
import { requireStaff } from '@/lib/auth/dal'
import { getPayloadClient } from '@/lib/payload'

export const metadata: Metadata = { title: 'Articles' }

const VISIBILITY_LABELS: Record<string, string> = {
  public: 'Publique',
  authenticated: 'Comptes connectés',
  private: 'Clients désignés',
}

const shortDate = (value: string | null | undefined): string =>
  value ? new Intl.DateTimeFormat('fr-CA', { dateStyle: 'medium' }).format(new Date(value)) : '—'

/** Articles, avec visibilité et activité de commentaires. */
const AdminArticlesPage = async () => {
  await requireStaff()
  const payload = await getPayloadClient()

  const articles = await payload.find({
    collection: 'articles',
    sort: '-publishedAt',
    limit: 100,
    depth: 0,
    overrideAccess: true,
    draft: true,
  })

  // Nombre réel de commentaires par article.
  const commentCounts = await Promise.all(
    articles.docs.map(async (article) => ({
      id: String(article.id),
      total: (
        await payload.count({
          collection: 'articleComments',
          where: { article: { equals: article.id } },
          overrideAccess: true,
        })
      ).totalDocs,
    })),
  )
  const byArticle = new Map(commentCounts.map((entry) => [entry.id, entry.total]))

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Articles</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Visibilité et commentaires. L’édition se fait dans le CMS.
          </p>
        </div>
        <Button asChild>
          <Link href="/cms/collections/articles/create">
            <Plus className="mr-1.5 size-4" aria-hidden />
            Nouvel article
          </Link>
        </Button>
      </div>

      <section>
        <SectionHeading title={`${articles.totalDocs} article${articles.totalDocs > 1 ? 's' : ''}`} />

        {articles.docs.length === 0 ? (
          <EmptyState icon={Newspaper} title="Aucun article" description="Aucun article publié." />
        ) : (
          <div className="border-border overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-4 py-2 font-medium">Titre</th>
                  <th className="px-4 py-2 font-medium">Visibilité</th>
                  <th className="px-4 py-2 font-medium">État</th>
                  <th className="px-4 py-2 font-medium">Commentaires</th>
                  <th className="px-4 py-2 text-right font-medium">Total</th>
                  <th className="px-4 py-2 font-medium">Publié</th>
                </tr>
              </thead>
              <tbody>
                {articles.docs.map((article) => (
                  <tr key={article.id} className="border-border border-t">
                    <td className="px-4 py-2">
                      <Link
                        href={`/cms/collections/articles/${article.id}`}
                        className="font-medium underline-offset-2 hover:underline"
                      >
                        {article.title}
                      </Link>
                    </td>
                    <td className="text-muted-foreground px-4 py-2">
                      {VISIBILITY_LABELS[article.visibility as string] ?? 'Publique'}
                    </td>
                    <td className="px-4 py-2">
                      {article._status === 'published' ? 'Publié' : 'Brouillon'}
                    </td>
                    <td className="text-muted-foreground px-4 py-2">
                      {article.commentsEnabled === false ? 'Fermés' : 'Ouverts'}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {byArticle.get(String(article.id)) ?? 0}
                    </td>
                    <td className="text-muted-foreground px-4 py-2">
                      {shortDate(article.publishedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

export default AdminArticlesPage
