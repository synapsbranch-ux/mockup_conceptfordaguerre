import { Lock, Newspaper } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import type { Where } from 'payload'

import { FavoriteButton } from '@/components/dashboard/FavoriteButton'
import { EmptyState, SectionHeading } from '@/components/dashboard/states'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { requireUser } from '@/lib/auth/dal'
import { getPayloadClient } from '@/lib/payload'

export const metadata: Metadata = { title: 'Articles' }

type SearchParams = Promise<Record<string, string | string[] | undefined>>

const first = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value

const PAGE_SIZE = 12

const dateLabel = (value: string | null | undefined): string =>
  value ? new Intl.DateTimeFormat('fr-CA', { dateStyle: 'medium' }).format(new Date(value)) : ''

/**
 * Bibliothèque d'articles du client.
 *
 * Il n'existe **qu'une seule source d'articles** : la collection `articles`,
 * la même que le blog public. Rien n'est dupliqué pour l'espace client — cette
 * page se distingue seulement par la visibilité qu'elle donne à voir.
 *
 * La requête part avec `overrideAccess: false` et la session : la règle
 * `articleReadAccess` ajoute donc la clause de visibilité. Une personne voit
 * les articles publics, ceux réservés aux comptes, et ceux qui lui sont
 * nommément ouverts. Rien d'autre ne peut remonter, pagination comprise.
 */
