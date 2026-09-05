import type { Access, FieldAccess } from 'payload'

import { isStaffRole, isSuperAdminRole, normalizeRole } from '@/lib/auth/roles'

import type { User } from '@/payload-types'

/** Utilisateur authentifié, quel que soit son rôle, et dont le compte est utilisable. */
const activeUser = (user: unknown): User | null => {
  const candidate = user as (User & { suspended?: boolean | null }) | null | undefined
  if (!candidate) return null
  if (candidate.active === false) return null
  // Un compte suspendu perd tout accès protégé, comme un compte désactivé.
  if (candidate.suspended === true) return null
  return candidate
}

export const isSuperAdmin = (user: unknown): boolean => isSuperAdminRole(activeUser(user)?.role)

export const isEditor = (user: unknown): boolean => activeUser(user)?.role === 'editor'

/**
 * Membre du personnel du CMS : éditeur ou super-administrateur.
 *
 * Depuis l'ajout du rôle `customer`, « authentifié » ne vaut plus « membre du
 * CMS » : un client connecté ne doit jamais pouvoir écrire du contenu
 * éditorial. Cette fonction ne renvoie donc vrai que pour le personnel.
 */
export const isCMSUser = (user: unknown): boolean => isStaffRole(activeUser(user)?.role)

/** Client authentifié et en règle. */
export const isCustomer = (user: unknown): boolean =>
  normalizeRole(activeUser(user)?.role) === 'customer'

/** N'importe quel compte authentifié et utilisable, client compris. */
export const isSignedIn = (user: unknown): boolean => activeUser(user) !== null

// --- Accès au niveau collection ---------------------------------------------

/** Lecture publique sans restriction (médias, par exemple). */
export const anyone: Access = () => true

/** Réservé aux membres du personnel du CMS. */
export const authenticated: Access = ({ req: { user } }) => isCMSUser(user)

/** Réservé aux super-administrateurs. */
export const superAdminOnly: Access = ({ req: { user } }) => isSuperAdmin(user)

/** Réservé à tout compte connecté, client compris. */
export const signedIn: Access = ({ req: { user } }) => isSignedIn(user)

/**
 * Contenu éditorial : le personnel voit tout (brouillons compris),
 * les visiteurs et les clients uniquement les documents publiés.
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
 * Empêche un éditeur ou un client de modifier un champ sensible (rôle, statut).
 * Sans cette garde, un compte pourrait s'auto-promouvoir.
 */
export const superAdminFieldOnly: FieldAccess = ({ req: { user } }) => isSuperAdmin(user)

/** Champ réservé au personnel : invisible et non modifiable pour un client. */
export const staffFieldOnly: FieldAccess = ({ req: { user } }) => isCMSUser(user)
