import { mongodbAdapter } from '@better-auth/mongo-adapter'
import { betterAuth } from 'better-auth'
import { nextCookies } from 'better-auth/next-js'

import { env, trustedOrigins } from '@/lib/env'

import { getAuthDb } from './db'
import { DEFAULT_ROLE } from './roles'

/**
 * Note : ce module ne porte pas `server-only`, contrairement au reste de la
 * couche d'authentification. Il est partagé avec les scripts en ligne de
 * commande (amorçage, migration) exécutés hors contexte Next. Il ne doit donc
 * jamais être importé depuis un composant client — la garde `server-only`
 * reste posée sur `dal.ts`, seul point d'entrée applicatif.
 */

/**
 * Instance Better Auth — système d'identité unique du site.
 *
 * Clients et administrateurs partagent ce même magasin de comptes. Le rôle
 * n'est jamais accepté depuis le navigateur (`input: false`) : il est écrit
 * uniquement côté serveur, par le script d'amorçage ou par un administrateur
 * via l'interface d'administration.
 */
export const auth = betterAuth({
  appName: 'Jacques-Daguerre Valcy',
  secret: env.authSecret,
  baseURL: env.serverURL,
  trustedOrigins,

  database: mongodbAdapter(getAuthDb(), {
    // L'instance MongoDB de production est autonome (pas de replica set) et ne
    // supporte donc pas les transactions, exactement comme la configuration
    // Payload (`transactionOptions: false`). Sans ce drapeau, l'adaptateur
    // tenterait d'ouvrir une session transactionnelle et échouerait.
    transaction: false,
  }),

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 12,
    autoSignIn: true,
  },

  socialProviders: env.google
    ? {
        google: {
          clientId: env.google.clientId,
          clientSecret: env.google.clientSecret,
        },
      }
    : {},

  user: {
    // Better Auth partage la collection `users` de Payload : une seule
    // identite, aucun mecanisme de synchronisation a maintenir. Verifie sur une
    // base jetable : les documents Payload existants restent intacts.
    modelName: 'users',
    additionalFields: {
      role: {
        type: 'string',
        required: false,
        defaultValue: DEFAULT_ROLE,
        // Jamais accepté depuis une requête client : une inscription qui
        // transporte `role: "super-admin"` est ignorée en silence.
        input: false,
      },
      suspended: {
        type: 'boolean',
        required: false,
        defaultValue: false,
        input: false,
      },
      forumBanned: {
        type: 'boolean',
        required: false,
        defaultValue: false,
        input: false,
      },
    },
  },

  account: {
    accountLinking: {
      // Une connexion Google dont l'adresse est vérifiée rejoint le compte
      // existant portant la même adresse, au lieu d'en créer un doublon.
      // C'est le chemin de reprise des comptes hérités.
      enabled: true,
      trustedProviders: ['google'],
      // `requireLocalEmailVerified` reste à sa valeur par défaut (true) :
      // sans cela, quelqu'un qui pré-enregistre l'adresse d'une victime
      // verrait l'identité Google de celle-ci rattachée à son propre compte.
      // La migration marque explicitement comme vérifiés les comptes connus.
    },
  },

  databaseHooks: {
    session: {
      create: {
        // Rétablit le suivi de `lastLogin`, auparavant assuré par le hook
        // `afterLogin` de Payload, désormais inopérant puisque la stratégie
        // locale est désactivée. Seul l'horodatage est journalisé.
        after: async (session) => {
          try {
            const { getAuthDb } = await import('./db')
            const { ObjectId } = await import('mongodb')
            await getAuthDb()
              .collection('users')
              .updateOne(
                { _id: new ObjectId(String(session.userId)) },
                { $set: { lastLogin: new Date() } },
              )
          } catch {
            // Le suivi de connexion ne doit jamais empêcher une connexion.
          }
        },
      },
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
    cookieCache: { enabled: true, maxAge: 5 * 60 },
  },

  advanced: {
    useSecureCookies: env.isProduction,
    defaultCookieAttributes: {
      httpOnly: true,
      sameSite: 'lax',
      secure: env.isProduction,
      path: '/',
    },
  },

  // Doit rester le dernier greffon : il propage les cookies définis pendant
  // une action serveur vers la réponse Next.
  plugins: [nextCookies()],
})

export type AuthInstance = typeof auth
