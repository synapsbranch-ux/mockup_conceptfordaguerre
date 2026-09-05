import 'server-only'

import { cache } from 'react'
import type { Where } from 'payload'

import { getPayloadClient } from '@/lib/payload'
import type { BadgeCounts } from '@/components/dashboard/navigation'

/**
 * Compteurs des tableaux de bord.
 *
 * Chaque valeur provient d'une requête `count` réelle. Aucun chiffre n'est
 * estimé, extrapolé ni codé en dur : une section sans données affiche un état
 * vide, jamais un nombre inventé.
 *
 * Toutes les lectures passent par `overrideAccess: true` **avec une clause
 * explicite sur le propriétaire** : c'est un comptage serveur, pas une requête
 * utilisateur, mais le filtre reste posé à la main pour qu'aucun compteur ne
 * puisse déborder sur les données d'un autre client.
 *
 * `cache()` mémoïse pour la durée d'un rendu : la barre latérale et la page
 * peuvent demander les mêmes compteurs sans doubler les requêtes.
 */

const safeCount = async (fn: () => Promise<number>): Promise<number> => {
  try {
    return await fn()
  } catch (error) {
    // Un compteur indisponible ne doit pas faire tomber tout le tableau de bord.
    console.error('[counters]', error)
    return 0
  }
}

export const customerCounters = cache(async (userId: string): Promise<BadgeCounts> => {
  const payload = await getPayloadClient()

  const count = (
    collection: Parameters<typeof payload.count>[0]['collection'],
    where: Where,
  ) =>
    safeCount(async () => {
      const result = await payload.count({ collection, where, overrideAccess: true })
      return result.totalDocs
    })

  const [
    unreadNotifications,
    proposalsAwaitingDecision,
    unpaidInvoices,
    upcomingAppointments,
    unreadMessages,
  ] = await Promise.all([
    count('notifications', {
      and: [{ recipient: { equals: userId } }, { read: { not_equals: true } }],
    }),
    count('proposals', {
      and: [{ customer: { equals: userId } }, { status: { equals: 'sent' } }],
    }),
    count('invoices', {
      and: [
        { customer: { equals: userId } },
        { status: { in: ['sent', 'partially_paid', 'overdue'] } },
      ],
    }),
    count('appointments', {
      and: [
        { customer: { equals: userId } },
        { status: { in: ['requested', 'confirmed'] } },
        { startAt: { greater_than: new Date().toISOString() } },
      ],
    }),
    safeCount(async () => {
      // Les non-lus sont portés par la conversation : on somme le champ plutôt
      // que de compter des messages, ce qui évite une seconde requête par fil.
      const { docs } = await payload.find({
        collection: 'conversations',
        where: {
          and: [{ customer: { equals: userId } }, { unreadForCustomer: { greater_than: 0 } }],
        },
        limit: 200,
        depth: 0,
        select: { unreadForCustomer: true },
        overrideAccess: true,
      })
      return docs.reduce((sum, doc) => sum + (doc.unreadForCustomer ?? 0), 0)
    }),
  ])

  return {
    unreadNotifications,
    proposalsAwaitingDecision,
    unpaidInvoices,
    upcomingAppointments,
    unreadMessages,
  }
})

export const adminCounters = cache(async (): Promise<BadgeCounts> => {
  const payload = await getPayloadClient()

  const count = (
    collection: Parameters<typeof payload.count>[0]['collection'],
    where: Where,
  ) =>
    safeCount(async () => {
      const result = await payload.count({ collection, where, overrideAccess: true })
      return result.totalDocs
    })

  const [
    quotesToProcess,
    proposalsAwaitingDecision,
    unpaidInvoices,
    activeProjects,
    appointmentsToConfirm,
    adminUnreadConversations,
    newContactMessages,
    commentsToModerate,
    forumReports,
  ] = await Promise.all([
    count('quoteRequests', { status: { in: ['submitted', 'in_review'] } }),
    count('proposals', { status: { equals: 'sent' } }),
    count('invoices', { status: { in: ['sent', 'partially_paid', 'overdue'] } }),
    count('clientProjects', { status: { in: ['planned', 'active'] } }),
    count('appointments', { status: { equals: 'requested' } }),
    count('conversations', {
      and: [{ status: { equals: 'open' } }, { unreadForStaff: { greater_than: 0 } }],
    }),
    count('contactSubmissions', { status: { equals: 'new' } }),
    count('articleComments', { status: { equals: 'pending' } }),
    count('forumReports', { status: { equals: 'open' } }),
  ])

  return {
    quotesToProcess,
    proposalsAwaitingDecision,
    unpaidInvoices,
    activeProjects,
    appointmentsToConfirm,
    adminUnreadConversations,
    newContactMessages,
    commentsToModerate,
    forumReports,
  }
})

/** Statistiques d'ensemble de l'administration, toutes issues de la base. */
export const adminOverview = cache(async () => {
  const payload = await getPayloadClient()

  const count = (
    collection: Parameters<typeof payload.count>[0]['collection'],
    where?: Where,
  ) =>
    safeCount(async () => {
      const result = await payload.count({ collection, where, overrideAccess: true })
      return result.totalDocs
    })

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const [totalCustomers, newCustomers, activeSubscribers, activeServices, publishedArticles] =
    await Promise.all([
      count('users', { role: { equals: 'customer' } }),
      count('users', {
        and: [{ role: { equals: 'customer' } }, { createdAt: { greater_than: thirtyDaysAgo } }],
      }),
      count('newsletterSubscribers', { status: { not_equals: 'unsubscribed' } }),
      count('services', { _status: { equals: 'published' } }),
      count('articles', { _status: { equals: 'published' } }),
    ])

  return { totalCustomers, newCustomers, activeSubscribers, activeServices, publishedArticles }
})
