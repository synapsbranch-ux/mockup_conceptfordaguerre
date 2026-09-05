import { toNextJsHandler } from 'better-auth/next-js'

import { auth } from '@/lib/auth/server'

/**
 * Point d'entrée unique de Better Auth.
 *
 * Couvre l'inscription, la connexion, la déconnexion, le rappel OAuth Google et
 * la gestion de session. La protection CSRF et la vérification d'origine sont
 * assurées par Better Auth à partir de `trustedOrigins`.
 */
export const { GET, POST } = toNextJsHandler(auth)
