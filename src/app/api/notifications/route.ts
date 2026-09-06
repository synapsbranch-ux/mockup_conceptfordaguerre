import { NextResponse } from 'next/server'

import { z } from 'zod'

import { getPayloadClient } from '@/lib/payload'
import { notFound, ok, readBody, withUser } from '@/lib/server/api'

/**
 * Marquage des notifications comme lues.
 *
 * Deux formes : une notification precise, ou toutes celles de la personne.
 * Dans les deux cas la clause est bornee au destinataire issu de la session —
 * un identifiant appartenant a quelqu'un d'autre ne correspond a rien et
 * remonte introuvable, sans reveler son existence.
 */
const schema = z.union([
  z.object({ action: z.literal('read'), id: z.string().regex(/^[0-9a-fA-F]{24}$/) }),
  z.object({ action: z.literal('read_all') }),
])

export const PATCH = async (request: Request): Promise<NextResponse> =>
  withUser(request, { scope: 'notifications:read', limit: 120, windowSeconds: 10 * 60 }, async (user) => {
    const parsed = await readBody(request, schema)
    if (!parsed.ok) return parsed.response

    const payload = await getPayloadClient()

    if (parsed.data.action === 'read_all') {
      const result = await payload.update({
        collection: 'notifications',
        where: {
          and: [{ recipient: { equals: user.id } }, { read: { not_equals: true } }],
        },
        data: { read: true },
        overrideAccess: true,
        context: { disableRevalidate: true },
      })
      return ok({ updated: result.docs?.length ?? 0 })
    }

    // Verification de propriete avant ecriture.
    const existing = await payload
      .findByID({
        collection: 'notifications',
        id: parsed.data.id,
        depth: 0,
        overrideAccess: true,
      })
      .catch(() => null)

    if (!existing || String(existing.recipient) !== user.id) return notFound()

    await payload.update({
      collection: 'notifications',
      id: parsed.data.id,
      data: { read: true },
      overrideAccess: true,
      context: { disableRevalidate: true },
    })

    return ok({ id: parsed.data.id, read: true })
  })
