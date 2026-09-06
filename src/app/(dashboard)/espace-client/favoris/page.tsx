import { Bookmark } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'

import { FavoriteButton } from '@/components/dashboard/FavoriteButton'
import { EmptyState, SectionHeading } from '@/components/dashboard/states'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { requireUser } from '@/lib/auth/dal'
import { getPayloadClient } from '@/lib/payload'
import type { Article } from '@/payload-types'

export const metadata: Metadata = { title: 'Favoris' }

/**
 * Articles mis en favori.
 *
 * Les favoris sont relus avec `depth: 1`, puis **refiltres** par les regles
 * d'acces : si un article est passe en visibilite restreinte apres avoir ete
 * mis en favori, il cesse d'apparaitre ici. Un favori ne doit pas devenir une
 * porte derobee vers un contenu retire.
 */
const FavorisPage = async () => {
  const user = await requireUser('/espace-client/favoris')
  const payload = await getPayloadClient()

  const favorites = await payload.find({
    collection: 'articleFavorites',
    where: { user: { equals: user.id } },
    limit: 100,
    depth: 0,
    sort: '-createdAt',
    overrideAccess: true,
  })

  const ids = favorites.docs.map((doc) =>
    String(typeof doc.article === 'object' ? doc.article.id : doc.article),
  )

  // Relecture sous les regles d'acces : seuls les articles encore lisibles
  // par cette personne remontent.
  const articles =
    ids.length > 0
      ? await payload.find({
          collection: 'articles',
          where: { id: { in: ids } },
          limit: 100,
          depth: 0,
          overrideAccess: false,
          user: user as never,
        })
      : { docs: [] as Article[] }

  return (
    <div className="space-y-8">
      <SectionHeading
        title="Favoris"
        description="Les articles que vous avez mis de cote."
      />

      {articles.docs.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {articles.docs.map((article) => (
            <Card key={article.id}>
              <CardContent className="space-y-3 pt-6">
                <Badge variant="secondary">{article.category}</Badge>
                <h3 className="text-lg leading-snug font-medium">
                  <Link href={`/blog/${article.slug}`} className="hover:underline">
                    {article.title}
                  </Link>
                </h3>
                <p className="text-muted-foreground line-clamp-2 text-sm">{article.excerpt}</p>
                <FavoriteButton articleId={String(article.id)} initial />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Bookmark}
          title="Aucun favori"
          description="Ajoutez un article a vos favoris pour le retrouver ici."
          actionLabel="Parcourir les articles"
          actionHref="/espace-client/articles"
        />
      )}
    </div>
  )
}

export default FavorisPage
