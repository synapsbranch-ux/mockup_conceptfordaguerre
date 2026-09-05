import {
  CalendarClock,
  FileSignature,
  FolderKanban,
  Inbox,
  Mail,
  MessageSquare,
  MessagesSquare,
  ReceiptText,
  ScrollText,
  ShieldAlert,
  Sparkles,
  Users,
} from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState, SectionHeading, StatCard } from '@/components/dashboard/states'
import { requireStaff } from '@/lib/auth/dal'
import { getPayloadClient } from '@/lib/payload'
import { adminCounters, adminOverview } from '@/lib/server/counters'

export const metadata: Metadata = { title: 'Tableau de bord' }

const dayOnly = (value: string | null | undefined): string =>
  value ? new Intl.DateTimeFormat('fr-CA', { dateStyle: 'medium' }).format(new Date(value)) : '—'

/**
 * Aperçu de l'administration.
 *
 * Ne présente que des compteurs **actionnables** : chacun correspond à une file
 * de travail réelle et mène à l'écran qui permet de la traiter. Aucun indicateur
 * décoratif, aucune projection.
 */
const AdminPage = async () => {
  const user = await requireStaff('/admin')
  const [counters, overview] = await Promise.all([adminCounters(), adminOverview()])
  const payload = await getPayloadClient()

  const [recentAudit, pendingComments, openReports] = await Promise.all([
    payload
      .find({
        collection: 'auditLog',
        limit: 6,
        depth: 0,
        sort: '-createdAt',
        overrideAccess: true,
      })
      .catch(() => ({ docs: [] as { id: string; action: string; actorEmail?: string | null; targetLabel?: string | null; createdAt: string }[] })),
    payload.find({
      collection: 'articleComments',
      where: { status: { equals: 'pending' } },
      limit: 5,
      depth: 0,
      sort: '-createdAt',
      overrideAccess: true,
    }),
    payload.find({
      collection: 'forumReports',
      where: { status: { equals: 'open' } },
      limit: 5,
      depth: 0,
      sort: '-createdAt',
      overrideAccess: true,
    }),
  ])

  /** Files de travail : seules celles qui ont réellement quelque chose à traiter. */
  const queues = [
    {
      label: 'Devis à traiter',
      value: counters.quotesToProcess ?? 0,
      href: '/admin/devis',
      icon: FileSignature,
    },
    {
      label: 'Propositions en attente',
      value: counters.proposalsAwaitingDecision ?? 0,
      href: '/admin/propositions',
      icon: ScrollText,
    },
    {
      label: 'Factures impayées',
      value: counters.unpaidInvoices ?? 0,
      href: '/admin/factures',
      icon: ReceiptText,
    },
    {
      label: 'Rendez-vous à confirmer',
      value: counters.appointmentsToConfirm ?? 0,
      href: '/admin/rendez-vous',
      icon: CalendarClock,
    },
    {
      label: 'Conversations non lues',
      value: counters.adminUnreadConversations ?? 0,
      href: '/admin/conversations',
      icon: MessageSquare,
    },
    {
      label: 'Messages de contact',
      value: counters.newContactMessages ?? 0,
      href: '/admin/contact',
      icon: Inbox,
    },
    {
      label: 'Commentaires à modérer',
      value: counters.commentsToModerate ?? 0,
      href: '/admin/commentaires',
      icon: MessagesSquare,
    },
    {
      label: 'Signalements du forum',
      value: counters.forumReports ?? 0,
      href: '/admin/forum/signalements',
      icon: ShieldAlert,
    },
  ]

  const actionable = queues.filter((queue) => queue.value > 0)

  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">
          Bonjour {user.name?.split(' ')[0] || user.email}
        </h1>
        <p className="text-muted-foreground">
          {actionable.length > 0
            ? `${actionable.length} file${actionable.length > 1 ? 's' : ''} de travail demande${actionable.length > 1 ? 'nt' : ''} votre attention.`
            : 'Rien ne demande votre attention pour le moment.'}
        </p>
      </header>

      {/* Files de travail : seules celles qui ont du contenu. */}
      <section className="space-y-4">
        <SectionHeading
          title="À traiter"
          description="Uniquement les files qui contiennent réellement quelque chose."
        />
        {actionable.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {actionable.map((queue) => (
              <StatCard
                key={queue.href}
                label={queue.label}
                value={queue.value}
                icon={queue.icon}
                href={queue.href}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            title="Aucune action en attente"
            description="Les demandes, propositions, factures et signalements sont tous traités."
          />
        )}
      </section>

      {/* Volumétrie générale */}
      <section className="space-y-4">
        <SectionHeading title="Vue d’ensemble" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard
            label="Clients"
            value={overview.totalCustomers}
            hint={
              overview.newCustomers > 0 ? `dont ${overview.newCustomers} sur 30 jours` : undefined
            }
            icon={Users}
            href="/admin/clients"
          />
          <StatCard
            label="Projets actifs"
            value={counters.activeProjects ?? 0}
            icon={FolderKanban}
            href="/admin/projets"
          />
          <StatCard
            label="Services publiés"
            value={overview.activeServices}
            icon={Sparkles}
            href="/admin/services"
          />
          <StatCard
            label="Abonnés"
            value={overview.activeSubscribers}
            icon={Mail}
            href="/admin/infolettre/abonnes"
          />
          <StatCard
            label="Articles publiés"
            value={overview.publishedArticles}
            icon={ScrollText}
            href="/admin/articles"
          />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Modération en attente */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Commentaires à modérer</CardTitle>
            <Button asChild variant="link" className="h-auto p-0 text-xs">
              <Link href="/admin/commentaires">Tout voir</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {pendingComments.docs.length > 0 ? (
              <ul className="divide-border divide-y">
                {pendingComments.docs.map((comment) => (
                  <li key={comment.id} className="py-3">
                    <p className="line-clamp-2 text-sm">{comment.excerpt}</p>
                    <p className="text-muted-foreground text-xs">{dayOnly(comment.createdAt)}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                title="Aucun commentaire en attente"
                className="border-0 py-6"
              />
            )}
          </CardContent>
        </Card>

        {/* Signalements */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Signalements ouverts</CardTitle>
            <Button asChild variant="link" className="h-auto p-0 text-xs">
              <Link href="/admin/forum/signalements">Tout voir</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {openReports.docs.length > 0 ? (
              <ul className="divide-border divide-y">
                {openReports.docs.map((report) => (
                  <li key={report.id} className="py-3">
                    <p className="line-clamp-2 text-sm">{report.targetExcerpt ?? '—'}</p>
                    <p className="text-muted-foreground text-xs">
                      {report.reason} · {dayOnly(report.createdAt)}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="Aucun signalement ouvert" className="border-0 py-6" />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Journal d'audit */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Activité administrative récente</CardTitle>
          <Button asChild variant="link" className="h-auto p-0 text-xs">
            <Link href="/admin/journal">Journal complet</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {recentAudit.docs.length > 0 ? (
            <ul className="divide-border divide-y">
              {recentAudit.docs.map((entry) => (
                <li key={entry.id} className="flex items-center justify-between gap-4 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm">
                      <span className="font-medium">{entry.action}</span>
                      {entry.targetLabel && (
                        <span className="text-muted-foreground"> — {entry.targetLabel}</span>
                      )}
                    </p>
                    <p className="text-muted-foreground text-xs">{entry.actorEmail ?? 'système'}</p>
                  </div>
                  <span className="text-muted-foreground shrink-0 text-xs">
                    {dayOnly(entry.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              title="Aucune action journalisée"
              description="Les actions sensibles apparaîtront ici dès qu’elles auront lieu."
              className="border-0 py-6"
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default AdminPage
