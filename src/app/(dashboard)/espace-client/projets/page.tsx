import { Building2, CheckCircle2, Circle } from 'lucide-react'
import type { Metadata } from 'next'

import { EmptyState, SectionHeading } from '@/components/dashboard/states'
import { requireUser } from '@/lib/auth/dal'
import { getPayloadClient } from '@/lib/payload'
import { getClientSpaceSettings } from '@/lib/settings'

export const metadata: Metadata = { title: 'Mes projets' }

const STATUS_LABELS: Record<string, string> = {
  planned: 'Planifié',
  active: 'En cours',
  on_hold: 'Suspendu',
  completed: 'Terminé',
  cancelled: 'Annulé',
}

const shortDate = (value: string | null | undefined): string =>
  value ? new Intl.DateTimeFormat('fr-CA', { dateStyle: 'medium' }).format(new Date(value)) : '—'

/**
 * Projets du client.
 *
 * Les notes internes de l'équipe ne sont pas lisibles ici : le champ est en
 * lecture réservée au personnel dans la collection, donc Payload ne le
 * sérialise pas pour un client, quel que soit le `depth` demandé.
 */
const ProjectsPage = async () => {
  const user = await requireUser()
  const payload = await getPayloadClient()
  const settings = await getClientSpaceSettings()

  const projects = await payload.find({
    collection: 'clientProjects',
    where: { customer: { equals: user.id } },
    sort: '-createdAt',
    limit: 50,
    depth: 1,
    overrideAccess: false,
    user: { ...user, collection: 'users' },
  })

  const active = projects.docs.filter((project) =>
    ['planned', 'active', 'on_hold'].includes(project.status as string),
  )
  const done = projects.docs.filter((project) =>
    ['completed', 'cancelled'].includes(project.status as string),
  )

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Mes projets</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Suivi d’avancement de vos prestations.
        </p>
      </div>

      <section>
        <SectionHeading title="En cours" />

        {active.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="Aucun projet en cours"
            description={settings.emptyProjects ?? 'Aucun projet en cours.'}
          />
        ) : (
          <ul className="space-y-4">
            {active.map((project) => {
              const milestones = Array.isArray(project.milestones) ? project.milestones : []
              const updates = Array.isArray(project.updates) ? project.updates : []
              const progress = Math.min(100, Math.max(0, project.progress ?? 0))

              return (
                <li key={project.id} className="border-border bg-card rounded-lg border p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="font-medium">{project.title}</h2>
                      <p className="text-muted-foreground mt-1 text-xs">
                        {STATUS_LABELS[project.status as string] ?? project.status}
                        {project.endDate ? ` · échéance ${shortDate(project.endDate)}` : ''}
                      </p>
                    </div>
                    <span className="text-sm tabular-nums">{progress} %</span>
                  </div>

                  {/* Barre d'avancement : valeur réelle du champ, jamais estimée. */}
                  <div
                    className="bg-muted mt-3 h-1.5 w-full overflow-hidden rounded-full"
                    role="progressbar"
                    aria-valuenow={progress}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`Avancement de ${project.title}`}
                  >
                    <div className="bg-primary h-full" style={{ width: `${progress}%` }} />
                  </div>

                  {project.summary && (
                    <p className="text-muted-foreground mt-3 text-sm">{project.summary}</p>
                  )}

                  {milestones.length > 0 && (
                    <div className="mt-4">
                      <h3 className="mb-2 text-sm font-medium">Jalons</h3>
                      <ul className="space-y-1.5">
                        {milestones.map((milestone, index) => (
                          <li key={index} className="flex items-center gap-2 text-sm">
                            {milestone.done ? (
                              <CheckCircle2 className="size-4 shrink-0" aria-hidden />
                            ) : (
                              <Circle className="text-muted-foreground size-4 shrink-0" aria-hidden />
                            )}
                            <span className={milestone.done ? 'text-muted-foreground' : ''}>
                              {milestone.title}
                            </span>
                            {milestone.dueDate && (
                              <span className="text-muted-foreground ml-auto text-xs">
                                {shortDate(milestone.dueDate)}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {updates.length > 0 && (
                    <div className="mt-4">
                      <h3 className="mb-2 text-sm font-medium">Dernières mises à jour</h3>
                      <ul className="space-y-3">
                        {updates.slice(-3).reverse().map((update, index) => (
                          <li key={index} className="border-border border-l-2 pl-3">
                            <p className="text-sm font-medium">{update.title}</p>
                            {update.body && (
                              <p className="text-muted-foreground mt-0.5 text-sm whitespace-pre-line">
                                {update.body}
                              </p>
                            )}
                            <p className="text-muted-foreground mt-1 text-xs">
                              {shortDate(update.publishedAt)}
                            </p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {done.length > 0 && (
        <section>
          <SectionHeading title="Terminés" />
          <ul className="space-y-2">
            {done.map((project) => (
              <li
                key={project.id}
                className="border-border flex flex-wrap items-center justify-between gap-2 border-b py-3 text-sm last:border-0"
              >
                <span>{project.title}</span>
                <span className="text-muted-foreground text-xs">
                  {STATUS_LABELS[project.status as string]} · {shortDate(project.endDate)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

export default ProjectsPage
