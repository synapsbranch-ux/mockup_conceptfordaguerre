import { NextResponse } from 'next/server'
import { z } from 'zod'

import { canTransitionProposal } from '@/lib/commerce/transitions'
import type { ProposalStatus } from '@/lib/commerce/transitions'
import { getPayloadClient } from '@/lib/payload'
import { fail, notFound, ok, readBody, withUser } from '@/lib/server/api'
import { recordAudit } from '@/lib/server/audit'
import { notify } from '@/lib/server/notify'
import { cleanText } from '@/lib/sanitize'

/**
 * Décision du client sur une proposition.
 *
 * Points de rigueur :
 *  - la propriété est revérifiée ici, jamais déduite de l'interface ;
 *  - la transition passe par `canTransitionProposal` : seul un client peut
 *    accepter ou refuser, et seulement depuis l'état « envoyée » ;
 *  - l'acceptation exige une **confirmation explicite** (`confirm: true`), pour
 *    qu'un appel accidentel n'engage personne ;
 *  - la conversion en projet est **unique**, garantie par l'index unique sur
 *    `sourceProposal` en plus de la vérification applicative.
 */

const decisionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('accept'),
    /** Garde-fou : l'acceptation engage, elle ne peut pas être implicite. */
    confirm: z.literal(true),
    note: z.string().max(2000).optional(),
  }),
  z.object({
    action: z.literal('decline'),
    note: z.string().max(2000).optional(),
  }),
])

export const PATCH = async (
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> =>
  withUser(request, { scope: 'proposal-decision', limit: 30, windowSeconds: 3600 }, async (user) => {
    const { id } = await params

    const body = await readBody(request, decisionSchema)
    if (!body.ok) return body.response

    const payload = await getPayloadClient()

    const proposal = await payload
      .findByID({ collection: 'proposals', id, depth: 0, overrideAccess: true })
      .catch(() => null)

    if (!proposal) return notFound()

    const ownerId =
      typeof proposal.customer === 'object'
        ? String((proposal.customer as { id: string })?.id)
        : String(proposal.customer ?? '')
    if (ownerId !== user.id) return notFound()

    const current = proposal.status as ProposalStatus
    const target: ProposalStatus = body.data.action === 'accept' ? 'accepted' : 'declined'

    if (!canTransitionProposal(current, target, 'customer')) {
      return fail(
        'forbidden_transition',
        409,
        current === 'accepted' || current === 'declined'
          ? 'Cette proposition a déjà fait l’objet d’une décision.'
          : 'Cette proposition n’attend pas de décision.',
      )
    }

    const updated = await payload.update({
      collection: 'proposals',
      id,
      data: {
        status: target,
        decision: {
          decidedAt: new Date().toISOString(),
          note: body.data.note ? cleanText(body.data.note, 2000) : undefined,
        },
      },
      overrideAccess: true,
      // La decision est celle du client : on la declare, faute de quoi
      // l'ecriture serveur (sans `req.user`) serait prise pour une origine
      // inconnue et refusee.
      context: { disableRevalidate: true, actor: 'customer' },
    })

    // --- Conversion en projet, une seule fois -------------------------------
    let projectId: string | null = null

    if (target === 'accepted') {
      // Vérification applicative d'abord, pour un message clair ; l'index
      // unique sur `sourceProposal` reste le garde-fou réel sous concurrence.
      if (proposal.convertedProject) {
        projectId = String(proposal.convertedProject)
      } else {
        try {
          const project = await payload.create({
            collection: 'clientProjects',
            data: {
              title: proposal.title ?? 'Projet',
              customer: ownerId,
              status: 'planned',
              sourceProposal: id,
              summary: proposal.summary ?? undefined,
            },
            overrideAccess: true,
            context: { disableRevalidate: true },
          })
          projectId = String(project.id)

          await payload.update({
            collection: 'proposals',
            id,
            data: { convertedProject: projectId },
            overrideAccess: true,
            context: { disableRevalidate: true },
          })
        } catch (error) {
          const code = (error as { code?: number })?.code
          const message = String((error as Error)?.message ?? '').toLowerCase()
          if (code === 11000 || message.includes('duplicate')) {
            // Une conversion concurrente a gagné : on la retrouve plutôt que
            // d'en créer une seconde.
            const found = await payload.find({
              collection: 'clientProjects',
              where: { sourceProposal: { equals: id } },
              limit: 1,
              depth: 0,
              overrideAccess: true,
            })
            projectId = found.docs[0] ? String(found.docs[0].id) : null
          } else {
            // La décision est déjà enregistrée : on ne la perd pas pour autant.
            console.error('[proposals] conversion en projet impossible', error)
          }
        }
      }

      // La demande d'origine suit la décision.
      if (proposal.quoteRequest) {
        await payload
          .update({
            collection: 'quoteRequests',
            id: String(proposal.quoteRequest),
            data: { status: 'accepted' },
            overrideAccess: true,
            context: { disableRevalidate: true, actor: 'staff' },
          })
          .catch((error) => console.error('[proposals] statut du devis non mis à jour', error))
      }
    } else if (proposal.quoteRequest) {
      await payload
        .update({
          collection: 'quoteRequests',
          id: String(proposal.quoteRequest),
          data: { status: 'declined' },
          overrideAccess: true,
          context: { disableRevalidate: true, actor: 'staff' },
        })
        .catch((error) => console.error('[proposals] statut du devis non mis à jour', error))
    }

    // Prévient le personnel.
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
        type: 'proposal_decision',
        title: target === 'accepted' ? 'Proposition acceptée' : 'Proposition refusée',
        body: `${user.name ?? user.email} — ${proposal.reference ?? ''}`,
        link: `/admin/propositions/${id}`,
      })
    }

    await recordAudit({
      action: 'proposal.sent',
      actor: user,
      targetCollection: 'proposals',
      targetId: id,
      targetLabel: String(proposal.reference ?? id),
      summary: target === 'accepted' ? 'Acceptée par le client.' : 'Refusée par le client.',
    })

    return ok({ status: updated.status, projectId })
  })
