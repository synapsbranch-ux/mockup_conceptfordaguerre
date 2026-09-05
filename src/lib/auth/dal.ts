import 'server-only'

import { headers } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import { cache } from 'react'

import { auth } from './server'
import { DEFAULT_REDIRECT } from './redirect'
import { isStaffRole, isSuperAdminRole, normalizeRole } from './roles'
import type { Role } from './roles'

/**
 * Couche d'accès aux données d'authentification.
 *
 * Toute page protégée et toute mutation d'API passe par ce module. La session
 * est relue depuis le cookie **à chaque requête serveur** : `proxy.ts` ne fait
 * qu'un contrôle optimiste et ne constitue jamais une autorisation.
 *
 * `cache()` mémoïse la lecture pour la durée d'un rendu React : plusieurs
 * composants d'une même page ne déclenchent qu'un seul appel.
 */

export type SessionUser = {
  id: string
  email: string
  name: string
  image: string | null
  role: Role
  suspended: boolean
  forumBanned: boolean
}

type RawUser = {
  id?: unknown
  email?: unknown
  name?: unknown
  image?: unknown
  role?: unknown
  suspended?: unknown
  forumBanned?: unknown
}

const toSessionUser = (raw: RawUser | null | undefined): SessionUser | null => {
  if (!raw) return null
  const id = typeof raw.id === 'string' ? raw.id : String(raw.id ?? '')
  const email = typeof raw.email === 'string' ? raw.email : ''
  if (!id || !email) return null

  return {
    id,
    email: email.trim().toLowerCase(),
    name: typeof raw.name === 'string' ? raw.name : '',
    image: typeof raw.image === 'string' && raw.image ? raw.image : null,
    // Un rôle absent ou inconnu retombe sur `customer` : jamais de privilège par défaut.
    role: normalizeRole(raw.role),
    suspended: raw.suspended === true,
    forumBanned: raw.forumBanned === true,
  }
}

/** Session courante, ou `null`. N'effectue aucune redirection. */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    return toSessionUser(session?.user as RawUser | undefined)
  } catch {
    // Base injoignable ou cookie illisible : traité comme une absence de session.
    return null
  }
})

export const isAuthenticated = async (): Promise<boolean> => (await getSessionUser()) !== null

/** Construit l'URL de connexion en préservant la destination demandée. */
export const loginPath = (next?: string): string =>
  next && next !== DEFAULT_REDIRECT
    ? `/connexion?next=${encodeURIComponent(next)}`
    : '/connexion'

/**
 * Exige une session valide et non suspendue.
 * Redirige vers la connexion en conservant la destination.
 */
export const requireUser = async (next?: string): Promise<SessionUser> => {
  const user = await getSessionUser()
  if (!user) redirect(loginPath(next))
  if (user.suspended) redirect('/compte-suspendu')
  return user
}

/**
 * Exige un membre du personnel (éditeur ou super-administrateur).
 *
 * Un compte client authentifié reçoit un 404 plutôt qu'un 403 : l'existence
 * même des écrans d'administration n'est pas divulguée. `forbidden()` est
 * volontairement écarté, il exige le drapeau expérimental `authInterrupts`.
 */
export const requireStaff = async (next?: string): Promise<SessionUser> => {
  const user = await requireUser(next)
  if (!isStaffRole(user.role)) notFound()
  return user
}

export const requireSuperAdmin = async (next?: string): Promise<SessionUser> => {
  const user = await requireUser(next)
  if (!isSuperAdminRole(user.role)) notFound()
  return user
}

/**
 * Variante pour les routes d'API : renvoie un résultat plutôt que de rediriger.
 * Chaque mutation vérifie l'authentification et l'autorisation pour elle-même,
 * sans jamais se fier à l'interface qui l'a appelée.
 */
export type ApiAuthFailure = { ok: false; status: 401 | 403; code: string }
export type ApiAuthSuccess = { ok: true; user: SessionUser }
export type ApiAuthResult = ApiAuthSuccess | ApiAuthFailure

export const authenticateRequest = async (): Promise<ApiAuthResult> => {
  const user = await getSessionUser()
  if (!user) return { ok: false, status: 401, code: 'unauthenticated' }
  if (user.suspended) return { ok: false, status: 403, code: 'suspended' }
  return { ok: true, user }
}

export const authenticateStaffRequest = async (): Promise<ApiAuthResult> => {
  const result = await authenticateRequest()
  if (!result.ok) return result
  if (!isStaffRole(result.user.role)) return { ok: false, status: 403, code: 'forbidden' }
  return result
}

/**
 * Droit de publication communautaire (commentaires, forum).
 * Un compte suspendu ou banni du forum perd ce droit sans perdre l'accès en lecture.
 */
export const canPublishToCommunity = (user: SessionUser | null): boolean =>
  user !== null && !user.suspended && !user.forumBanned
