/**
 * Calcul des créneaux réservables.
 *
 * Module **pur** : il reçoit des règles, des exceptions et des rendez-vous
 * existants, et retourne des créneaux. Aucune base, aucune horloge implicite —
 * `now` est un paramètre. C'est ce qui le rend testable de bout en bout, y
 * compris autour des changements d'heure.
 *
 * ## Fuseaux
 * Les règles de disponibilité sont exprimées en heure **locale de l'hôte**
 * (« lundi 9h–17h à Montréal »). Les rendez-vous, eux, sont stockés en UTC.
 * La conversion se fait ici, à un seul endroit.
 *
 * Le piège : `9h` ne correspond pas au même instant UTC en janvier et en
 * juillet, parce que l'heure d'été décale le fuseau. On ne peut donc pas
 * ajouter un décalage fixe. On calcule le décalage réel **pour la date
 * concernée**, via `Intl.DateTimeFormat` avec `timeZone`, qui connaît les
 * règles de chaque zone.
 */

export type WeeklyRule = {
  /** 0 = dimanche … 6 = samedi, comme `Date.getUTCDay()`. */
  weekday: number
  /** `HH:MM` en heure locale de l'hôte. */
  startTime: string
  endTime: string
  /** Identifiant IANA, ex. `America/Toronto`. */
  timezone: string
}

export type Exception = {
  /** Jour concerné, `YYYY-MM-DD` en heure locale de l'hôte. */
  date: string
  kind: 'blocked' | 'blocked_range' | 'extra'
  startTime?: string | null
  endTime?: string | null
  timezone: string
}

export type BusyInterval = { startAt: Date; endAt: Date }

export type SlotOptions = {
  /** Durée de la rencontre, en minutes. */
  durationMinutes: number
  /** Temps réservé après la rencontre. */
  bufferMinutes: number
  /** Délai minimal avant le premier créneau proposé, en heures. */
  minimumNoticeHours: number
  /** Nombre de jours explorés à partir d'aujourd'hui. */
  horizonDays: number
  /** Pas de la grille, en minutes. */
  granularityMinutes?: number
}

export type Slot = {
  /** Début, en UTC. */
  startAt: Date
  /** Fin de la rencontre (hors tampon), en UTC. */
  endAt: Date
}

const MINUTE = 60_000

/** `HH:MM` → minutes depuis minuit. `null` si la forme est invalide. */
export const parseTime = (value: string | null | undefined): number | null => {
  if (typeof value !== 'string') return null
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value.trim())
  if (!match) return null
  return Number(match[1]) * 60 + Number(match[2])
}

/**
 * Décalage d'un fuseau, en minutes, **à un instant donné**.
 *
 * Positif à l'est de Greenwich. Recalculé pour chaque date afin de suivre
 * l'heure d'été : un décalage figé produirait des créneaux faux une partie de
 * l'année.
 */
export const timezoneOffsetMinutes = (timezone: string, at: Date): number => {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })

    const parts = formatter.formatToParts(at)
    const get = (type: string): number => Number(parts.find((part) => part.type === type)?.value ?? '0')

    // L'instant `at`, tel qu'il est lu dans le fuseau visé, réinterprété comme
    // s'il était UTC. L'écart avec `at` donne le décalage réel.
    const asUTC = Date.UTC(
      get('year'),
      get('month') - 1,
      get('day'),
      get('hour') === 24 ? 0 : get('hour'),
      get('minute'),
      get('second'),
    )
    return Math.round((asUTC - at.getTime()) / MINUTE)
  } catch {
    // Fuseau inconnu : on ne devine pas, on reste sur UTC.
    return 0
  }
}

/**
 * Instant UTC correspondant à une heure locale, un jour donné.
 *
 * Le décalage dépend de l'instant, et l'instant dépend du décalage : on
 * approxime, puis on corrige une fois. Une seule correction suffit, sauf à
 * viser exactement l'heure du basculement — cas traité par la vérification
 * finale.
 */
export const localToUTC = (
  year: number,
  month: number,
  day: number,
  minutesFromMidnight: number,
  timezone: string,
): Date => {
  const naive = Date.UTC(year, month - 1, day, 0, minutesFromMidnight)
  const firstGuess = new Date(naive - timezoneOffsetMinutes(timezone, new Date(naive)) * MINUTE)
  const corrected = new Date(
    naive - timezoneOffsetMinutes(timezone, firstGuess) * MINUTE,
  )
  return corrected
}

/** `YYYY-MM-DD` du jour civil dans un fuseau donné. */
export const localDateKey = (at: Date, timezone: string): string => {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
    return formatter.format(at)
  } catch {
    return at.toISOString().slice(0, 10)
  }
}

/** Jour de la semaine (0–6) dans un fuseau donné. */
export const localWeekday = (at: Date, timezone: string): number => {
  try {
    const name = new Intl.DateTimeFormat('en-US', { timeZone: timezone, weekday: 'short' }).format(at)
    const index = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(name)
    return index === -1 ? at.getUTCDay() : index
  } catch {
    return at.getUTCDay()
  }
}

