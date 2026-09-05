import type { ReactNode } from 'react'

import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { CUSTOMER_NAV } from '@/components/dashboard/navigation'
import { toNavUserProfile } from '@/components/dashboard/profile'
import { requireUser } from '@/lib/auth/dal'
import { customerCounters } from '@/lib/server/counters'

/**
 * Coque de l'espace client.
 *
 * La session est revalidee ici, cote serveur, a chaque requete : `proxy.ts`
 * n'a fait qu'un controle optimiste sur la presence d'un cookie. Un compte
 * suspendu est renvoye avant tout rendu.
 */
const EspaceClientLayout = async ({ children }: { children: ReactNode }) => {
  const user = await requireUser('/espace-client')
  const badges = await customerCounters(user.id)

  return (
    <DashboardShell
      groups={CUSTOMER_NAV}
      badges={badges}
      user={toNavUserProfile(user)}
      brandLabel="Espace client"
      brandHint="Jacques-Daguerre Valcy"
      rootLabel="Espace client"
      rootHref="/espace-client"
    >
      {children}
    </DashboardShell>
  )
}

export default EspaceClientLayout
