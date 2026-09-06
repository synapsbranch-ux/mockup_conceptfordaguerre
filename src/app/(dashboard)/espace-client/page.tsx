import {
  Bell,
  Building2,
  CalendarClock,
  FileStack,
  MessageSquare,
  MessagesSquare,
  Newspaper,
  ReceiptText,
  ScrollText,
} from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState, SectionHeading, StatCard } from '@/components/dashboard/states'
import { requireUser } from '@/lib/auth/dal'
import { formatMoney } from '@/lib/commerce/money'
import { getPayloadClient } from '@/lib/payload'
import { customerCounters } from '@/lib/server/counters'

export const metadata: Metadata = { title: 'Tableau de bord' }

/** Format court et stable, indépendant du fuseau du serveur. */
const shortDate = (value: string | null | undefined, timezone: string): string => {
  if (!value) return '—'
  try {
    return new Intl.DateTimeFormat('fr-CA', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: timezone,
    }).format(new Date(value))
  } catch {
    return new Intl.DateTimeFormat('fr-CA', { dateStyle: 'medium' }).format(new Date(value))
  }
}

const dayOnly = (value: string | null | undefined): string =>
  value ? new Intl.DateTimeFormat('fr-CA', { dateStyle: 'medium' }).format(new Date(value)) : '—'

/**
 * Aperçu de l'espace client.
 *
 * Toutes les valeurs affichées viennent de requêtes réelles, filtrées sur le
 * compte en session. Une section sans donnée montre l'état vide administré
 * depuis le CMS — jamais un chiffre de démonstration.
 */
