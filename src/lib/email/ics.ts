/**
 * Génération d'invitations calendrier au format iCalendar (RFC 5545).
 *
 * Module pur, sans dépendance : le format est simple et une bibliothèque
 * supplémentaire ne se justifie pas.
 *
 * Deux points de rigueur :
 *  - les horodatages sont écrits en **UTC** (suffixe `Z`), ce qui évite toute
 *    ambiguïté de fuseau chez le destinataire ;
 *  - les lignes sont **repliées à 75 octets** comme l'exige la norme, faute de
 *    quoi certains clients tronquent l'événement.
 */

export type CalendarEvent = {
  /** Identifiant stable : un même rendez-vous doit garder le même UID. */
  uid: string
  title: string
  description?: string
  location?: string
  startAt: Date
  endAt: Date
  organizer?: { name: string; email: string }
  attendees?: { name?: string; email: string }[]
  url?: string
  /** Incrémenté à chaque modification : le client remplace l'événement. */
  sequence?: number
  status?: 'CONFIRMED' | 'TENTATIVE' | 'CANCELLED'
}

/** `20270315T140000Z` */
const formatUTC = (date: Date): string =>
  `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, '0')}${String(
    date.getUTCDate(),
  ).padStart(2, '0')}T${String(date.getUTCHours()).padStart(2, '0')}${String(
    date.getUTCMinutes(),
  ).padStart(2, '0')}${String(date.getUTCSeconds()).padStart(2, '0')}Z`

/**
 * Échappe les caractères réservés du format.
 * L'ordre compte : l'antislash doit être traité en premier, sinon les
 * séquences ajoutées ensuite seraient elles-mêmes échappées.
 */
const escapeText = (value: string): string =>
  value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n')

/**
 * Replie une ligne à 75 octets, les suivantes commençant par une espace.
 * Le découpage se fait sur les octets UTF-8, pas sur les caractères : couper
 * au milieu d'un caractère accentué produirait une séquence invalide.
 */
const foldLine = (line: string): string => {
  const bytes = Buffer.from(line, 'utf8')
  if (bytes.length <= 75) return line

  const parts: string[] = []
  let offset = 0
  let limit = 75

  while (offset < bytes.length) {
    let end = Math.min(offset + limit, bytes.length)

    // Recule tant que l'on couperait au milieu d'un caractère multi-octets.
    while (end > offset && end < bytes.length && (bytes[end] & 0xc0) === 0x80) end -= 1

    parts.push(bytes.subarray(offset, end).toString('utf8'))
    offset = end
    limit = 74 // Les lignes suivantes perdent un octet pour l'espace initiale.
  }

  return parts.join('\r\n ')
}

export const buildCalendarEvent = (event: CalendarEvent): string => {
  const now = new Date()

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Jacques-Daguerre Valcy//Rendez-vous//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${event.uid}`,
    `DTSTAMP:${formatUTC(now)}`,
    `DTSTART:${formatUTC(event.startAt)}`,
    `DTEND:${formatUTC(event.endAt)}`,
    `SUMMARY:${escapeText(event.title)}`,
    `SEQUENCE:${event.sequence ?? 0}`,
    `STATUS:${event.status ?? 'CONFIRMED'}`,
  ]

  if (event.description) lines.push(`DESCRIPTION:${escapeText(event.description)}`)
  if (event.location) lines.push(`LOCATION:${escapeText(event.location)}`)
  if (event.url) lines.push(`URL:${escapeText(event.url)}`)

  if (event.organizer) {
    lines.push(
      `ORGANIZER;CN=${escapeText(event.organizer.name)}:mailto:${event.organizer.email}`,
    )
  }

  for (const attendee of event.attendees ?? []) {
    const name = attendee.name ? `;CN=${escapeText(attendee.name)}` : ''
    lines.push(`ATTENDEE${name};RSVP=TRUE:mailto:${attendee.email}`)
  }

  lines.push('END:VEVENT', 'END:VCALENDAR')

  // CRLF entre les lignes, comme l'impose la norme.
  return lines.map(foldLine).join('\r\n')
}

/** Nom de fichier sûr pour la pièce jointe. */
export const calendarFilename = (reference: string): string =>
  `${reference.replace(/[^a-z0-9-]/gi, '') || 'rendez-vous'}.ics`
