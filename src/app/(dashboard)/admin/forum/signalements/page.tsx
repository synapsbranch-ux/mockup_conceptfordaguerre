import type { Metadata } from 'next'
import Link from 'next/link'

import { ReportActions } from '@/components/dashboard/ReportActions'
import { EmptyState, SectionHeading } from '@/components/dashboard/states'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { requireStaff } from '@/lib/auth/dal'
import { getPayloadClient } from '@/lib/payload'

export const metadata: Metadata = { title: 'Signalements' }

type SearchParams = Promise<Record<string, string | string[] | undefined>>

const first = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value

const REASONS: Record<string, string> = {
  offensive: 'Contenu offensant',
  spam: 'Indésirable ou publicité',
  off_topic: 'Hors sujet',
  personal_data: 'Données personnelles',
  other: 'Autre',
}

const TARGETS: Record<string, string> = {
  comment: 'Commentaire d’article',
  topic: 'Discussion',
  reply: 'Réponse',
}

const dateLabel = (value: string): string =>
  new Intl.DateTimeFormat('fr-CA', { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(value),
  )

/**
 * File des signalements.
 *
 * Les signalements ne sont lisibles que par le personnel — la règle d'accès de
 * la collection les ferme même à la personne qui les a déposés, pour que la
 * file ne devienne pas un canal de pression entre membres.
 */
const AdminReportsPage = async ({ searchParams }: { searchParams: SearchParams }) => {
  await requireStaff('/admin/forum/signalements')

  const params = await searchParams
  const status = first(params.statut) ?? 'open'
  const payload = await getPayloadClient()

  const { docs, totalDocs } = await payload.find({
    collection: 'forumReports',
    where: status === 'all' ? {} : { status: { equals: status } },
    limit: 50,
    depth: 1,
    sort: '-createdAt',
    overrideAccess: true,
  })

  const filters = [
    { value: 'open', label: 'À examiner' },
    { value: 'upheld', label: 'Retenus' },
    { value: 'dismissed', label: 'Écartés' },
    { value: 'all', label: 'Tous' },
  ]

  return (
    <div className="space-y-8">
      <SectionHeading
        title="Signalements"
        description="Chaque décision est journalisée. Masquer un contenu prévient son auteur."
      />

      <nav className="flex flex-wrap gap-2" aria-label="Filtrer par suite donnée">
        {filters.map((filter) => (
          <Link
            key={filter.value}
            href={`/admin/forum/signalements?statut=${filter.value}`}
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

      {docs.length > 0 ? (
        <div className="space-y-4">
          <p className="text-muted-foreground text-sm">
            {totalDocs} signalement{totalDocs > 1 ? 's' : ''}
          </p>
          {docs.map((report) => (
            <Card key={report.id}>
              <CardContent className="space-y-3 pt-6">
                <div className="flex flex-wrap items-center gap-3">
                  <Badge variant="outline">{TARGETS[report.targetType] ?? report.targetType}</Badge>
                  <Badge variant="destructive">{REASONS[report.reason] ?? report.reason}</Badge>
                  {report.status !== 'open' && (
                    <Badge variant="secondary">
                      {report.status === 'upheld' ? 'Retenu' : 'Écarté'}
                    </Badge>
                  )}
                  <span className="text-muted-foreground ml-auto text-xs">
                    {dateLabel(report.createdAt)}
                  </span>
                </div>

                <blockquote className="border-border text-muted-foreground border-l-2 pl-3 text-sm">
                  {report.targetExcerpt || 'Extrait indisponible.'}
                </blockquote>

                {report.detail && (
                  <p className="text-sm">
                    <span className="text-muted-foreground">Précisions : </span>
                    {report.detail}
                  </p>
                )}

                {report.status === 'open' && <ReportActions reportId={String(report.id)} />}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          title={status === 'open' ? 'Aucun signalement à examiner' : 'Aucun signalement ici'}
          description="Les signalements déposés par les membres apparaîtront dans cette file."
        />
      )}
    </div>
  )
}

export default AdminReportsPage