const EspaceClientPage = async () => {
  const user = await requireUser('/espace-client')
  const payload = await getPayloadClient()
  const counters = await customerCounters(user.id)

  const settings = await payload
    .findGlobal({ slug: 'clientSpaceSettings', depth: 0 })
    .catch(() => null)

  const owned = { customer: { equals: user.id } }

  const [proposals, invoices, appointments, notifications, articles, topics, documents] =
    await Promise.all([
      payload.find({
        collection: 'proposals',
        where: { and: [owned, { status: { equals: 'sent' } }] },
        limit: 3,
        depth: 0,
        sort: '-createdAt',
        overrideAccess: true,
      }),
      payload.find({
        collection: 'invoices',
        where: {
          and: [owned, { status: { in: ['sent', 'partially_paid', 'overdue'] } }],
        },
        limit: 3,
        depth: 0,
        sort: 'dueDate',
        overrideAccess: true,
      }),
      payload.find({
        collection: 'appointments',
        where: {
          and: [
            owned,
            { status: { in: ['requested', 'confirmed'] } },
            { startAt: { greater_than: new Date().toISOString() } },
          ],
        },
        limit: 1,
        depth: 1,
        sort: 'startAt',
        overrideAccess: true,
      }),
      payload.find({
        collection: 'notifications',
        where: { recipient: { equals: user.id } },
        limit: 5,
        depth: 0,
        sort: '-createdAt',
        overrideAccess: true,
      }),
      // Articles : les règles d'accès s'appliquent, donc la visibilité est
      // respectée sans filtre supplémentaire ici.
      payload.find({
        collection: 'articles',
        where: { archived: { not_equals: true } },
        limit: 3,
        depth: 0,
        sort: '-publishedAt',
        overrideAccess: false,
        user: user as never,
      }),
      payload.find({
        collection: 'forumTopics',
        where: { status: { equals: 'published' } },
        limit: 3,
        depth: 0,
        sort: '-lastActivityAt',
        overrideAccess: true,
      }),
      payload.find({
        collection: 'documents',
        where: {
          and: [
            { archived: { not_equals: true } },
            {
              or: [
                { visibility: { equals: 'public' } },
                { visibility: { equals: 'authenticated' } },
                {
                  and: [
                    { visibility: { equals: 'assigned' } },
                    { assignedTo: { contains: user.id } },
                  ],
                },
              ],
            },
          ],
        },
        limit: 3,
        depth: 0,
        sort: '-createdAt',
        overrideAccess: true,
      }),
    ])

  const firstName = user.name?.split(' ')[0] || user.email
  const welcome = (settings?.welcomeTitle ?? 'Bonjour {prenom}').replace('{prenom}', firstName)
  const nextAppointment = appointments.docs[0]

  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">{welcome}</h1>
        {settings?.welcomeIntro && (
          <p className="text-muted-foreground max-w-2xl">{settings.welcomeIntro}</p>
        )}
      </header>

      {/* Compteurs : uniquement des valeurs réelles. */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Propositions à décider"
          value={counters.proposalsAwaitingDecision ?? 0}
          icon={ScrollText}
        />
        <StatCard
          label="Factures à régler"
          value={counters.unpaidInvoices ?? 0}
          icon={ReceiptText}
        />
        <StatCard
          label="Messages non lus"
          value={counters.unreadMessages ?? 0}
          icon={MessageSquare}
        />
        <StatCard
          label="Rendez-vous à venir"
          value={counters.upcomingAppointments ?? 0}
          icon={CalendarClock}
        />
      </div>

      {/* Actions rapides */}
      <section className="space-y-4">
        <SectionHeading title={settings?.quickActionsTitle ?? 'Actions rapides'} />
        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/espace-client/articles">
              <Newspaper aria-hidden="true" />
              Parcourir les articles
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/forum">
              <MessagesSquare aria-hidden="true" />
              Forum
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/espace-client/notifications">
              <Bell aria-hidden="true" />
              Notifications
            </Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/espace-client/profil">
              <Building2 aria-hidden="true" />
              Mon profil
            </Link>
          </Button>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Prochain rendez-vous */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Prochain rendez-vous</CardTitle>
          </CardHeader>
          <CardContent>
            {nextAppointment ? (
              <div className="space-y-1">
                <p className="font-medium">
                  {typeof nextAppointment.meetingType === 'object' &&
                  nextAppointment.meetingType !== null
                    ? (nextAppointment.meetingType as { title?: string }).title
                    : 'Rencontre'}
                </p>
                <p className="text-muted-foreground text-sm">
                  {shortDate(
                    nextAppointment.startAt as string,
                    nextAppointment.customerTimezone ?? 'America/Toronto',
                  )}
                </p>
                <p className="text-muted-foreground text-xs">
                  Fuseau : {nextAppointment.customerTimezone}
                </p>
              </div>
            ) : (
              <EmptyState
                icon={CalendarClock}
                title={settings?.emptyAppointments ?? 'Aucun rendez-vous prévu.'}
                className="border-0 py-6"
              />
            )}
          </CardContent>
        </Card>

        {/* Notifications récentes */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Notifications récentes</CardTitle>
            <Button asChild variant="link" className="h-auto p-0 text-xs">
              <Link href="/espace-client/notifications">Tout voir</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {notifications.docs.length > 0 ? (
              <ul className="space-y-3">
                {notifications.docs.map((item) => (
                  <li key={item.id} className="flex items-start gap-3">
                    <Bell
                      className={
                        item.read ? 'text-muted-foreground mt-0.5 size-4' : 'text-primary mt-0.5 size-4'
                      }
                      aria-hidden="true"
                    />
                    <div className="min-w-0 flex-1">
                      {item.link ? (
                        <Link href={item.link} className="text-sm font-medium hover:underline">
                          {item.title}
                        </Link>
                      ) : (
                        <p className="text-sm font-medium">{item.title}</p>
                      )}
                      <p className="text-muted-foreground text-xs">{dayOnly(item.createdAt)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                icon={Bell}
                title={settings?.emptyNotifications ?? 'Aucune notification.'}
                className="border-0 py-6"
              />
            )}
          </CardContent>
        </Card>

        {/* Propositions en attente */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Propositions en attente</CardTitle>
          </CardHeader>
          <CardContent>
            {proposals.docs.length > 0 ? (
              <ul className="divide-border divide-y">
                {proposals.docs.map((proposal) => (
                  <li key={proposal.id} className="flex items-center justify-between gap-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{proposal.title}</p>
                      <p className="text-muted-foreground text-xs">{proposal.reference}</p>
                    </div>
                    <span className="text-sm font-semibold tabular-nums">
                      {formatMoney(proposal.totals?.total ?? 0, proposal.currency ?? 'CAD')}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                icon={ScrollText}
                title={settings?.emptyProposals ?? 'Aucune proposition en attente.'}
                className="border-0 py-6"
              />
            )}
          </CardContent>
        </Card>

        {/* Factures à régler */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Factures à régler</CardTitle>
          </CardHeader>
          <CardContent>
            {invoices.docs.length > 0 ? (
              <ul className="divide-border divide-y">
                {invoices.docs.map((invoice) => (
                  <li key={invoice.id} className="flex items-center justify-between gap-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{invoice.number ?? '—'}</p>
                      <p className="text-muted-foreground text-xs">
                        Échéance {dayOnly(invoice.dueDate)}
                      </p>
                    </div>
                    <span className="text-sm font-semibold tabular-nums">
                      {formatMoney(invoice.totals?.balanceDue ?? 0, invoice.currency ?? 'CAD')}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                icon={ReceiptText}
                title={settings?.emptyInvoices ?? 'Aucune facture.'}
                className="border-0 py-6"
              />
            )}
          </CardContent>
        </Card>

        {/* Nouveaux documents */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Documents disponibles</CardTitle>
          </CardHeader>
          <CardContent>
            {documents.docs.length > 0 ? (
              <ul className="divide-border divide-y">
                {documents.docs.map((document) => (
                  <li key={document.id} className="py-3">
<span className="text-sm font-medium">{document.title}</span>
                    <p className="text-muted-foreground text-xs">{dayOnly(document.createdAt)}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                icon={FileStack}
                title={settings?.emptyDocuments ?? 'Aucun document.'}
                className="border-0 py-6"
              />
            )}
          </CardContent>
        </Card>

        {/* Communauté */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">À lire</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <p className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
                Derniers articles
              </p>
              {articles.docs.length > 0 ? (
                <ul className="space-y-2">
                  {articles.docs.map((article) => (
                    <li key={article.id} className="flex items-start gap-2">
                      <Newspaper className="text-muted-foreground mt-0.5 size-3.5" aria-hidden="true" />
                      <Link
                        href={`/blog/${article.slug}`}
                        className="text-sm hover:underline"
                      >
                        {article.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground text-sm">Aucun article disponible.</p>
              )}
            </div>

            <div>
              <p className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
                Discussions récentes
              </p>
              {topics.docs.length > 0 ? (
                <ul className="space-y-2">
                  {topics.docs.map((topic) => (
                    <li key={topic.id} className="flex items-start gap-2">
                      <MessagesSquare
                        className="text-muted-foreground mt-0.5 size-3.5"
                        aria-hidden="true"
                      />
                      <Link href={`/forum/${topic.slug}`} className="text-sm hover:underline">
                        {topic.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground text-sm">Aucune discussion pour le moment.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default EspaceClientPage
