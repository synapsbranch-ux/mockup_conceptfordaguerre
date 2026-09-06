import { Bell } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'

import { NotificationList } from '@/components/dashboard/NotificationList'
import type { NotificationView } from '@/components/dashboard/NotificationList'
import { EmptyState, SectionHeading } from '@/components/dashboard/states'
import { requireUser } from '@/lib/auth/dal'
import { getPayloadClient } from '@/lib/payload'

export const metadata: Metadata = { title: 'Notifications' }

type SearchParams = Promise<Record<string, string | string[] | undefined>>

const PAGE_SIZE = 30

/**
 * Notifications du client.
 *
 * La requete est bornee au destinataire issu de la session : aucune
 * notification d'un autre compte ne peut apparaitre, meme par pagination.
 */
const NotificationsPage = async ({ searchParams }: { searchParams: SearchParams }) => {
  const user = await requireUser('/espace-client/notifications')
  const params = await searchParams
  const raw = Array.isArray(params.page) ? params.page[0] : params.page
  const page = Math.max(1, Number.parseInt(raw ?? '1', 10) || 1)

  const payload = await getPayloadClient()
  const settings = await payload
    .findGlobal({ slug: 'clientSpaceSettings', depth: 0 })
    .catch(() => null)

  const result = await payload.find({
    collection: 'notifications',
    where: { recipient: { equals: user.id } },
    limit: PAGE_SIZE,
    page,
    depth: 0,
    sort: '-createdAt',
    overrideAccess: true,
  })

  const notifications: NotificationView[] = result.docs.map((doc) => ({
    id: String(doc.id),
    title: doc.title,
    body: doc.body ?? null,
    link: doc.link ?? null,
    read: doc.read === true,
    createdAt: doc.createdAt,
  }))

  const hasUnread = notifications.some((notification) => !notification.read)

  return (
    <div className="max-w-3xl space-y-8">
      <SectionHeading
        title="Notifications"
        description="Propositions, factures, rendez-vous, reponses a vos messages."
      />

      {notifications.length > 0 ? (
        <>
          <NotificationList notifications={notifications} hasUnread={hasUnread} />

          {result.totalPages > 1 && (
            <nav className="flex items-center gap-6 text-sm" aria-label="Pagination">
              {page > 1 && (
                <Link href={`/espace-client/notifications?page=${page - 1}`} className="underline">
                  ← Precedent
                </Link>
              )}
              <span className="text-muted-foreground">
                Page {result.page} sur {result.totalPages}
              </span>
              {result.hasNextPage && (
                <Link href={`/espace-client/notifications?page=${page + 1}`} className="underline">
                  Suivant →
                </Link>
              )}
            </nav>
          )}
        </>
      ) : (
        <EmptyState icon={Bell} title={settings?.emptyNotifications ?? 'Aucune notification.'} />
      )}
    </div>
  )
}

export default NotificationsPage
