import { cookies } from 'next/headers'

import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'

import { AppSidebar } from './AppSidebar'
import { DashboardHeader } from './DashboardHeader'
import type { BadgeCounts, NavVariant } from './navigation'
import type { NavUserProfile } from './NavUser'

/**
 * Coque commune aux deux tableaux de bord.
 *
 * Composant serveur : il lit l'état replié de la barre latérale depuis le
 * cookie posé par la primitive shadcn/ui, afin que le premier rendu corresponde
 * déjà au choix de la personne — sans saut visuel à l'hydratation.
 */
export const DashboardShell = async ({
  variant,
  badges,
  user,
  brandLabel,
  brandHint,
  rootLabel,
  rootHref,
  headerActions,
  children,
}: {
  /** Clé du modèle de navigation ; le modèle lui-même reste côté client. */
  variant: NavVariant
  badges: BadgeCounts
  user: NavUserProfile
  brandLabel: string
  brandHint: string
  rootLabel: string
  rootHref: string
  headerActions?: React.ReactNode
  children: React.ReactNode
}) => {
  const store = await cookies()
  const defaultOpen = store.get('sidebar_state')?.value !== 'false'

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <AppSidebar
        variant={variant}
        badges={badges}
        user={user}
        brandLabel={brandLabel}
        brandHint={brandHint}
        homeHref={rootHref}
      />
      <SidebarInset>
        <DashboardHeader
          variant={variant}
          rootLabel={rootLabel}
          rootHref={rootHref}
          actions={headerActions}
        />
        {/* `main` porte l'ancre de saut : la navigation clavier atteint le
            contenu sans traverser toute la barre latérale. */}
        <div id="contenu" className="flex flex-1 flex-col gap-8 p-4 md:p-8">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
