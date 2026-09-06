import { Building2 } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'

import { EmptyState, SectionHeading } from '@/components/dashboard/states'
import { Button } from '@/components/ui/button'
import { requireStaff } from '@/lib/auth/dal'
import { getPayloadClient } from '@/lib/payload'

export const metadata: Metadata = { title: 'Projets clients' }

const STATUS_LABELS: Record<string, string> = {
  planned: 'Planifié',
  active: 'En cours',
  on_hold: 'Suspendu',
  completed: 'Terminé',
  cancelled: 'Annulé',
}

const shortDate = (value: string | null | undefined): string =>
  value ? new Intl.DateTimeFormat('fr-CA', { dateStyle: 'medium' }).format(new Date(value)) : '—'

/** Projets clients. Distincts des réalisations publiques du portfolio. */
const AdminProjectsPage = async () => {
  await requireStaff()
  const payload = await getPayloadClient()

  const [projects, active] = await Promise.all([
    payload.find({
      collection: 'clientProjects',
      sort: '-createdAt',
      limit: 100,
      depth: 1,
      overrideAccess: true,
    }),
    payload.count({
      collection: 'clientProjects',
      where: { status: { in: ['planned', 'active'] } },
      overrideAccess: true,
    }),
  ])

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Projets clients</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {active.totalDocs} projet{active.totalDocs > 1 ? 's' : ''} actif
            {active.totalDocs > 1 ? 's' : ''}. Distincts des réalisations publiques.
          </p>
        </div>
        <Button asChild>
          <Link href="/cms/collections/clientProjects/create">Nouveau projet</Link>
        </Button>
      </div>

      <section>
        <SectionHeading title={`${projects.totalDocs} projet${projects.totalDocs > 1 ? 's' : ''}`} />

        {projects.docs.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="Aucun projet"
            description="Un projet naît d’une proposition acceptée, ou d’une création manuelle."
          />
        ) : (
          <div className="border-border overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-4 py-2 font-medium">Intitulé</th>
                  <th className="px-4 py-2 font-medium">Client</th>
                  <th className="px-4 py-2 font-medium">Statut</th>
                  <th className="px-4 py-2 text-right font-medium">Avancement</th>
                  <th className="px-4 py-2 font-medium">Échéance</th>
                  <th className="px-4 py-2 font-medium">Origine</th>
                </tr>
              </thead>
              <tbody>
                {projects.docs.map((project) => {
                  const customer =
                    typeof project.customer === 'object' && project.customer
                      ? ((project.customer as { name?: string; email?: string }).name ??
                        (project.customer as { email?: string }).email)
                      : '—'
                  return (
                    <tr key={project.id} className="border-border border-t">
                      <td className="px-4 py-2">
                        <Link
                          href={`/cms/collections/clientProjects/${project.id}`}
                          className="font-medium underline-offset-2 hover:underline"
                        >
                          {project.title}
                        </Link>
                      </td>
                      <td className="text-muted-foreground px-4 py-2">{customer}</td>
                      <td className="px-4 py-2">
                        {STATUS_LABELS[project.status as string] ?? project.status}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums">
                        {project.progress ?? 0} %
                      </td>
                      <td className="text-muted-foreground px-4 py-2">
                        {shortDate(project.endDate)}
                      </td>
                      <td className="text-muted-foreground px-4 py-2 text-xs">
                        {project.sourceProposal ? 'Proposition acceptée' : 'Création manuelle'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

export default AdminProjectsPage
