import type { Access } from 'payload'

import { isSuperAdmin } from './index'

/**
 * Un super-administrateur gère tous les comptes.
 * Un éditeur ne peut lire et modifier que son propre compte : il ne voit donc
 * jamais l'existence d'un super-administrateur dans la liste.
 */
export const usersRead: Access = ({ req: { user } }) => {
  if (!user) return false
  if (isSuperAdmin(user)) return true
  return { id: { equals: user.id } }
}

export const usersUpdate: Access = ({ req: { user } }) => {
  if (!user) return false
  if (isSuperAdmin(user)) return true
  return { id: { equals: user.id } }
}

/** Aucune inscription publique : seul un super-administrateur crée des comptes. */
export const usersCreate: Access = ({ req: { user } }) => isSuperAdmin(user)

/** Un utilisateur ne peut pas supprimer son propre compte, ni un éditeur en supprimer un autre. */
export const usersDelete: Access = ({ req: { user }, id }) => {
  if (!isSuperAdmin(user)) return false
  if (id && user && String(id) === String(user.id)) return false
  return true
}
