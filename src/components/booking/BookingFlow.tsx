'use client'

import { useCallback, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarDays, Clock, Loader2, Video } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/dashboard/states'

type MeetingType = {
  id: string
  slug: string
  title: string
  description?: string | null
  durationMinutes: number
  locationKind: string
  requiresConfirmation: boolean
}

type SlotDay = { date: string; slots: { startAt: string; endAt: string }[] }

/**
 * Parcours de réservation en trois temps : format, créneau, objectif.
 *
 * Aucun calcul de disponibilité n'a lieu ici. Les créneaux viennent tels quels
 * du serveur, et le serveur les revérifie à la soumission : le navigateur ne
 * peut pas fabriquer une heure qui ne lui a pas été proposée.
 */
export const BookingFlow = ({
  meetingTypes,
  initialDays,
  intro,
  confirmationMessage,
}: {
  meetingTypes: MeetingType[]
  /**
   * Creneaux du format pre-selectionne, calcules par le serveur.
   * Evite un aller-retour au premier rendu, et surtout evite de declencher
   * un chargement depuis un effet.
   */
  initialDays?: SlotDay[] | null
  intro?: string | null
  confirmationMessage?: string | null
}) => {
  const router = useRouter()

  const [selectedType, setSelectedType] = useState<MeetingType | null>(
    meetingTypes.length === 1 ? meetingTypes[0] : null,
  )
  const [days, setDays] = useState<SlotDay[] | null>(initialDays ?? null)
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [slotError, setSlotError] = useState<string | null>(null)

  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [objective, setObjective] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [done, setDone] = useState<{ reference: string; email: string } | null>(null)

  // Fuseau réel du navigateur : sert à grouper l'affichage par journée et est
  // transmis au serveur, qui le conserve pour les rappels.
  const timezone = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Toronto'
    } catch {
      return 'America/Toronto'
    }
  }, [])

  const loadSlots = useCallback(
    async (type: MeetingType) => {
      setLoadingSlots(true)
      setSlotError(null)
      setDays(null)
      setSelectedSlot(null)

      try {
        const response = await fetch(
          `/api/rendez-vous/creneaux?type=${encodeURIComponent(type.slug)}&tz=${encodeURIComponent(timezone)}`,
          { cache: 'no-store' },
        )
        const payload = await response.json()

        if (!response.ok || !payload.ok) {
          setSlotError(payload.message ?? 'Impossible de charger les disponibilités.')
          return
        }
        setDays(payload.data.days as SlotDay[])
      } catch {
        setSlotError('Impossible de charger les disponibilités.')
      } finally {
        setLoadingSlots(false)
      }
    },
    [timezone],
  )

  /** Selectionne un format et charge ses creneaux, depuis le geste de l'utilisateur. */
  const selectType = (type: MeetingType) => {
    if (selectedType?.id === type.id) return
    setSelectedType(type)
    void loadSlots(type)
  }

  const submit = async () => {
    if (!selectedType || !selectedSlot) return
    if (objective.trim().length < 10) {
      setFormError('Merci de décrire l’objectif en quelques mots (10 caractères minimum).')
      return
    }

    setSubmitting(true)
    setFormError(null)

    try {
      const response = await fetch('/api/rendez-vous', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          meetingType: selectedType.slug,
          startAt: selectedSlot,
          timezone,
          objective: objective.trim(),
        }),
      })
      const payload = await response.json()

      if (!response.ok || !payload.ok) {
        setFormError(payload.message ?? 'La réservation n’a pas abouti.')
        // Un créneau pris entre-temps : on recharge pour montrer l'état réel.
        if (response.status === 409) void loadSlots(selectedType)
        return
      }

      setDone({ reference: payload.data.reference, email: payload.data.email })
      router.refresh()
    } catch {
      setFormError('La réservation n’a pas abouti.')
    } finally {
      setSubmitting(false)
    }
  }

  const formatDay = (iso: string): string => {
    const [year, month, day] = iso.split('-').map(Number)
    return new Intl.DateTimeFormat('fr-CA', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }).format(new Date(Date.UTC(year, month - 1, day, 12)))
  }

  const formatTime = (iso: string): string =>
    new Intl.DateTimeFormat('fr-CA', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: timezone,
    }).format(new Date(iso))

  // --- Confirmation ---------------------------------------------------------
  if (done) {
    return (
      <div className="border-border bg-card rounded-lg border p-6">
        <h2 className="text-lg font-semibold">Demande enregistrée</h2>
        <p className="text-muted-foreground mt-2 text-sm">
          {confirmationMessage ?? 'Votre demande est enregistrée.'}
        </p>
        <p className="mt-3 text-sm">
          Référence : <span className="font-mono">{done.reference}</span>
        </p>

        {/* L'état réel de l'envoi est affiché, jamais supposé. */}
        {done.email !== 'sent' && (
          <p className="border-border text-muted-foreground mt-3 border-l-2 pl-3 text-sm">
            {done.email === 'not_configured'
              ? 'Le courriel de confirmation n’a pas pu être envoyé : l’envoi de courriels n’est pas configuré sur ce site. Votre rendez-vous est bien enregistré.'
              : 'Le courriel de confirmation n’a pas pu être envoyé. Votre rendez-vous est bien enregistré.'}
          </p>
        )}

        <div className="mt-5 flex gap-3">
          <Button onClick={() => router.push('/espace-client/rendez-vous')}>
            Voir mes rendez-vous
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setDone(null)
              setObjective('')
              setSelectedSlot(null)
              if (selectedType) void loadSlots(selectedType)
            }}
          >
            Réserver à nouveau
          </Button>
        </div>
      </div>
    )
  }

  if (meetingTypes.length === 0) {
    return (
      <EmptyState
        title="Aucun format de rencontre"
        description="Aucun type de rencontre n’est proposé pour le moment."
      />
    )
  }

  return (
    <div className="space-y-6">
      {intro && <p className="text-muted-foreground text-sm">{intro}</p>}

      {/* Étape 1 — format */}
      <section>
        <h2 className="mb-3 text-sm font-semibold">1. Choisir un format</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {meetingTypes.map((type) => {
            const active = selectedType?.id === type.id
            return (
              <button
                key={type.id}
                type="button"
                onClick={() => selectType(type)}
                aria-pressed={active}
                className={`border-border rounded-lg border p-4 text-left transition ${
                  active ? 'ring-ring bg-accent/10 ring-2' : 'hover:bg-muted/50'
                }`}
              >
                <span className="block font-medium">{type.title}</span>
                {type.description && (
                  <span className="text-muted-foreground mt-1 block text-sm">
                    {type.description}
                  </span>
                )}
                <span className="text-muted-foreground mt-2 flex items-center gap-3 text-xs">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="size-3" aria-hidden />
                    {type.durationMinutes} min
                  </span>
                  {type.locationKind === 'video' && (
                    <span className="inline-flex items-center gap-1">
                      <Video className="size-3" aria-hidden />
                      Visioconférence
                    </span>
                  )}
                </span>
              </button>
            )
          })}
        </div>
      </section>

      {/* Étape 2 — créneau */}
      {selectedType && (
        <section>
          <h2 className="mb-1 text-sm font-semibold">2. Choisir un créneau</h2>
          <p className="text-muted-foreground mb-3 text-xs">
            Horaires affichés dans votre fuseau : {timezone}
          </p>

          {loadingSlots && (
            <p className="text-muted-foreground flex items-center gap-2 text-sm">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Chargement des disponibilités…
            </p>
          )}

          {slotError && <p className="text-destructive text-sm">{slotError}</p>}

          {days && days.length === 0 && (
            <EmptyState
              icon={CalendarDays}
              title="Aucun créneau disponible"
              description="Aucune disponibilité sur la période à venir. Revenez plus tard ou écrivez-nous."
            />
          )}

          {days && days.length > 0 && (
            <div className="space-y-4">
              {days.map((day) => (
                <div key={day.date}>
                  <h3 className="mb-2 text-sm font-medium capitalize">{formatDay(day.date)}</h3>
                  <div className="flex flex-wrap gap-2">
                    {day.slots.map((slot) => {
                      const active = selectedSlot === slot.startAt
                      return (
                        <button
                          key={slot.startAt}
                          type="button"
                          onClick={() => setSelectedSlot(slot.startAt)}
                          aria-pressed={active}
                          className={`border-border rounded-md border px-3 py-1.5 text-sm transition ${
                            active
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'hover:bg-muted'
                          }`}
                        >
                          {formatTime(slot.startAt)}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Étape 3 — objectif */}
      {selectedSlot && (
        <section>
          <h2 className="mb-3 text-sm font-semibold">3. Objectif de la rencontre</h2>
          <label htmlFor="objective" className="sr-only">
            Objectif de la rencontre
          </label>
          <textarea
            id="objective"
            value={objective}
            onChange={(event) => setObjective(event.target.value)}
            rows={4}
            maxLength={2000}
            required
            aria-describedby="objective-help"
            className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
            placeholder="Ce que vous souhaitez aborder pendant la rencontre."
          />
          <p id="objective-help" className="text-muted-foreground mt-1 text-xs">
            {objective.trim().length}/2000 — 10 caractères minimum.
          </p>

          {formError && (
            <p role="alert" className="text-destructive mt-2 text-sm">
              {formError}
            </p>
          )}

          <Button onClick={submit} disabled={submitting} className="mt-4">
            {submitting && <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />}
            {selectedType?.requiresConfirmation ? 'Demander ce créneau' : 'Réserver ce créneau'}
          </Button>
        </section>
      )}
    </div>
  )
}
