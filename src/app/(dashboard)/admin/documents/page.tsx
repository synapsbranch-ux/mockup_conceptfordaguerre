import { Download, FileStack, Plus } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import type { Where } from 'payload'

import { EmptyState, SectionHeading } from '@/components/dashboard/states'
import { Button } from '@/components/ui/button'
import { requireStaff } from '@/lib/auth/dal'
import { getPayloadClient } from '@/lib/payload'

export const metadata: Metadata = { title: 'Documents' }

const CATEGORY_LABELS: Record<string, string> = {
  guide: 'Guide',
  template: 'Modèle',
  report: 'Rapport',
  contract: 'Contrat',
  deliverable: 'Livrable',
  invoice: 'Facture',
  other: 'Autre',
}

const VISIBILITY_LABELS: Record<string, string> = {
  public: 'Publique',
  authenticated: 'Comptes connectés',
  assigned: 'Clients désignés',
}

const shortDate = (value: string | null | undefined): string =>
  value ? new Intl.DateTimeFormat('fr-CA', { dateStyle: 'medium' }).format(new Date(value)) : '—'

/**
 * Vue d'administration des documents.
 *
 * Le téléversement et l'édition restent dans le panneau CMS, qui gère déjà les
 * binaires, les révisions et les relations. Cette page apporte ce que le
 * panneau ne montre pas : la répartition par visibilité et l'usage réel.
 */
const AdminDocumentsPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ visibilite?: string; q?: string }>
}) => {
  await requireStaff()
  const params = await searchParams
  const payload = await getPayloadClient()

  const visibility = (params.visibilite ?? '').trim()
  const search = (params.q ?? '').trim().slice(0, 120)

  const filters: Where[] = []
  if (visibility && visibility in VISIBILITY_LABELS) {
    filters.push({ visibility: { equals: visibility } })
  }
  if (search) filters.push({ title: { like: search } })

  const [documents, recentDownloads, counts] = await Promise.all([
    payload.find({
      collection: 'documents',
      where: filters.length > 0 ? { and: filters } : undefined,
      sort: '-createdAt',
      limit: 100,
      depth: 1,
      overrideAccess: true,
    }),
    payload.find({
      collection: 'downloadEvents',
      sort: '-createdAt',
      limit: 10,
      depth: 1,
      overrideAccess: true,
    }),
    Promise.all(
      Object.keys(VISIBILITY_LABELS).map(async (value) => ({
        value,
        total: (
          await payload.count({
            collection: 'documents',
            where: { visibility: { equals: value } },
            overrideAccess: true,
          })
        ).totalDocs,
      })),
    ),
  ])

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Documents</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Ressources publiques et documents privés. Le téléversement se fait dans le CMS.
          </p>
        </div>
        <Button asChild>
          <Link href="/cms/collections/documents/create">
            <Plus className="mr-1.5 size-4" aria-hidden />
            Téléverser un document
          </Link>
        </Button>
      </div>

      {/* Répartition réelle par visibilité — aucun chiffre inventé. */}
      <div className="grid gap-3 sm:grid-cols-3">
        {counts.map((entry) => (
          <Link
            key={entry.value}
            href={`/admin/documents?visibilite=${entry.value}`}
            className="border-border bg-card hover:bg-muted/40 rounded-lg border p-4 transition"
          >
            <span className="text-muted-foreground text-sm">
              {VISIBILITY_LABELS[entry.value]}
            </span>
            <span className="mt-1 block text-2xl font-semibold tabular-nums">{entry.total}</span>
          </Link>
        ))}
      </div>

      <form method="get" className="flex flex-wrap items-end gap-3">
        <div className="min-w-56 flex-1">
          <label htmlFor="q" className="mb-1 block text-sm font-medium">
            Rechercher
          </label>
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={search}
            className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="visibilite" className="mb-1 block text-sm font-medium">
            Visibilité
          </label>
          <select
            id="visibilite"
            name="visibilite"
            defaultValue={visibility}
            className="border-input bg-background rounded-md border px-3 py-2 text-sm"
          >
            <option value="">Toutes</option>
            {Object.entries(VISIBILITY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium"
        >
          Filtrer
        </button>
      </form>

      <section>
        <SectionHeading title={`${documents.totalDocs} document${documents.totalDocs > 1 ? 's' : ''}`} />

        {documents.docs.length === 0 ? (
          <EmptyState
            icon={FileStack}
            title="Aucun document"
            description="Aucun document ne correspond à ces critères."
          />
        ) : (
          <div className="border-border overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-4 py-2 font-medium">Titre</th>
                  <th className="px-4 py-2 font-medium">Catégorie</th>
                  <th className="px-4 py-2 font-medium">Visibilité</th>
                  <th className="px-4 py-2 font-medium">Clients</th>
                  <th className="px-4 py-2 text-right font-medium">Téléch.</th>
                  <th className="px-4 py-2 font-medium">Ajouté</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody>
                {documents.docs.map((document) => {
                  const assigned = Array.isArray(document.assignedTo)
                    ? document.assignedTo.length
                    : 0
                  return (
                    <tr key={document.id} className="border-border border-t">
                      <td className="px-4 py-2">
                        <Link
                          href={`/cms/collections/documents/${document.id}`}
                          className="font-medium underline-offset-2 hover:underline"
                        >
                          {document.title}
                        </Link>
                        {document.archived && (
                          <span className="text-muted-foreground ml-2 text-xs">archivé</span>
                        )}
                      </td>
                      <td className="text-muted-foreground px-4 py-2">
                        {CATEGORY_LABELS[document.category as string] ?? document.category}
                      </td>
                      <td className="text-muted-foreground px-4 py-2">
                        {VISIBILITY_LABELS[document.visibility as string] ?? document.visibility}
                      </td>
                      <td className="text-muted-foreground px-4 py-2">
                        {document.visibility === 'assigned' ? assigned : '—'}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums">
                        {document.downloadCount ?? 0}
                      </td>
                      <td className="text-muted-foreground px-4 py-2">
                        {shortDate(document.createdAt)}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <a
                          href={`/api/documents/${document.id}/telecharger`}
                          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                          aria-label={`Télécharger ${document.title}`}
                        >
                          <Download className="size-4" aria-hidden />
                        </a>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {recentDownloads.docs.length > 0 && (
        <section>
          <SectionHeading title="Téléchargements récents" />
          <ul className="text-sm">
            {recentDownloads.docs.map((event) => {
              const who =
                typeof event.user === 'object' && event.user
                  ? ((event.user as { name?: string; email?: string }).name ??
                    (event.user as { email?: string }).email)
                  : 'Visiteur anonyme'
              return (
                <li
                  key={event.id}
                  className="border-border flex flex-wrap items-center justify-between gap-2 border-b py-2 last:border-0"
                >
                  <span className="truncate">{event.documentTitle}</span>
                  <span className="text-muted-foreground text-xs">
                    {who} · {shortDate(event.createdAt)}
                  </span>
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </div>
  )
}

export default AdminDocumentsPage
