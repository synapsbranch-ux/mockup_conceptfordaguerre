'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar'
import { isNavItemActive } from './navigation'
import type { BadgeCounts, NavGroup } from './navigation'
import { NavUser } from './NavUser'
import type { NavUserProfile } from './NavUser'

/**
 * Barre latérale commune aux deux tableaux de bord.
 *
 * Bâtie sur la primitive officielle shadcn/ui `sidebar` : repli, rail,
 * tiroir mobile, raccourci clavier et persistance de l'état sont fournis par
 * elle. Seuls le modèle de navigation et l'identité changent d'un espace à
 * l'autre, ce qui garde les deux visuellement parents.
 *
 * Les compteurs viennent du serveur. Une valeur absente ou nulle n'affiche
 * aucune pastille : jamais de zéro décoratif.
 */
export const AppSidebar = ({
  groups,
  badges,
  user,
  brandLabel,
  brandHint,
  homeHref,
}: {
  groups: NavGroup[]
  badges: BadgeCounts
  user: NavUserProfile
  brandLabel: string
  brandHint: string
  homeHref: string
}) => {
  const pathname = usePathname()

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href={homeHref}>
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-md">
                  <span className="text-sm font-bold">JD</span>
                </div>
                <div className="grid flex-1 text-left leading-tight">
                  <span className="truncate text-sm font-semibold">{brandLabel}</span>
                  <span className="truncate text-xs opacity-70">{brandHint}</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {groups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const active = isNavItemActive(item, pathname)
                  const count = item.badge ? badges[item.badge] : undefined
                  const Icon = item.icon

                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={active}
                        tooltip={item.title}
                        // Repère explicite pour les lecteurs d'écran, en plus du style.
                        aria-current={active ? 'page' : undefined}
                      >
                        <Link href={item.href}>
                          <Icon aria-hidden="true" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                      {typeof count === 'number' && count > 0 && (
                        <SidebarMenuBadge>
                          <span className="sr-only">{`${count} en attente — `}</span>
                          {count > 99 ? '99+' : count}
                        </SidebarMenuBadge>
                      )}
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
