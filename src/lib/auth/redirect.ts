/**
 * Protection contre les redirections ouvertes.
 *
 * Le paramètre `next` traverse le parcours de connexion pour ramener la
 * personne là où elle voulait aller. Il est donc entièrement contrôlé par
 * l'appelant et ne doit jamais être suivi tel quel : une valeur comme
 * `https://evil.test` ou `//evil.test` enverrait la victime hors du site avec
 * l'apparence d'un lien légitime.
 *
 * Seul un chemin **relatif à la racine** est accepté. Aucune origine externe
 * n'est autorisée, même celle du site : la valeur retournée est toujours un
 * chemin, jamais une URL absolue.
 */

/** Destination utilisée quand la valeur fournie est absente ou refusée. */
export const DEFAULT_REDIRECT = '/espace-client'

/** Caractères de contrôle, employés pour contourner les filtres de chemin. */
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/

const isSafePath = (value: string): boolean => {
  // Doit commencer par un slash unique : `/tableau` oui, `//evil.test` non.
  if (!value.startsWith('/')) return false
  if (value.startsWith('//')) return false

  // `\` est assimilé à `/` par plusieurs navigateurs : `/\evil.test` doit être refusé.
  if (value.includes('\\')) return false

  // Un schéma explicite ne peut pas apparaître dans un chemin relatif.
  if (/^\/[a-z][a-z0-9+.-]*:/i.test(value)) return false

  if (CONTROL_CHARS.test(value)) return false

  return true
}

/**
 * Renvoie un chemin interne sûr.
 * Toute valeur absente, absolue, protocole-relative ou malformée retombe sur
 * `fallback`.
 */
export const safeRedirect = (value: unknown, fallback: string = DEFAULT_REDIRECT): string => {
  if (typeof value !== 'string') return fallback

  const trimmed = value.trim()
  if (trimmed === '') return fallback

  // Refuse aussi la forme encodée une fois (`%2f%2fevil.test`, `%5cevil.test`).
  let decoded: string
  try {
    decoded = decodeURIComponent(trimmed)
  } catch {
    // Séquence de pourcentage invalide : on refuse plutôt que de deviner.
    return fallback
  }

  if (!isSafePath(trimmed) || !isSafePath(decoded)) return fallback

  return trimmed
}