/** Deux intervalles se chevauchent-ils ? Le contact bord à bord ne compte pas. */
export const overlaps = (aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean =>
  aStart.getTime() < bEnd.getTime() && bStart.getTime() < aEnd.getTime()

/**
 * Calcule les créneaux réservables.
 *
 * Ordre d'application :
 *   1. pour chaque jour de l'horizon, les règles hebdomadaires donnent des
 *      plages ouvertes ;
 *   2. une exception `blocked` supprime la journée entière ;
 *   3. une exception `blocked_range` retire une plage ;
 *   4. une exception `extra` ajoute une plage, même hors règle hebdomadaire ;
 *   5. la grille est découpée au pas choisi ;
 *   6. un créneau est écarté s'il tombe avant le préavis minimal, s'il déborde
 *      de sa plage, ou s'il chevauche un rendez-vous existant **tampon
 *      compris**.
 */
export const computeAvailableSlots = ({
  now,
  rules,
  exceptions,
  busy,
  options,
}: {
  now: Date
  rules: WeeklyRule[]
  exceptions: Exception[]
  busy: BusyInterval[]
  options: SlotOptions
}): Slot[] => {
  const duration = Math.max(1, options.durationMinutes)
  const buffer = Math.max(0, options.bufferMinutes)
  const granularity = Math.max(5, options.granularityMinutes ?? 15)
  const horizon = Math.max(1, options.horizonDays)

  const earliest = new Date(now.getTime() + Math.max(0, options.minimumNoticeHours) * 60 * MINUTE)

  // L'horizon est borne par la boucle sur les JOURS ci-dessous, pas par un
  // instant glissant. Couper a `now + horizon x 24 h` amputerait le dernier
  // jour : avec un horizon de 7 jours calcule un lundi a midi, un creneau du
  // lundi suivant a 9 h locales tombe deux heures apres la limite et
  // disparaitrait, alors qu'il est bien dans les sept jours.

  // Fuseau de référence : celui des règles. À défaut, UTC.
  const baseTimezone = rules[0]?.timezone ?? exceptions[0]?.timezone ?? 'UTC'

  const slots: Slot[] = []

  for (let dayOffset = 0; dayOffset <= horizon; dayOffset += 1) {
    const cursor = new Date(now.getTime() + dayOffset * 24 * 60 * MINUTE)
    const dateKey = localDateKey(cursor, baseTimezone)
    const [year, month, day] = dateKey.split('-').map(Number)
    const weekday = localWeekday(cursor, baseTimezone)

    const dayExceptions = exceptions.filter((exception) => exception.date.slice(0, 10) === dateKey)

    // Journée entièrement bloquée : rien à proposer.
    if (dayExceptions.some((exception) => exception.kind === 'blocked')) continue

    // Plages ouvertes du jour.
    const openRanges: { start: number; end: number; timezone: string }[] = []

    for (const rule of rules) {
      if (rule.weekday !== weekday) continue
      const start = parseTime(rule.startTime)
      const end = parseTime(rule.endTime)
      if (start === null || end === null || end <= start) continue
      openRanges.push({ start, end, timezone: rule.timezone })
    }

    for (const exception of dayExceptions) {
      if (exception.kind !== 'extra') continue
      const start = parseTime(exception.startTime)
      const end = parseTime(exception.endTime)
      if (start === null || end === null || end <= start) continue
      openRanges.push({ start, end, timezone: exception.timezone })
    }

    if (openRanges.length === 0) continue

    // Plages retirées du jour.
    const blockedRanges = dayExceptions
      .filter((exception) => exception.kind === 'blocked_range')
      .map((exception) => ({
        start: parseTime(exception.startTime),
        end: parseTime(exception.endTime),
      }))
      .filter((range): range is { start: number; end: number } => range.start !== null && range.end !== null)

    for (const range of openRanges) {
      for (let minute = range.start; minute + duration <= range.end; minute += granularity) {
        // Un créneau chevauchant une plage retirée est écarté.
        const blocked = blockedRanges.some(
          (blockedRange) => minute < blockedRange.end && blockedRange.start < minute + duration,
        )
        if (blocked) continue

        const startAt = localToUTC(year, month, day, minute, range.timezone)
        const endAt = new Date(startAt.getTime() + duration * MINUTE)

        if (startAt < earliest) continue

        // Le tampon appartient au créneau du point de vue de l'occupation :
        // un rendez-vous suivant ne peut pas commencer pendant.
        const occupiedEnd = new Date(endAt.getTime() + buffer * MINUTE)
        const conflict = busy.some((interval) =>
          overlaps(startAt, occupiedEnd, interval.startAt, interval.endAt),
        )
        if (conflict) continue

        slots.push({ startAt, endAt })
      }
    }
  }

  // Tri chronologique et déduplication : deux règles qui se recouvrent ne
  // doivent pas proposer deux fois le même instant.
  const seen = new Set<number>()
  return slots
    .sort((a, b) => a.startAt.getTime() - b.startAt.getTime())
    .filter((slot) => {
      const key = slot.startAt.getTime()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
}

/** Regroupe les créneaux par jour civil, dans le fuseau du client. */
export const groupSlotsByDay = (
  slots: Slot[],
  timezone: string,
): { date: string; slots: Slot[] }[] => {
  const groups = new Map<string, Slot[]>()
  for (const slot of slots) {
    const key = localDateKey(slot.startAt, timezone)
    groups.set(key, [...(groups.get(key) ?? []), slot])
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, daySlots]) => ({ date, slots: daySlots }))
}
