import type { Metadata } from 'next'
import Link from 'next/link'

import { BookingFlow } from '@/components/booking/BookingFlow'
import { EmptyState } from '@/components/dashboard/states'
import { requireUser } from '@/lib/auth/dal'
import { getAvailableSlots, listMeetingTypes } from '@/lib/booking/availability'
import { groupSlotsByDay } from '@/lib/booking/slots'
import { getClientSpaceSettings } from '@/lib/settings'

export const metadata: Metadata = { title: 'Réserver une rencontre' }

/**
 * Réservation d'une rencontre.
 *
 * La page se contente de charger les formats proposés ; toute la disponibilité
 * est calculée côté serveur, à la demande, par `/api/rendez-vous/creneaux`.
 */
const BookPage = async () => {
  await requireUser()

  const [meetingTypes, settings] = await Promise.all([
    listMeetingTypes(),
    getClientSpaceSettings(),
  ])

  /**
   * Quand un seul format existe, il est pre-selectionne : ses creneaux sont
   * donc calcules ici, cote serveur. Le composant n'a plus a declencher de
   * chargement au montage, et la premiere peinture affiche deja les
   * disponibilites.
   *
   * Le regroupement par journee utilise le fuseau de l'hote ; le composant
   * reaffiche ensuite chaque heure dans le fuseau reel du navigateur.
   */
  const initialDays =
    meetingTypes.length === 1
      ? groupSlotsByDay(await getAvailableSlots(meetingTypes[0]), 'America/Toronto').map(
          (group) => ({
            date: group.date,
            slots: group.slots.map((slot) => ({
              startAt: slot.startAt.toISOString(),
              endAt: slot.endAt.toISOString(),
            })),
          }),
        )
      : null

  if (settings.bookingEnabled === false) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          {settings.bookingTitle ?? 'Réserver une rencontre'}
        </h1>
        <EmptyState
          title="Réservation fermée"
          description="La prise de rendez-vous est momentanément indisponible."
          actionLabel="Nous écrire"
          actionHref="/espace-client/messages"
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {settings.bookingTitle ?? 'Réserver une rencontre'}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          <Link href="/espace-client/rendez-vous" className="underline underline-offset-2">
            Retour à mes rendez-vous
          </Link>
        </p>
      </div>

      <BookingFlow
        meetingTypes={meetingTypes.map((type) => ({
          id: type.id,
          slug: type.slug,
          title: type.title,
          description: type.description ?? null,
          durationMinutes: type.durationMinutes,
          locationKind: type.locationKind,
          requiresConfirmation: type.requiresConfirmation,
        }))}
        initialDays={initialDays}
        intro={settings.bookingIntro}
        confirmationMessage={settings.bookingConfirmation}
      />

      {settings.bookingPolicy && (
        <section className="border-border text-muted-foreground border-t pt-4 text-sm">
          <h2 className="text-foreground mb-1 font-medium">Conditions d’annulation</h2>
          <p className="whitespace-pre-line">{settings.bookingPolicy}</p>
        </section>
      )}
    </div>
  )
}

export default BookPage
