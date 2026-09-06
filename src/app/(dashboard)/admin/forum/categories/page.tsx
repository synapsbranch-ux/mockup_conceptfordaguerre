import { ExternalLink, Plus } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'

import { EmptyState, SectionHeading } from '@/components/dashboard/states'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { requireStaff } from '@/lib/auth/dal'
import { getPayloadClient } from '@/lib/payload'

export const metadata: Metadata = { title: 'Catégories du forum' }

/**
 * Catégories du forum.
 *
 * L'édition passe par le panneau CMS plutôt que par un formulaire réécrit ici.
 * Payload fournit déjà la création, la modification, la validation et le
 * versionnement de ces documents : les redoubler produirait une seconde
 * implémentation à maintenir, moins complète et sûre de diverger.
 *
 * Cette page apporte ce que le CMS ne montre pas : le nombre réel de
 * discussions par catégorie, pour décider quoi réorganiser ou archiver.
 */
const AdminForumCategoriesPage = async () => {
  await requireStaff('/admin/forum/categories')
  const payload = await getPayloadClient()

  const { docs } = await payload.find({
    collection: 'forumCategories',
    limit: 100,
    depth: 0,
    sort: 'order',
    overrideAccess: true,
  })

  // Comptage réel par catégorie, discussions publiées uniquement.
  const counts = await Promise.all(
    docs.map(async (category) => {
      const result = await payload
        .count({
          collection: 'forumTopics',
          where: {
            and: [{ category: { equals: category.id } }, { status: { equals: 'published' } }],
          },
          overrideAccess: true,
        })
        .catch(() => ({ totalDocs: 0 }))
      return { id: String(category.id), total: result.totalDocs }
    }),
  )

  const countOf = (id: string): number => counts.find((entry) => entry.id === id)?.total ?? 0

  return (
    <div className="space-y-8">
      <SectionHeading
        title="Catégories du forum"
        description="L’ordre détermine l’affichage dans le fil public. Archiver retire une catégorie sans perdre ses discussions."
        action={
          <Button asChild size="sm">
            <Link href="/cms/collections/forumCategories/create" target="_blank">
              <Plus aria-hidden="true" />
              Nouvelle catégorie
            </Link>
          </Button>
        }
      />

      {docs.length > 0 ? (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Ordre</TableHead>
                <TableHead>Nom</TableHead>
                <TableHead>Discussions</TableHead>
                <TableHead>État</TableHead>
                <TableHead className="text-right">Modifier</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {docs.map((category) => (
                <TableRow key={category.id}>
                  <TableCell className="text-muted-foreground tabular-nums">
                    {category.order ?? '—'}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{category.title}</div>
                    {category.description && (
                      <div className="text-muted-foreground line-clamp-1 text-xs">
                        {category.description}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="tabular-nums">{countOf(String(category.id))}</TableCell>
                  <TableCell>
                    {category.archived ? (
                      <Badge variant="secondary">Archivée</Badge>
                    ) : (
                      <Badge>Active</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild size="sm" variant="ghost">
                      <Link
                        href={`/cms/collections/forumCategories/${category.id}`}
                        target="_blank"
                      >
                        <ExternalLink aria-hidden="true" />
                        Ouvrir
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <EmptyState
          title="Aucune catégorie"
          description="Le forum a besoin d’au moins une catégorie pour accepter des discussions."
          actionLabel="Créer une catégorie"
          actionHref="/cms/collections/forumCategories/create"
        />
      )}
    </div>
  )
}

export default AdminForumCategoriesPage
