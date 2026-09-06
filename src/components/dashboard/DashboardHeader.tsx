'use client'

import { usePathname } from 'next/navigation'
import { Fragment } from 'react'

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'

import { breadcrumbFor, NAV_BY_VARIANT } from './navigation'
import type { NavVariant } from './navigation'

/**
 * En-tête collante des tableaux de bord : bouton de repli, fil d'Ariane et
 * emplacement d'actions à droite.
 *
 * Le fil est déduit du modèle de navigation partagé, donc un intitulé ne peut
 * pas diverger entre la barre latérale et le fil.
 */
export const DashboardHeader = ({
  variant,
  rootLabel,
  rootHref,
  actions,
}: {
  variant: NavVariant
  rootLabel: string
  rootHref: string
  actions?: React.ReactNode
}) => {
  const pathname = usePathname()
  const trail = breadcrumbFor(NAV_BY_VARIANT[variant], pathname, rootLabel, rootHref)

  return (
    <header className="bg-background/85 sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b backdrop-blur">
      <div className="flex w-full items-center gap-2 px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 !h-4" />

        <Breadcrumb>
          <BreadcrumbList>
            {trail.map((crumb, index) => {
              const last = index === trail.length - 1
              return (
                <Fragment key={`${crumb.href}-${index}`}>
                  <BreadcrumbItem className={index === 0 ? 'hidden md:block' : undefined}>
                    {last ? (
                      <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink href={crumb.href}>{crumb.label}</BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                  {!last && (
                    <BreadcrumbSeparator className={index === 0 ? 'hidden md:block' : undefined} />
                  )}
                </Fragment>
              )
            })}
          </BreadcrumbList>
        </Breadcrumb>

        {actions && <div className="ml-auto flex items-center gap-2">{actions}</div>}
      </div>
    </header>
  )
}
