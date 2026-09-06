import { NextResponse } from 'next/server'
import { z } from 'zod'

import { isStaffRole } from '@/lib/auth/roles'
import { getPayloadClient } from '@/lib/payload'
import { fail, ok, readBody, withUser } from '@/lib/server/api'
import { notify } from '@/lib/server/notify'
import { cleanLine, cleanText } from '@/lib/sanitize'

/**
 * Conversations et messages.
 *
 * L'appartenance d'un message est portée par sa conversation. Payload ne sait
 * pas exprimer une jointure dans une clause d'accès, donc la vérification est
 * faite ici, explicitement, avant toute lecture ou écriture : on charge la
 * conversation, on compare son `customer` à la session, puis seulement on
 * touche aux messages.
 *
 * `authorSide` est déduit du rôle en session, jamais transmis par le
 * navigateur : sans quoi un client pourrait poster un message se présentant
 * comme venant de l'équipe.
 */

const createSchema = z.object({
  subject: z.string().min(3).max(200),
  body: z.string().min(1).max(10000),
  contextKind: z
    .enum(['general', 'quote', 'service', 'invoice', 'project', 'appointment', 'document'])
    .default('general'),
  contextId: z.string().max(64).optional(),
})

/** Ouvre une conversation et y dépose le premier message. */
export const POST = async (request: Request): Promise<NextResponse> =>
  withUser(request, { scope: 'conversation-create', limit: 15, windowSeconds: 3600 }, async (user) => {
    const body = await readBody(request, createSchema)
    if (!body.ok) return body.response

    const input = body.data
    const payload = await getPayloadClient()

    const contextField: Record<string, string> = {}
    if (input.contextId) {
      const map: Record<string, string> = {
        quote: 'quoteRequest',
        project: 'project',
        invoice: 'invoice',
        appointment: 'appointment',
        document: 'document',
      }
      const key = map[input.contextKind]
      if (key) contextField[key] = input.contextId
    }

    const conversation = await payload.create({
      collection: 'conversations',
      data: {
        subject: cleanLine(input.subject, 200),
        customer: user.id,
        contextKind: input.contextKind,
        context: contextField,
        status: 'open',
        lastMessageAt: new Date().toISOString(),
        unreadForStaff: 1,
        unreadForCustomer: 0,
      },
      overrideAccess: true,
      context: { disableRevalidate: true },
    })

    await payload.create({
      collection: 'messages',
      data: {
        conversation: conversation.id,
        author: user.id,
        // Déduit de la session, jamais du corps de la requête.
        authorSide: 'customer',
        body: cleanText(input.body, 10000),
      },
      overrideAccess: true,
      context: { disableRevalidate: true },
    })

    const staff = await payload.find({
      collection: 'users',
      where: {
        and: [{ role: { in: ['editor', 'super-admin'] } }, { active: { not_equals: false } }],
      },
      limit: 20,
      depth: 0,
      overrideAccess: true,
    })
    for (const member of staff.docs) {
      await notify({
        recipient: String(member.id),
        type: 'message',
        title: 'Nouvelle conversation',
        body: `${user.name ?? user.email} — ${cleanLine(input.subject, 90)}`,
        link: `/admin/conversations/${conversation.id}`,
      })
    }

    return ok({ id: String(conversation.id) }, 201)
  })

const replySchema = z.object({
  conversation: z.string().min(1).max(64),
  body: z.string().min(1).max(10000),
})

/** Répond dans une conversation existante. */
export const PATCH = async (request: Request): Promise<NextResponse> =>
  withUser(request, { scope: 'message-reply', limit: 60, windowSeconds: 3600 }, async (user) => {
    const body = await readBody(request, replySchema)
    if (!body.ok) return body.response

    const payload = await getPayloadClient()
    const staff = isStaffRole(user.role)

    const conversation = await payload
      .findByID({
        collection: 'conversations',
        id: body.data.conversation,
        depth: 0,
        overrideAccess: true,
      })
      .catch(() => null)

    if (!conversation) return fail('not_found', 404)

    const ownerId =
      typeof conversation.customer === 'object'
        ? String((conversation.customer as { id: string })?.id)
        : String(conversation.customer ?? '')

    // Un client ne peut écrire que dans SES conversations ; l'équipe partout.
    if (!staff && ownerId !== user.id) return fail('not_found', 404)

    if (conversation.status === 'archived') {
      return fail('closed', 409, 'Cette conversation est archivée.')
    }

    await payload.create({
      collection: 'messages',
      data: {
        conversation: conversation.id,
        author: user.id,
        authorSide: staff ? 'staff' : 'customer',
        body: cleanText(body.data.body, 10000),
      },
      overrideAccess: true,
      context: { disableRevalidate: true },
    })

    // Le compteur de non-lus vise l'autre partie. Répondre rouvre aussi une
    // conversation fermée : une réponse ne doit pas disparaître.
    await payload.update({
      collection: 'conversations',
      id: conversation.id,
      data: {
        lastMessageAt: new Date().toISOString(),
        status: conversation.status === 'closed' ? 'open' : conversation.status,
        unreadForCustomer: staff ? (conversation.unreadForCustomer ?? 0) + 1 : 0,
        unreadForStaff: staff ? 0 : (conversation.unreadForStaff ?? 0) + 1,
      },
      overrideAccess: true,
      context: { disableRevalidate: true },
    })

    if (staff && ownerId) {
      await notify({
        recipient: ownerId,
        type: 'message',
        title: 'Nouvelle réponse de l’équipe',
        body: cleanLine(body.data.body, 90),
        link: `/espace-client/messages/${conversation.id}`,
      })
    }

    return ok({ conversation: String(conversation.id) })
  })
