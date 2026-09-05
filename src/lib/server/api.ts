import 'server-only'

import { NextResponse } from 'next/server'
import type { ZodType } from 'zod'

import { authenticateRequest, authenticateStaffRequest } from '@/lib/auth/dal'
import type { SessionUser } from '@/lib/auth/dal'
import { callerIdentifier, checkRateLimit } from '@/lib/rateLimit'

/**
 * Ossature commune des routes d'API.
 *
 * Chaque mutation refait pour elle-même : authentification, autorisation,
 * limitation de débit et validation. Aucune ne se fie à l'interface qui l'a
 * appelée — un bouton masqué n'est pas une autorisation.
 *
 * Les erreurs renvoyées sont volontairement pauvres : un détail technique
 * pourrait révéler la structure interne ou la donnée d'autrui. Le détail reste
 * côté serveur.
 */

export const ok = <T>(data: T, status = 200): NextResponse =>
  NextResponse.json({ ok: true, data }, { status })

export const fail = (code: string, status: number, message?: string): NextResponse =>
  NextResponse.json({ ok: false, code, message }, { status })

/** 404 plutôt que 403 : l'existence d'une ressource privée n'est pas divulguée. */
export const notFound = (): NextResponse => fail('not_found', 404)

export const badRequest = (message = 'Requête invalide.'): NextResponse =>
  fail('invalid', 400, message)

export const rateLimited = (): NextResponse =>
  fail('rate_limited', 429, 'Trop de requêtes. Réessayer dans quelques instants.')

export const serverError = (): NextResponse =>
  fail('error', 500, 'Le service est momentanément indisponible.')

/** Lit et valide un corps JSON avec un schéma Zod. */
export const readBody = async <T>(
  request: Request,
  schema: ZodType<T>,
): Promise<{ ok: true; data: T } | { ok: false; response: NextResponse }> => {
  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return { ok: false, response: badRequest('Corps de requête illisible.') }
  }

  const parsed = schema.safeParse(raw)
  if (!parsed.success) {
    // Le premier message suffit à corriger la saisie ; on n'expose pas
    // l'arborescence complète du schéma.
    const first = parsed.error.issues[0]
    return {
      ok: false,
      response: badRequest(first?.message ?? 'Données invalides.'),
    }
  }

  return { ok: true, data: parsed.data }
}

type Guard = { limit: number; windowSeconds: number; scope: string }

/**
 * Enveloppe une mutation authentifiée : session valide, compte non suspendu,
 * débit contrôlé.
 */
export const withUser = async (
  request: Request,
  guard: Guard,
  handler: (user: SessionUser) => Promise<NextResponse>,
): Promise<NextResponse> => {
  const auth = await authenticateRequest()
  if (!auth.ok) return fail(auth.code, auth.status)

  // Le compteur est indexé sur l'identifiant de compte, pas sur l'IP : plus
  // juste derrière un partage de connexion, et sans conserver d'adresse.
  const { allowed } = await checkRateLimit(
    guard.scope,
    auth.user.id,
    guard.limit,
    guard.windowSeconds,
  )
  if (!allowed) return rateLimited()

  try {
    return await handler(auth.user)
  } catch (error) {
    console.error(`[api:${guard.scope}]`, error)
    return serverError()
  }
}

/** Idem, réservé au personnel. */
export const withStaff = async (
  request: Request,
  guard: Guard,
  handler: (user: SessionUser) => Promise<NextResponse>,
): Promise<NextResponse> => {
  const auth = await authenticateStaffRequest()
  if (!auth.ok) return fail(auth.code, auth.status)

  const { allowed } = await checkRateLimit(
    guard.scope,
    auth.user.id,
    guard.limit,
    guard.windowSeconds,
  )
  if (!allowed) return rateLimited()

  try {
    return await handler(auth.user)
  } catch (error) {
    console.error(`[api:${guard.scope}]`, error)
    return serverError()
  }
}

/** Enveloppe une route publique : débit contrôlé par appelant. */
export const withPublic = async (
  request: Request,
  guard: Guard,
  handler: () => Promise<NextResponse>,
): Promise<NextResponse> => {
  const { allowed } = await checkRateLimit(
    guard.scope,
    callerIdentifier(request),
    guard.limit,
    guard.windowSeconds,
  )
  if (!allowed) return rateLimited()

  try {
    return await handler()
  } catch (error) {
    console.error(`[api:${guard.scope}]`, error)
    return serverError()
  }
}
