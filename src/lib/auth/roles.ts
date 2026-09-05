/**
 * Rôles applicatifs.
 *
 * Ce module est volontairement sans dépendance serveur : il est partagé par la
 * configuration Better Auth, les collections Payload, les gardes de route et
 * les tests.
 */

export const ROLES = ['customer', 'editor', 'super-admin'] as const

export type Role = (typeof ROLES)[number]

/** Rôle attribué à toute nouvelle inscription. Jamais choisi par l'utilisateur. */
export const DEFAULT_ROLE: Role = 'customer'

const ROLE_SET: ReadonlySet<string> = new Set(ROLES)

/**
 * Normalise une valeur de rôle venue de la base ou d'une session.
 * Toute valeur inconnue, absente ou malformée retombe sur `customer` : le
 * privilège n'est jamais accordé par défaut.
 */
export const normalizeRole = (value: unknown): Role => {
  if (typeof value !== 'string') return DEFAULT_ROLE
  const trimmed = value.trim()
  return ROLE_SET.has(trimmed) ? (trimmed as Role) : DEFAULT_ROLE
}

/** Membre du personnel : accès au tableau de bord d'administration et au CMS. */
export const isStaffRole = (value: unknown): boolean => {
  const role = normalizeRole(value)
  return role === 'editor' || role === 'super-admin'
}

export const isSuperAdminRole = (value: unknown): boolean =>
  normalizeRole(value) === 'super-admin'

export const isCustomerRole = (value: unknown): boolean =>
  normalizeRole(value) === 'customer'
