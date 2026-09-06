import { NextResponse } from 'next/server'

import { getAvailableSlots, loadMeetingType } from '@/lib/booking/availability'
import { groupSlotsByDay } from '@/lib/booking/slots'
import { fail, ok, withPublic } from '@/lib/server/api'

/**
 * Créneaux disponibles pour un type de rencontre.
 *
 * Lecture seule et publique : la liste des disponibilités n'est pas une donnée
 * confidentielle, et la réservation sans compte doit pouvoir la consulter.
 * Aucune information sur les rendez-vous existants n'est divulguée — seuls les
 * créneaux **libres** sortent d'ici, jamais les créneaux occupés ni l'identité
 * de qui les occupe.
 */

export const dynamic = 'force-dynamic'

export const GET = async (request: Request): Promise<NextResponse> =>
  withPublic(request, { scope: 'slots', limit: 60, windowSeconds: 300 }, async () => {
    const url = new URL(request.url)
    const type = url.searchParams.get('type')
    const timezone = url.searchParams.get('tz') ?? 'America/Toronto'

    if (!type) return fail('invalid', 400, 'Type de rencontre manquant.')

    const meetingType = await loadMeetingType(type)
    if (!meetingType) return fail('not_found', 404, 'Type de rencontre introuvable.')

    const slots = await getAvailableSlots(meetingType)

    // Le fuseau ne sert qu'au regroupement par jour côté affichage ; les
    // instants restent en UTC dans la réponse.
    const grouped = groupSlotsByDay(slots, timezone).map((group) => ({
      date: group.date,
      slots: group.slots.map((slot) => ({
        startAt: slot.startAt.toISOString(),
        endAt: slot.endAt.toISOString(),
      })),
    }))

    return ok({
      meetingType: {
        id: meetingType.id,
        slug: meetingType.slug,
        title: meetingType.title,
        description: meetingType.description ?? null,
        durationMinutes: meetingType.durationMinutes,
        locationKind: meetingType.locationKind,
        requiresConfirmation: meetingType.requiresConfirmation,
      },
      days: grouped,
    })
  })
