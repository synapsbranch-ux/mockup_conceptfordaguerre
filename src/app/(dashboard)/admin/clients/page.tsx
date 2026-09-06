import { Users } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import type { Where } from 'payload'

import { EmptyState, SectionHeading } from '@/components/dashboard/states'
import { UserActions } from '@/components/dashboard/UserActions'
import { requireStaff } from '@/lib/auth/dal'
import { isSuperAdminRole, normalizeRole } from '@/lib/auth/roles'
import { getPayloadClient } from '@/lib/payload'

export const metadata: Metadata = { title: 'Clients et comptes' }

const ROLE_LABELS: Record<string, string> = {
  customer: 'Client',
  editor: 'Administrateur',
  'super-admin': 'Super-administrateur',
}

const shortDate = (value: string | null | undefined): string =>
  value ? new Intl.DateTimeFormat('fr-CA', { dateStyle: 'medium' }).format(new Date(value)) : '—'

/**
 * Gestion des comptes.
 *
 * Les actions sensibles passent par `/api/admin/clients/[id]`, qui applique la
 * protection du dernier administrateur et l'interdiction de se modifier
 * soi-même. Cet écran n'est qu'une façade : masquer un bouton n'autorise rien.
 */
const ClientsPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; role?: string; statut?: string }>
}) => {
  const actor = await requireStaff()
  const params = await searchParams
  const payload = await getPayloadClient()

  const search = (params.q ?? '').trim().slice(0, 120)
  const role = (params.role ?? '').trim()
  const statut = (params.statut ?? '').trim()

  const filters: Where[] = []
  if (search) {
    filters.push({ or: [{ name: { like: search } }, { email: { like: search } }, { company: { like: search } }] })
  }
  if (role && role in ROLE_LABELS) filters.push({ role: { equals: role } })
  if (statut === 'suspended') filters.push({ suspended: { equals: true } })
  if (statut === 'active') filters.push({ suspended: { not_equals: true } })

  const [users, counts] = await Promise.all([
    payload.find({
      collection: 'users',
      where: filters.length > 0 ? { and: filters } : undefined,
      sort: '-createdAt',
      limit: 200,
      depth: 0,
      overrideAccess: true,
    }),
    Promise.all(
      ['customer', 'editor', 'super-admin'].map(async (value) => ({
        value,
        total: (
          await payload.count({
            collection: 'users',
            where: { role: { equals: value } },
            overrideAccess: true,
          })
        ).totalDocs,
      })),
    ),
  ])

  const canPromote = isSuperAdminRole(actor.role)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Clients et comptes</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Rôles, suspensions et droits de publication.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {counts.map((entry) => (
          <Link
            key={entry.value}
            href={`/admin/clients?role=${entry.value}`}
            className="border-border bg-card hover:bg-muted/40 rounded-lg border p-4 transition"
          >
            <span className="text-muted-foreground text-sm">{ROLE_LABELS[entry.value]}</span>
            <span className="mt-1 block text-2xl font-semibold tabular-nums">{entry.total}</span>
          </Link>
        ))}
      </div>

      <form method="get" className="flex flex-wrap items-end gap-3">
        <div className="min-w-56 flex-1">
          <label htmlFor="q" className="mb-1 block text-sm font-medium">
            Rechercher
          </label>
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={search}
            placeholder="Nom, courriel ou entreprise"
            className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="role" className="mb-1 block text-sm font-medium">
            Rôle
          </label>
          <select
            id="role"
            name="role"
            defaultValue={role}
            className="border-input bg-background rounded-md border px-3 py-2 text-sm"
          >
            <option value="">Tous</option>
            {Object.entries(ROLE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="statut" className="mb-1 block text-sm font-medium">
            Statut
          </label>
          <select
            id="statut"
            name="statut"
            defaultValue={statut}
            className="border-input bg-background rounded-md border px-3 py-2 text-sm"
          >
            <option value="">Tous</option>
            <option value="active">Actifs</option>
            <option value="suspended">Suspendus</option>
          </select>
        </div>
        <button
          type="submit"
          className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium"
        >
          Filtrer
        </button>
      </form>

      <section>
        <SectionHeading title={`${users.totalDocs} compte${users.totalDocs > 1 ? 's' : ''}`} />

        {users.docs.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Aucun compte"
            description="Aucun compte ne correspond à ces critères."
          />
        ) : (
          <ul className="space-y-3">
            {users.docs.map((user) => {
              const userRole = normalizeRole(user.role)
              return (
                <li
                  key={user.id}
                  className="border-border bg-card flex flex-wrap items-start justify-between gap-4 rounded-lg border p-4"
                >
                  <div className="min-w-0">
                    <p className="font-medium">
                      {user.name ?? user.email}
                      {user.suspended && (
                        <span className="text-destructive ml-2 text-xs">suspendu</span>
                      )}
                      {user.forumBanned && (
                        <span className="text-muted-foreground ml-2 text-xs">forum bloqué</span>
                      )}
                    </p>
                    <p className="text-muted-foreground mt-0.5 text-sm">{user.email}</p>
                    <p className="text-muted-foreground mt-1 text-xs">
                      {ROLE_LABELS[userRole]}
                      {user.company ? ` · ${user.company}` : ''} · inscrit le{' '}
                      {shortDate(user.createdAt)}
                      {user.lastLogin ? ` · vu le ${shortDate(user.lastLogin)}` : ''}
                    </p>
                  </div>

                  <UserActions
                    userId={String(user.id)}
                    role={userRole}
                    suspended={user.suspended === true}
                    forumBanned={user.forumBanned === true}
                    isSelf={String(user.id) === actor.id}
                    canPromoteToSuperAdmin={canPromote}
                  />
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}

export default ClientsPage
