import type { Access, FieldAccess } from 'payload'

import type { User } from '@/payload-types'

/** Utilisateur authentifié, quel que soit son rôle, et dont le compte est actif. */
const activeUser = (user: unknown): User | null => {
  const candidate = user as User | null | undefined
  if (!candidate) return null
  if (candidate.active === false) return null
  return candidate
}

export const isSuperAdmin = (user: unknown): boolean => activeUser(user)?.role === 'super-admin'

export const isEditor = (user: unknown): boolean => activeUser(user)?.role === 'editor'

/** N'importe quel membre actif du CMS (éditeur ou super-administrateur). */
export const isCMSUser = (user: unknown): boolean => Boolean(activeUser(user))

// --- Accès au niveau collection ---------------------------------------------

/** Lecture publique sans restriction (médias, par exemple). */
export const anyone: Access = () => true

/** Réservé aux membres actifs du CMS. */
export const authenticated: Access = ({ req: { user } }) => isCMSUser(user)

/** Réservé aux super-administrateurs. */
export const superAdminOnly: Access = ({ req: { user } }) => isSuperAdmin(user)

/**
 * Contenu éditorial : les membres du CMS voient tout (brouillons compris),
 * les visiteurs anonymes uniquement les documents publiés.
 * Le retour `Where` est appliqué par Payload à la requête MongoDB : un
 * visiteur anonyme ne peut donc jamais atteindre un brouillon, même par ID.
 */
export const authenticatedOrPublished: Access = ({ req: { user } }) => {
  if (isCMSUser(user)) return true
  return { _status: { equals: 'published' } }
}

/** Création publique autorisée (formulaires), lecture strictement privée. */
export const publicCreate: Access = () => true

// --- Accès au niveau champ ---------------------------------------------------

/**
 * Empêche un éditeur de modifier un champ sensible (rôle, statut actif).
 * Sans cette garde, un éditeur pourrait s'auto-promouvoir super-administrateur.
 */
export const superAdminFieldOnly: FieldAccess = ({ req: { user } }) => isSuperAdmin(user)
