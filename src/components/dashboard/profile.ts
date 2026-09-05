import type { SessionUser } from '@/lib/auth/dal'
import type { Role } from '@/lib/auth/roles'
import { isStaffRole } from '@/lib/auth/roles'

import type { NavUserProfile } from './NavUser'

/** Libelles des roles, cote interface. */
const ROLE_LABELS: Record<Role, string> = {
  customer: 'Client',
  editor: 'Administrateur',
  'super-admin': 'Super-administrateur',
}

/** Projette une session en profil d'affichage, sans exposer d'autre donnee. */
export const toNavUserProfile = (user: SessionUser): NavUserProfile => ({
  name: user.name,
  email: user.email,
  image: user.image,
  roleLabel: ROLE_LABELS[user.role],
  isStaff: isStaffRole(user.role),
})
