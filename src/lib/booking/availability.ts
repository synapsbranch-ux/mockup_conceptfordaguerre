import 'server-only'

import { ACTIVE_APPOINTMENT_STATUSES } from '@/lib/commerce/transitions'
import { getPayloadClient } from '@/lib/payload'

import { computeAvailableSlots } from './slots'
import type { Exception, Slot, WeeklyRule } from './slots'

/**
 * Pont entre le moteur de créneaux (pur) et la base.
 *
 * Toute la disponibilité est calculée **ici, côté serveur**. Le navigateur ne
 * reçoit qu'une liste de créneaux déjà filtrée ; il ne calcule rien et ne peut
 * donc pas se fabriquer un créneau. À la réservation, le créneau proposé est
 * de toute façon revérifié contre cette même fonction, puis tranché en dernier
 * ressort par l'index unique en base.
 */

export type MeetingTypeSummary = {
  id: string
  title: string
  slug: string
  description?: string | null
  durationMinutes: number
  bufferMinutes: number
  minimumNoticeHours: number
  horizonDays: number
  hostId: string
  locationKind: string
  requiresConfirmation: boolean
}

/** Charge un type de rencontre actif. `null` s'il est inactif ou inconnu. */
export const loadMeetingType = async (idOrSlug: string): Promise<MeetingTypeSummary | null> => {
  const payload = await getPayloadClient()

  const { docs } = await payload.find({
    collection: 'meetingTypes',
    where: {
      and: [{ active: { equals: true } }, { or: [{ slug: { equals: idOrSlug } }, { id: { equals: idOrSlug } }] }],
    },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })

  const doc = docs[0]
  if (!doc) return null

  const hostId = typeof doc.host === 'object' ? String(doc.host?.id) : String(doc.host ?? '')
  if (!hostId) return null

  return {
    id: String(doc.id),
    title: doc.title,
    slug: doc.slug ?? String(doc.id),
    description: doc.description,
    durationMinutes: doc.durationMinutes ?? 30,
    bufferMinutes: doc.bufferMinutes ?? 0,
    minimumNoticeHours: doc.minimumNoticeHours ?? 24,
    horizonDays: doc.horizonDays ?? 60,
    hostId,
    locationKind: doc.locationKind ?? 'video',
    requiresConfirmation: doc.requiresConfirmation !== false,
  }
}

/** Tous les types de rencontres proposés, dans l'ordre défini. */
export const listMeetingTypes = async (): Promise<MeetingTypeSummary[]> => {
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'meetingTypes',
    where: { active: { equals: true } },
    sort: 'order',
    limit: 50,
    depth: 0,
    overrideAccess: true,
  })

  const types: MeetingTypeSummary[] = []

  for (const doc of docs) {
    const hostId = typeof doc.host === 'object' ? String(doc.host?.id) : String(doc.host ?? '')
    // Un type sans hote n'a pas de calendrier a consulter : on l'ignore.
    if (!hostId) continue

    types.push({
      id: String(doc.id),
      title: doc.title,
      slug: doc.slug ?? String(doc.id),
      description: doc.description,
      durationMinutes: doc.durationMinutes ?? 30,
      bufferMinutes: doc.bufferMinutes ?? 0,
      minimumNoticeHours: doc.minimumNoticeHours ?? 24,
      horizonDays: doc.horizonDays ?? 60,
      hostId,
      locationKind: doc.locationKind ?? 'video',
      requiresConfirmation: doc.requiresConfirmation !== false,
    })
  }

  return types
}

/**
 * Créneaux réservables pour un type de rencontre.
 *
 * `now` est injectable pour rendre la fonction testable ; en production, c'est
 * l'heure courante.
 */
export const getAvailableSlots = async (
  meetingType: MeetingTypeSummary,
  now: Date = new Date(),
): Promise<Slot[]> => {
  const payload = await getPayloadClient()

  const horizonEnd = new Date(now.getTime() + (meetingType.horizonDays + 1) * 24 * 60 * 60_000)

  const [rulesResult, exceptionsResult, busyResult] = await Promise.all([
    payload.find({
      collection: 'availabilityRules',
      where: { and: [{ host: { equals: meetingType.hostId } }, { active: { equals: true } }] },
      limit: 200,
      depth: 0,
      overrideAccess: true,
    }),
    payload.find({
      collection: 'availabilityExceptions',
      where: {
        and: [
          { host: { equals: meetingType.hostId } },
          { date: { greater_than_equal: new Date(now.getTime() - 24 * 60 * 60_000).toISOString() } },
          { date: { less_than_equal: horizonEnd.toISOString() } },
        ],
      },
      limit: 500,
      depth: 0,
      overrideAccess: true,
    }),
    // Rendez-vous occupant déjà le calendrier de l'hôte. Seuls les statuts
    // actifs comptent : un rendez-vous annulé libère son créneau.
    payload.find({
      collection: 'appointments',
      where: {
        and: [
          { host: { equals: meetingType.hostId } },
          { status: { in: ACTIVE_APPOINTMENT_STATUSES } },
          { endAt: { greater_than_equal: now.toISOString() } },
          { startAt: { less_than_equal: horizonEnd.toISOString() } },
        ],
      },
      limit: 1000,
      depth: 0,
      overrideAccess: true,
    }),
  ])

  const rules: WeeklyRule[] = rulesResult.docs.map((doc) => ({
    weekday: Number(doc.weekday),
    startTime: doc.startTime,
    endTime: doc.endTime,
    timezone: doc.timezone ?? 'America/Toronto',
  }))

  const exceptions: Exception[] = exceptionsResult.docs.map((doc) => ({
    date: String(doc.date).slice(0, 10),
    kind: doc.kind as Exception['kind'],
    startTime: doc.startTime,
    endTime: doc.endTime,
    timezone: doc.timezone ?? 'America/Toronto',
  }))

  const busy = busyResult.docs.map((doc) => ({
    startAt: new Date(doc.startAt as string),
    // Le tampon du rendez-vous existant est déjà inclus dans l'occupation
    // via l'option `bufferMinutes` ci-dessous, appliquée symétriquement.
    endAt: new Date(doc.endAt as string),
  }))

  return computeAvailableSlots({
    now,
    rules,
    exceptions,
    busy,
    options: {
      durationMinutes: meetingType.durationMinutes,
      bufferMinutes: meetingType.bufferMinutes,
      minimumNoticeHours: meetingType.minimumNoticeHours,
      horizonDays: meetingType.horizonDays,
      granularityMinutes: 15,
    },
  })
}

/**
 * Vérifie qu'un instant précis fait bien partie des créneaux offerts.
 *
 * Appelée avant toute écriture : elle empêche de réserver une heure qui n'a
 * jamais été proposée (hors plage, jour bloqué, préavis non respecté). Elle ne
 * remplace pas l'index unique — deux requêtes simultanées passeraient toutes
 * deux cette vérification — mais elle donne un refus propre au lieu d'une
 * erreur de clé dupliquée.
 */
export const isSlotOffered = async (
  meetingType: MeetingTypeSummary,
  startAt: Date,
  now: Date = new Date(),
): Promise<boolean> => {
  const slots = await getAvailableSlots(meetingType, now)
  const target = startAt.getTime()
  return slots.some((slot) => slot.startAt.getTime() === target)
}
