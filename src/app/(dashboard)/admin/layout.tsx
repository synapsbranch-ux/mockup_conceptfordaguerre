import type { ReactNode } from 'react'

import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { ADMIN_NAV } from '@/components/dashboard/navigation'
import { toNavUserProfile } from '@/components/dashboard/profile'
import { requireStaff } from '@/lib/auth/dal'
import { adminCounters } from '@/lib/server/counters'

/**
 * Coque de l'administration.
 *
 * `requireStaff` renvoie un 404 a un client authentifie plutot qu'un 403 :
 * l'existence meme de ces ecrans n'est pas divulguee.
 */
const AdminLayout = async ({ children }: { children: ReactNode }) => {
  const user = await requireStaff('/admin')
  const badges = await adminCounters()

  return (
    <DashboardShell
      groups={ADMIN_NAV}
      badges={badges}
      user={toNavUserProfile(user)}
      brandLabel="Administration"
      brandHint="Jacques-Daguerre Valcy"
      rootLabel="Administration"
      rootHref="/admin"
    >
      {children}
    </DashboardShell>
  )
}

export default AdminLayout
