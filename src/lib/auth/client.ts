'use client'

import { createAuthClient } from 'better-auth/react'

/**
 * Client d'authentification côté navigateur.
 *
 * Aucun secret ici : le client ne fait qu'appeler `/api/auth/*`. L'URL de base
 * est relative pour rester valable en développement comme en production.
 */
export const authClient = createAuthClient({ basePath: '/api/auth' })

export const { signIn, signOut, signUp, useSession } = authClient
