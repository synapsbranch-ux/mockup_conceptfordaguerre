'use client'

import { Bell, Check } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type NotificationView = {
  id: string
  title: string
  body: string | null
  link: string | null
  read: boolean
  createdAt: string
}

const dateLabel = (value: string): string =>
  new Intl.DateTimeFormat('fr-CA', { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(value),
  )

/**
 * Liste des notifications, avec marquage comme lue.
 *
 * Le serveur verifie la propriete de chaque notification : l'interface ne fait
 * que refleter sa reponse.
 */
export const NotificationList = ({
  notifications,
  hasUnread,
}: {
  notifications: NotificationView[]
  hasUnread: boolean
}) => {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  const call = async (body: Record<string, unknown>) => {
    setBusy(true)
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      })
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      {hasUnread && (
        <div className="flex justify-end">
          <Button
            size="sm"
            variant="outline"
            onClick={() => call({ action: 'read_all' })}
            disabled={busy}
          >
            <Check aria-hidden="true" />
            Tout marquer comme lu
          </Button>
        </div>
      )}

      <ul className="divide-border divide-y">
        {notifications.map((notification) => (
          <li
            key={notification.id}
            className={cn('flex items-start gap-4 py-4', !notification.read && 'bg-muted/40 -mx-3 px-3')}
          >
            <Bell
              className={cn(
                'mt-0.5 size-4 shrink-0',
                notification.read ? 'text-muted-foreground' : 'text-primary',
              )}
              aria-hidden="true"
            />
            <div className="min-w-0 flex-1">
              {notification.link ? (
                <Link href={notification.link} className="font-medium hover:underline">
                  {notification.title}
                </Link>
              ) : (
                <p className="font-medium">{notification.title}</p>
              )}
              {notification.body && (
                <p className="text-muted-foreground mt-1 text-sm">{notification.body}</p>
              )}
              <p className="text-muted-foreground mt-1 text-xs">{dateLabel(notification.createdAt)}</p>
            </div>
            {!notification.read && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => call({ action: 'read', id: notification.id })}
                disabled={busy}
              >
                Marquer comme lu
              </Button>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
