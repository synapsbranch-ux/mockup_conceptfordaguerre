import { Download, FileStack, History } from 'lucide-react'
import type { Metadata } from 'next'
import type { Where } from 'payload'

import { EmptyState, SectionHeading } from '@/components/dashboard/states'
import { requireUser } from '@/lib/auth/dal'
import { getPayloadClient } from '@/lib/payload'
import { getClientSpaceSettings } from '@/lib/settings'

export const metadata: Metadata = { title: 'Documents et ressources' }

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
  public: 'Ressource publique',
  authenticated: 'Réservé aux comptes',
  assigned: 'Qui vous est destiné',
}

/** Taille lisible. Les octets bruts n'aident personne. */
const humanSize = (bytes: number | null | undefined): string => {
  if (!bytes || bytes <= 0) return '—'
  const units = ['o', 'ko', 'Mo', 'Go']
  let value = bytes
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit += 1
  }
  return `${value.toFixed(value < 10 && unit > 0 ? 1 : 0)} ${units[unit]}`
}

const shortDate = (value: string | null | undefined): string =>
  value ? new Intl.DateTimeFormat('fr-CA', { dateStyle: 'medium' }).format(new Date(value)) : '—'

/**
 * Centre de documents du client.
 *
 * Les documents sont lus **avec les droits réels de la personne**
 * (`overrideAccess: false`) : la clause `read` de la collection décide seule de
 * ce qui apparaît. Aucun filtrage n'est refait ici, ce qui évite qu'une
 * divergence entre l'affichage et l'autorisation laisse fuiter une ligne.
 */
const DocumentsPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; categorie?: string }>
}) => {
  const user = await requireUser()
  const params = await searchParams
  const payload = await getPayloadClient()
  const settings = await getClientSpaceSettings()

  const search = (params.q ?? '').trim().slice(0, 120)
  const category = (params.categorie ?? '').trim()

  const filters: Where[] = [{ archived: { not_equals: true } }]
  if (search) {
    filters.push({
      or: [{ title: { like: search } }, { description: { like: search } }],
    })
  }
  if (category && category in CATEGORY_LABELS) {
    filters.push({ category: { equals: category } })
  }

  const [documents, downloads] = await Promise.all([
    payload.find({
      collection: 'documents',
      where: filters.length > 1 ? { and: filters } : filters[0],
      sort: '-createdAt',
      limit: 100,
      depth: 0,
      overrideAccess: false,
      user: { ...user, collection: 'users' },
    }),
    payload.find({
      collection: 'downloadEvents',
      where: { user: { equals: user.id } },
      sort: '-createdAt',
      limit: 8,
      depth: 0,
      overrideAccess: true,
    }),
  ])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Documents et ressources</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Ressources publiques et documents qui vous sont destinés.
        </p>
      </div>

      {/* Recherche et filtres — une simple soumission GET, donc fonctionnels
          sans JavaScript et partageables par URL. */}
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
            placeholder="Titre ou description"
            className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="categorie" className="mb-1 block text-sm font-medium">
            Catégorie
          </label>
          <select
            id="categorie"
            name="categorie"
            defaultValue={category}
            className="border-input bg-background rounded-md border px-3 py-2 text-sm"
          >
            <option value="">Toutes</option>
            {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
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
            description={
              search || category
                ? 'Aucun document ne correspond à cette recherche.'
                : (settings.emptyDocuments ?? 'Aucun document ne vous a encore été transmis.')
            }
          />
        ) : (
          <ul className="space-y-2">
            {documents.docs.map((document) => (
              <li
                key={document.id}
                className="border-border bg-card flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{document.title}</p>
                  {document.description && (
                    <p className="text-muted-foreground mt-0.5 line-clamp-2 text-sm">
                      {document.description}
                    </p>
                  )}
                  <p className="text-muted-foreground mt-1 text-xs">
                    {CATEGORY_LABELS[document.category as string] ?? document.category}
                    {' · '}
                    {VISIBILITY_LABELS[document.visibility as string] ?? ''}
                    {' · '}
                    {humanSize(document.filesize)}
                    {' · '}
                    {shortDate(document.createdAt)}
                  </p>
                </div>

                {/* Le téléchargement passe par la route protégée : jamais par
                    l'URL du binaire. */}
                <a
                  href={`/api/documents/${document.id}/telecharger`}
                  className="border-border inline-flex shrink-0 items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium"
                >
                  <Download className="size-4" aria-hidden />
                  Télécharger
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>

      {downloads.docs.length > 0 && (
        <section>
          <SectionHeading title="Téléchargements récents" />
          <ul className="text-sm">
            {downloads.docs.map((event) => (
              <li
                key={event.id}
                className="border-border flex items-center justify-between gap-3 border-b py-2 last:border-0"
              >
                <span className="inline-flex min-w-0 items-center gap-2">
                  <History className="text-muted-foreground size-3.5 shrink-0" aria-hidden />
                  <span className="truncate">{event.documentTitle}</span>
                </span>
                <span className="text-muted-foreground shrink-0 text-xs">
                  {shortDate(event.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

export default DocumentsPage
