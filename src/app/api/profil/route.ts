import { NextResponse } from 'next/server'

import { z } from 'zod'

import { getPayloadClient } from '@/lib/payload'
import { ok, readBody, withUser } from '@/lib/server/api'

/**
 * Mise à jour du profil par son propriétaire.
 *
 * Le schéma est une **liste blanche** : seuls les champs énumérés ici sont
 * écrits. C'est délibéré — une mise à jour naïve qui recopierait le corps de la
 * requête permettrait à quiconque de se promouvoir en écrivant `role`, ou de
 * lever sa propre suspension. Ces champs ne sont pas seulement absents du
 * schéma, ils sont aussi protégés au niveau de la collection.
 *
 * L'identifiant écrit vient toujours de la session, jamais du corps.
 */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value === '' ? undefined : value))

const schema = z.object({
  firstName: optionalText(80),
  lastName: optionalText(80),
  phone: optionalText(40),
  company: optionalText(160),
  jobTitle: optionalText(120),
  country: optionalText(80),
  industry: optionalText(120),
  website: optionalText(200),
  preferredLocale: z.enum(['fr', 'en']).optional(),
  timezone: optionalText(64),
  notificationPreferences: z
    .object({
      messages: z.boolean().optional(),
      proposals: z.boolean().optional(),
      invoices: z.boolean().optional(),
      appointments: z.boolean().optional(),
      community: z.boolean().optional(),
    })
    .optional(),
  newsletterOptIn: z.boolean().optional(),
})

/** Refuse une URL qui n'est pas une adresse web ordinaire. */
const isSafeWebsite = (value: string | undefined): boolean => {
  if (!value) return true
  try {
    const url = new URL(value.startsWith('http') ? value : `https://${value}`)
    return url.protocol === 'https:' || url.protocol === 'http:'
  } catch {
    return false
  }
}

/** Refuse un fuseau horaire inconnu, qui casserait l'affichage des rendez-vous. */
const isKnownTimezone = (value: string | undefined): boolean => {
  if (!value) return true
  try {
    new Intl.DateTimeFormat('fr-CA', { timeZone: value })
    return true
  } catch {
    return false
  }
}

export const PATCH = async (request: Request): Promise<NextResponse> =>
  withUser(request, { scope: 'profile:update', limit: 20, windowSeconds: 10 * 60 }, async (user) => {
    const parsed = await readBody(request, schema)
    if (!parsed.ok) return parsed.response

    const data = parsed.data

    if (!isSafeWebsite(data.website)) {
      return NextResponse.json(
        { ok: false, code: 'invalid', message: 'L’adresse du site web n’est pas valide.' },
        { status: 400 },
      )
    }
    if (!isKnownTimezone(data.timezone)) {
      return NextResponse.json(
        { ok: false, code: 'invalid', message: 'Fuseau horaire inconnu.' },
        { status: 400 },
      )
    }

    const payload = await getPayloadClient()

    // Le nom affiché suit le prénom et le nom lorsqu'ils sont renseignés.
    const displayName = [data.firstName, data.lastName].filter(Boolean).join(' ').trim()

    const updated = await payload.update({
      collection: 'users',
      // Identifiant issu de la session : jamais du corps de la requête.
      id: user.id,
      data: {
        ...data,
        ...(displayName ? { name: displayName } : {}),
      },
      overrideAccess: true,
      context: { disableRevalidate: true },
    })

    return ok({ id: updated.id, name: updated.name })
  })
