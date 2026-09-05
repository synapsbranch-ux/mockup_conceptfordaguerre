import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

/**
 * États partagés des tableaux de bord : vide, erreur, chargement.
 *
 * Les textes par défaut sont volontairement neutres. Là où le CMS fournit un
 * message (`dashboardContent`), c'est lui qui prime : aucun contenu éditorial
 * ne doit être figé dans un composant React.
 */

export const EmptyState = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
  className,
}: {
  icon?: LucideIcon
  title: string
  description?: string | null
  actionLabel?: string | null
  actionHref?: string | null
  className?: string
}) => (
  <div
    className={cn(
      'border-border flex flex-col items-center justify-center rounded-lg border border-dashed px-6 py-14 text-center',
      className,
    )}
  >
    {Icon && (
      <div className="bg-muted text-muted-foreground mb-4 rounded-full p-3">
        <Icon className="size-5" aria-hidden="true" />
      </div>
    )}
    <p className="text-base font-medium">{title}</p>
    {description && (
      <p className="text-muted-foreground mt-2 max-w-md text-sm text-balance">{description}</p>
    )}
    {actionLabel && actionHref && (
      <Button asChild className="mt-6" size="sm">
        <Link href={actionHref}>{actionLabel}</Link>
      </Button>
    )}
  </div>
)

/**
 * État d'erreur.
 * Le détail technique n'est jamais affiché : il pourrait contenir des données
 * d'une autre personne ou révéler la structure interne.
 */
export const ErrorState = ({
  title = 'Cette section n’a pas pu être chargée',
  description = 'Le service est momentanément indisponible. Réessayer dans un instant.',
  onRetry,
}: {
  title?: string
  description?: string
  onRetry?: () => void
}) => (
  <div
    role="alert"
    className="border-destructive/30 bg-destructive/5 flex flex-col items-center justify-center rounded-lg border px-6 py-12 text-center"
  >
    <p className="text-base font-medium">{title}</p>
    <p className="text-muted-foreground mt-2 max-w-md text-sm text-balance">{description}</p>
    {onRetry && (
      <Button variant="outline" size="sm" className="mt-6" onClick={onRetry}>
        Réessayer
      </Button>
    )}
  </div>
)

/** Squelette d'une carte de statistique. */
export const StatCardSkeleton = () => (
  <Card>
    <CardHeader className="pb-2">
      <Skeleton className="h-3 w-24" />
    </CardHeader>
    <CardContent>
      <Skeleton className="h-8 w-16" />
    </CardContent>
  </Card>
)

/** Squelette d'une liste. */
export const ListSkeleton = ({ rows = 4 }: { rows?: number }) => (
  <div className="space-y-3" aria-busy="true" aria-live="polite">
    <span className="sr-only">Chargement en cours…</span>
    {Array.from({ length: rows }).map((_, index) => (
      <div key={index} className="border-border flex items-center gap-4 rounded-lg border p-4">
        <Skeleton className="size-9 shrink-0 rounded-md" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3.5 w-1/3" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      </div>
    ))}
  </div>
)

/** Squelette d'une page complète de tableau de bord. */
export const DashboardSkeleton = () => (
  <div className="space-y-8" aria-busy="true" aria-live="polite">
    <span className="sr-only">Chargement du tableau de bord…</span>
    <div className="space-y-2">
      <Skeleton className="h-7 w-64" />
      <Skeleton className="h-4 w-96" />
    </div>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <StatCardSkeleton key={index} />
      ))}
    </div>
    <ListSkeleton />
  </div>
)

/** En-tête de section, homogène sur tous les écrans. */
export const SectionHeading = ({
  title,
  description,
  action,
}: {
  title: string
  description?: string | null
  action?: React.ReactNode
}) => (
  <div className="flex flex-wrap items-end justify-between gap-4">
    <div className="space-y-1">
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      {description && <p className="text-muted-foreground text-sm">{description}</p>}
    </div>
    {action}
  </div>
)

/** Carte de statistique. `value` est toujours une donnée réelle. */
export const StatCard = ({
  label,
  value,
  hint,
  href,
  icon: Icon,
}: {
  label: string
  value: number | string
  hint?: string | null
  href?: string | null
  icon?: LucideIcon
}) => {
  const body = (
    <Card className={cn('h-full', href && 'hover:border-ring/60 transition-colors')}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          {label}
        </CardTitle>
        {Icon && <Icon className="text-muted-foreground size-4" aria-hidden="true" />}
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-semibold tabular-nums">{value}</p>
        {hint && <p className="text-muted-foreground mt-1 text-xs">{hint}</p>}
      </CardContent>
    </Card>
  )

  return href ? (
    <Link href={href} className="rounded-lg focus-visible:ring-2 focus-visible:outline-none">
      {body}
    </Link>
  ) : (
    body
  )
}
