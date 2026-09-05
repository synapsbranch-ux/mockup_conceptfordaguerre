import type { AuthStrategy } from 'payload'

import { normalizeRole } from '@/lib/auth/roles'

/**
 * Pont Better Auth → Payload.
 *
 * Better Auth est le système d'identité unique du site. Cette stratégie permet
 * au panneau CMS et à l'API Local de reconnaître une session Better Auth : elle
 * lit le cookie de session, puis relit l'utilisateur **depuis la base** pour
 * obtenir son rôle et son état à jour.
 *
 * Le rôle n'est jamais lu depuis le cookie : une session émise avant une
 * rétrogradation ne doit pas conserver les privilèges de l'ancien rôle.
 *
 * Better Auth et Payload partagent la collection `users`, il n'y a donc aucune
 * correspondance à maintenir : l'identifiant de session désigne directement le
 * document Payload.
 */
export const betterAuthStrategy: AuthStrategy = {
  name: 'better-auth',
  authenticate: async ({ headers, payload }) => {
    try {
      // Import différé : `@/lib/auth/server` est marqué `server-only` et tire
      // le pilote MongoDB. Le charger à la demande évite de l'embarquer dans
      // les contextes où la stratégie n'est jamais sollicitée.
      const { auth } = await import('@/lib/auth/server')
      const session = await auth.api.getSession({ headers })

      const userId = session?.user?.id
      if (!userId) return { user: null }

      const user = await payload.findByID({
        collection: 'users',
        id: String(userId),
        depth: 0,
        overrideAccess: true,
      })

      if (!user) return { user: null }

      // Un compte désactivé ou suspendu perd immédiatement tout accès protégé,
      // même si son cookie de session reste valide.
      if (user.active === false || user.suspended === true) return { user: null }

      return {
        user: {
          ...user,
          role: normalizeRole(user.role),
          collection: 'users',
          _strategy: 'better-auth',
        },
      }
    } catch {
      // Toute anomalie (base injoignable, cookie illisible) est traitée comme
      // une absence de session : jamais comme un accès accordé.
      return { user: null }
    }
  },
}
