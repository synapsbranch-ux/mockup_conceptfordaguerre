import { NextResponse } from 'next/server'
import { z } from 'zod'

import { getPayloadClient } from '@/lib/payload'
import { fail, ok, readBody, withUser } from '@/lib/server/api'
import { notify } from '@/lib/server/notify'
import { cleanLine, cleanText } from '@/lib/sanitize'

/**
 * Création et envoi d'une demande de devis.
 *
 * Deux temps distincts : un brouillon appartient au client et reste modifiable,
 * l'envoi le fige et déclenche le traitement. Le statut n'est jamais lu depuis
 * la requête — il découle de l'action demandée, et la collection revérifie la
 * transition.
 *
 * L'envoi est **idempotent** : une clé fournie par le client empêche qu'un
 * double clic ou un renvoi réseau crée deux demandes identiques.
 */

const quoteSchema = z.object({
  service: z.string().max(64).optional(),
  objectives: z.string().min(20).max(6000),
  budgetRange: z
    .enum(['under_2k', '2k_5k', '5k_15k', 'over_15k', 'unknown'])
    .optional(),
  desiredStart: z.string().datetime().optional(),
  desiredDeadline: z.string().datetime().optional(),
  /** `true` envoie immédiatement, `false` conserve un brouillon. */
  submit: z.boolean().default(false),
  /** Clé d'idempotence, générée par le navigateur. */
  idempotencyKey: z.string().min(8).max(64).optional(),
})

export const POST = async (request: Request): Promise<NextResponse> =>
  withUser(request, { scope: 'quote-create', limit: 20, windowSeconds: 3600 }, async (user) => {
    const body = await readBody(request, quoteSchema)
    if (!body.ok) return body.response

    const input = body.data
    const payload = await getPayloadClient()

    // Idempotence — une demande identique récemment créée est renvoyée telle
    // quelle plutôt que dupliquée.
    if (input.idempotencyKey) {
      const existing = await payload.find({
        collection: 'quoteRequests',
        where: {
          and: [
            { customer: { equals: user.id } },
            { idempotencyKey: { equals: input.idempotencyKey } },
          ],
        },
        limit: 1,
        depth: 0,
        overrideAccess: true,
      })

      if (existing.docs[0]) {
        return ok({
          id: String(existing.docs[0].id),
          reference: existing.docs[0].reference,
          status: existing.docs[0].status,
          duplicate: true,
        })
      }
    }

    const created = await payload.create({
      collection: 'quoteRequests',
      data: {
        customer: user.id,
        // Le statut découle de l'action, jamais d'un champ transmis.
        status: input.submit ? 'submitted' : 'draft',
        service: input.service || undefined,
        objectives: cleanText(input.objectives, 6000),
        budgetRange: input.budgetRange,
        desiredStart: input.desiredStart,
        desiredDeadline: input.desiredDeadline,
        idempotencyKey: input.idempotencyKey,
        submittedAt: input.submit ? new Date().toISOString() : undefined,
      },
      overrideAccess: true,
      context: { disableRevalidate: true },
    })

    if (input.submit) {
      // Prévient le personnel. Aucun destinataire codé en dur : tous les
      // comptes du personnel actifs sont notifiés.
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
          type: 'quote_status',
          title: 'Nouvelle demande de devis',
          body: `${user.name ?? user.email} — ${cleanLine(input.objectives, 90)}`,
          link: `/admin/devis/${created.id}`,
        })
      }
    }

    return ok(
      {
        id: String(created.id),
        reference: created.reference,
        status: created.status,
        duplicate: false,
      },
      201,
    )
  })

const updateSchema = z.object({
  id: z.string().min(1).max(64),
  action: z.literal('submit'),
})

/** Envoi d'un brouillon existant. */
export const PATCH = async (request: Request): Promise<NextResponse> =>
  withUser(request, { scope: 'quote-submit', limit: 20, windowSeconds: 3600 }, async (user) => {
    const body = await readBody(request, updateSchema)
    if (!body.ok) return body.response

    const payload = await getPayloadClient()

    const existing = await payload
      .findByID({ collection: 'quoteRequests', id: body.data.id, depth: 0, overrideAccess: true })
      .catch(() => null)

    if (!existing) return fail('not_found', 404)

    // Propriété vérifiée indépendamment de l'interface appelante.
    const ownerId =
      typeof existing.customer === 'object'
        ? String((existing.customer as { id: string })?.id)
        : String(existing.customer ?? '')
    if (ownerId !== user.id) return fail('not_found', 404)

    if (existing.status !== 'draft') {
      return fail('forbidden_transition', 409, 'Cette demande a déjà été envoyée.')
    }

    const updated = await payload.update({
      collection: 'quoteRequests',
      id: body.data.id,
      data: { status: 'submitted' },
      overrideAccess: true,
      context: { disableRevalidate: true, actor: 'customer' },
    })

    return ok({ id: String(updated.id), status: updated.status })
  })