const ArticlesPage = async ({ searchParams }: { searchParams: SearchParams }) => {
  const user = await requireUser('/espace-client/articles')
  const params = await searchParams

  const search = first(params.q)?.trim()
  const category = first(params.categorie)
  const tag = first(params.etiquette)
  const page = Math.max(1, Number.parseInt(first(params.page) ?? '1', 10) || 1)

  const payload = await getPayloadClient()

  const clauses: Where[] = [{ archived: { not_equals: true } }]
  if (category) clauses.push({ category: { equals: category } })
  if (tag) clauses.push({ 'tags.label': { equals: tag } })
  if (search) {
    clauses.push({
      or: [{ title: { like: search } }, { excerpt: { like: search } }, { lead: { like: search } }],
    })
  }

  const [result, favorites, allForFacets] = await Promise.all([
    payload.find({
      collection: 'articles',
      where: clauses.length === 1 ? clauses[0] : { and: clauses },
      limit: PAGE_SIZE,
      page,
      depth: 0,
      sort: '-publishedAt',
      overrideAccess: false,
      user: user as never,
    }),
    payload.find({
      collection: 'articleFavorites',
      where: { user: { equals: user.id } },
      limit: 500,
      depth: 0,
      overrideAccess: true,
    }),
    // Facettes calculées sur ce que cette personne peut réellement voir : une
    // catégorie n'existant que sur un article réservé ne doit pas apparaître.
    payload.find({
      collection: 'articles',
      where: { archived: { not_equals: true } },
      limit: 200,
      depth: 0,
      select: { category: true, tags: true },
      overrideAccess: false,
      user: user as never,
    }),
  ])

  const favoriteIds = new Set(
    favorites.docs.map((doc) =>
      String(typeof doc.article === 'object' ? doc.article.id : doc.article),
    ),
  )

  const categories = [...new Set(allForFacets.docs.map((doc) => doc.category).filter(Boolean))]
  const tags = [
    ...new Set(
      allForFacets.docs.flatMap((doc) => (doc.tags ?? []).map((entry) => entry.label)).filter(Boolean),
    ),
  ].slice(0, 20)

  const href = (overrides: Record<string, string | undefined>): string => {
    const next = new URLSearchParams()
    const merged = { q: search, categorie: category, etiquette: tag, ...overrides }
    for (const [key, value] of Object.entries(merged)) if (value) next.set(key, value)
    const query = next.toString()
    return query ? `/espace-client/articles?${query}` : '/espace-client/articles'
  }

  return (
    <div className="space-y-8">
      <SectionHeading
        title="Articles"
        description="Publications ouvertes à tous, réservées aux comptes, ou qui vous sont adressées."
      />

      <form action="/espace-client/articles" className="flex max-w-xl gap-2">
        {category && <input type="hidden" name="categorie" value={category} />}
        {tag && <input type="hidden" name="etiquette" value={tag} />}
        <Input name="q" defaultValue={search ?? ''} placeholder="Rechercher un article…" type="search" />
        <Button type="submit">Rechercher</Button>
      </form>

      {(categories.length > 0 || tags.length > 0) && (
        <div className="space-y-3">
          {categories.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                Catégorie
              </span>
              <Link
                href={href({ categorie: undefined, page: undefined })}
                className={
                  !category
                    ? 'bg-primary text-primary-foreground rounded-md px-2.5 py-1 text-xs'
                    : 'border-border hover:border-ring rounded-md border px-2.5 py-1 text-xs'
                }
              >
                Toutes
              </Link>
              {categories.map((value) => (
                <Link
                  key={value}
                  href={href({ categorie: value, page: undefined })}
                  className={
                    category === value
                      ? 'bg-primary text-primary-foreground rounded-md px-2.5 py-1 text-xs'
                      : 'border-border hover:border-ring rounded-md border px-2.5 py-1 text-xs'
                  }
                >
                  {value}
                </Link>
              ))}
            </div>
          )}

          {tags.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                Étiquette
              </span>
              {tags.map((value) => (
                <Link
                  key={value}
                  href={href({ etiquette: tag === value ? undefined : value, page: undefined })}
                  className={
                    tag === value
                      ? 'bg-primary text-primary-foreground rounded-md px-2.5 py-1 text-xs'
                      : 'border-border hover:border-ring rounded-md border px-2.5 py-1 text-xs'
                  }
                >
                  {value}
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {result.docs.length > 0 ? (
        <>
          <p className="text-muted-foreground text-sm">
            {result.totalDocs} article{result.totalDocs > 1 ? 's' : ''}
          </p>

          <div className="grid gap-4 md:grid-cols-2">
            {result.docs.map((article) => (
              <Card key={article.id}>
                <CardContent className="space-y-3 pt-6">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">{article.category}</Badge>
                    {article.visibility === 'authenticated' && (
                      <Badge variant="outline">
                        <Lock className="mr-1 size-3" aria-hidden="true" />
                        Réservé aux comptes
                      </Badge>
                    )}
                    {article.visibility === 'private' && (
                      <Badge variant="outline">
                        <Lock className="mr-1 size-3" aria-hidden="true" />
                        Qui vous est adressé
                      </Badge>
                    )}
                  </div>

                  <h3 className="text-lg leading-snug font-medium">
                    <Link href={`/blog/${article.slug}`} className="hover:underline">
                      {article.title}
                    </Link>
                  </h3>

                  <p className="text-muted-foreground line-clamp-2 text-sm">{article.excerpt}</p>

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <span className="text-muted-foreground text-xs">
                      {article.publishedLabel || dateLabel(article.publishedAt)}
                    </span>
                    <FavoriteButton
                      articleId={String(article.id)}
                      initial={favoriteIds.has(String(article.id))}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {result.totalPages > 1 && (
            <nav className="flex items-center gap-6 text-sm" aria-label="Pagination">
              {page > 1 && (
                <Link href={href({ page: String(page - 1) })} className="underline">
                  ← Précédent
                </Link>
              )}
              <span className="text-muted-foreground">
                Page {result.page} sur {result.totalPages}
              </span>
              {result.hasNextPage && (
                <Link href={href({ page: String(page + 1) })} className="underline">
                  Suivant →
                </Link>
              )}
            </nav>
          )}
        </>
      ) : (
        <EmptyState
          icon={Newspaper}
          title={search ? `Aucun article ne correspond à « ${search} »` : 'Aucun article disponible'}
          description="Les publications apparaîtront ici dès qu’il y en aura."
        />
      )}
    </div>
  )
}

export default ArticlesPage
