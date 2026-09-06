import 'server-only'

import { getPayloadClient } from '@/lib/payload'
import { isStaffRole, isSuperAdminRole } from '@/lib/auth/roles'
import type { Role } from '@/lib/auth/roles'

/**
 * Protections structurelles sur les comptes.
 *
 * Deux invariants que l'interface seule ne peut pas garantir :
 *
 *  1. **Le site conserve toujours au moins un administrateur actif.** Sans
 *     cela, une rétrogradation ou une suspension malencontreuse rendrait
 *     l'administration définitivement inaccessible, sans recours autre qu'un
 *     accès direct à la base.
 *
 *  2. **Personne ne modifie son propre rôle ni son propre statut.** Même un
 *     super-administrateur : c'est ce qui empêche qu'une session compromise
 *     verrouille les autres comptes, et cela évite de se retirer ses propres
 *     droits par inadvertance.
 */

export type GuardResult = { ok: true } | { ok: false; reason: string }

const OK: GuardResult = { ok: true }

/** Compte les administrateurs actifs, hors compte visé. */
const countOtherActiveAdmins = async (excludeId: string): Promise<number> => {
  const payload = await getPayloadClient()

  const { totalDocs } = await payload.count({
    collection: 'users',
    where: {
      and: [
        { role: { in: ['editor', 'super-admin'] } },
        { id: { not_equals: excludeId } },
        { active: { not_equals: false } },
        { suspended: { not_equals: true } },
      ],
    },
    overrideAccess: true,
  })

  return totalDocs
}

/**
 * Vérifie qu'un changement de rôle est permis.
 * `actorId` est l'auteur de l'action, `targetId` le compte visé.
 */
export const canChangeRole = async ({
  actorId,
  targetId,
  currentRole,
  nextRole,
}: {
  actorId: string
  targetId: string
  currentRole: Role
  nextRole: Role
}): Promise<GuardResult> => {
  if (actorId === targetId) {
    return { ok: false, reason: 'Vous ne pouvez pas modifier votre propre rôle.' }
  }

  // Rétrograder un membre du personnel vers client retire un administrateur.
  const losesStaff = isStaffRole(currentRole) && !isStaffRole(nextRole)
  if (losesStaff && (await countOtherActiveAdmins(targetId)) === 0) {
    return {
      ok: false,
      reason:
        'Ce compte est le dernier administrateur actif : le rétrograder rendrait l’administration inaccessible.',
    }
  }

  return OK
}

/** Vérifie qu'une suspension ou une désactivation est permise. */
export const canSuspend = async ({
  actorId,
  targetId,
  currentRole,
}: {
  actorId: string
  targetId: string
  currentRole: Role
}): Promise<GuardResult> => {
  if (actorId === targetId) {
    return { ok: false, reason: 'Vous ne pouvez pas suspendre votre propre compte.' }
  }

  if (isStaffRole(currentRole) && (await countOtherActiveAdmins(targetId)) === 0) {
    return {
      ok: false,
      reason:
        'Ce compte est le dernier administrateur actif : le suspendre rendrait l’administration inaccessible.',
    }
  }

  return OK
}

/** Vérifie qu'une suppression est permise. */
export const canDeleteUser = async ({
  actorId,
  targetId,
  currentRole,
}: {
  actorId: string
  targetId: string
  currentRole: Role
}): Promise<GuardResult> => {
  if (actorId === targetId) {
    return { ok: false, reason: 'Vous ne pouvez pas supprimer votre propre compte.' }
  }

  if (isStaffRole(currentRole) && (await countOtherActiveAdmins(targetId)) === 0) {
    return {
      ok: false,
      reason: 'Ce compte est le dernier administrateur actif : il ne peut pas être supprimé.',
    }
  }

  return OK
}

/**
 * Seul un super-administrateur peut créer ou retirer un super-administrateur.
 * Un éditeur ne doit pas pouvoir s'élever ni élever quelqu'un d'autre au
 * palier supérieur.
 */
export const canAssignRole = (actorRole: Role, nextRole: Role): GuardResult => {
  if (isSuperAdminRole(nextRole) && !isSuperAdminRole(actorRole)) {
    return {
      ok: false,
      reason: 'Seul un super-administrateur peut attribuer ce rôle.',
    }
  }
  return OK
}
