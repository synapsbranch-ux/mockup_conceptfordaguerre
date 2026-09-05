import 'server-only'

/**
 * Assainissement des saisies publiques.
 *
 * Les valeurs des formulaires sont stockees et relues dans l'admin : on retire
 * les caracteres de controle, on borne la longueur et on normalise les espaces.
 * Aucune interpretation HTML n'a lieu au rendu (React echappe tout), ce
 * nettoyage vise donc surtout la qualite des donnees et les abus de volume.
 */

const CONTROL_CHARS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g

export const cleanText = (value: unknown, maxLength: number): string => {
  if (typeof value !== 'string') return ''
  return value
    .replace(CONTROL_CHARS, '')
    .replace(/\r\n/g, '\n')
    .trim()
    .slice(0, maxLength)
}

/** Une ligne : les retours a la ligne sont aplatis en espaces. */
export const cleanLine = (value: unknown, maxLength: number): string =>
  cleanText(value, maxLength).replace(/\s+/g, ' ')

const EMAIL_PATTERN = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/

export const cleanEmail = (value: unknown): string | null => {
  const email = cleanLine(value, 254).toLowerCase()
  if (!email || email.length > 254) return null
  return EMAIL_PATTERN.test(email) ? email : null
}

/**
 * Detection de soumission automatisee.
 *
 * Deux signaux combines : un champ leurre qu'un humain ne voit pas, et un
 * delai de remplissage minimal. Un robot remplit tous les champs et soumet
 * instantanement.
 */
export const looksAutomated = ({
  honeypot,
  elapsed,
  minimumMs = 1200,
}: {
  honeypot: unknown
  elapsed: unknown
  minimumMs?: number
}): boolean => {
  if (typeof honeypot === 'string' && honeypot.trim() !== '') return true
  if (typeof elapsed === 'number' && Number.isFinite(elapsed) && elapsed < minimumMs) return true
  return false
}
