'use client'

import { ChevronsUpDown, ExternalLink, LogOut, Moon, Sun, UserCog } from 'lucide-react'
import Link from 'next/link'
import { useTheme } from 'next-themes'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from '@/components/ui/sidebar'

export type NavUserProfile = {
  name: string
  email: string
  image: string | null
  /** Libellé du rôle, déjà traduit côté serveur. */
  roleLabel: string
  isStaff: boolean
}

/** Initiales de repli quand aucune photo n'est disponible. */
const initialsOf = (name: string, email: string): string => {
  const source = name.trim() || email
  const parts = source.split(/[\s@._-]+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

/**
 * Menu utilisateur du pied de barre latérale.
 *
 * La bascule de thème n'apparaît qu'une fois `resolvedTheme` connu. next-themes
 * le laisse indéfini tant que le thème n'est pas résolu côté navigateur, ce qui
 * sert directement d'indicateur de montage — inutile d'ajouter un état mis à
 * jour depuis un effet, qui provoquerait un rendu en cascade.
 */
export const NavUser = ({ user }: { user: NavUserProfile }) => {
  const { isMobile } = useSidebar()
  const { resolvedTheme, setTheme } = useTheme()
  const themeReady = resolvedTheme !== undefined
  const isDark = resolvedTheme === 'dark'

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent"
              aria-label="Ouvrir le menu du compte"
            >
              <Avatar className="size-8 rounded-md">
                {user.image && <AvatarImage src={user.image} alt="" />}
                <AvatarFallback className="rounded-md text-xs">
                  {initialsOf(user.name, user.email)}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left leading-tight">
                <span className="truncate text-sm font-medium">{user.name || user.email}</span>
                <span className="truncate text-xs opacity-70">{user.roleLabel}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" aria-hidden="true" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-60 rounded-lg"
            side={isMobile ? 'bottom' : 'right'}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="font-normal">
              <div className="grid leading-tight">
                <span className="truncate text-sm font-medium">{user.name || '—'}</span>
                <span className="text-muted-foreground truncate text-xs">{user.email}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />

            <DropdownMenuGroup>
              <DropdownMenuItem asChild>
                <Link href="/espace-client/profil">
                  <UserCog aria-hidden="true" />
                  Mon profil
                </Link>
              </DropdownMenuItem>
              {user.isStaff && (
                <DropdownMenuItem asChild>
                  <Link href="/cms">
                    <ExternalLink aria-hidden="true" />
                    Pages et médias (CMS)
                  </Link>
                </DropdownMenuItem>
              )}
              {themeReady && (
                <DropdownMenuItem onSelect={() => setTheme(isDark ? 'light' : 'dark')}>
                  {isDark ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
                  {isDark ? 'Thème clair' : 'Thème sombre'}
                </DropdownMenuItem>
              )}
            </DropdownMenuGroup>

            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/deconnexion">
                <LogOut aria-hidden="true" />
                Se déconnecter
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
