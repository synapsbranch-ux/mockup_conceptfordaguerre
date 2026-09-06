import { NextResponse } from 'next/server'
import { z } from 'zod'

import { getSessionUser } from '@/lib/auth/dal'
import { getPayloadClient } from '@/lib/payload'
import { ok, readBody, withPublic } from '@/lib/server/api'
import { notify } from '@/lib/server/notify'
import { cleanEmail, cleanLine, cleanText, looksAutomated } from '@/lib/sanitize'

/**
 * Demande de devis **sans compte**.
 *
 * La demande est enregistrée avec `guestEmail` et pourra être réclamée plus
 * tard par la personne qui se connectera avec une adresse vérifiée
 * correspondante. Elle n'est jamais rattachée à un compte ici : le rattachement
 * exige une preuve de possession de l'adresse, qu'un formulaire public ne
 * fournit pas.
 *
 * Protection reprise du formulaire de contact, déjà éprouvée : champ leurre,
 * délai minimal de remplissage et limitation de débit. La réponse à une
 * soumission automatisée est volontairement identique à un succès, pour ne rien
 * apprendre à son auteur.
 */

const guestQuoteSchema = z.object({
  name: z.string().min(2).max(160),
  email: z.string().email().max(254),
  organisation: z.string().max(200).optional(),
  service: z.string().max(64).optional(),
  objectives: z.string().min(20).max(6000),
  budgetRange: z.enum(['under_2k', '2k_5k', '5k_15k', 'over_15k', 'unknown']).optional(),
  consent: z.literal(true),
  /** Champ leurre : invisible pour une personne. */
  company: z.string().max(200).optional(),
  /** Millisecondes écoulées depuis l'affichage du formulaire. */
  elapsed: z.number().optional(),
})

export const POST = async (request: Request): Promise<NextResponse> =>
  withPublic(request, { scope: 'public-quote', limit: 5, windowSeconds: 900 }, async () => {
    const body = await readBody(request, guestQuoteSchema)
    if (!body.ok) return body.response

    const input = body.data

    if (looksAutomated({ honeypot: input.company, elapsed: input.elapsed })) {
      return ok({ received: true })
    }

    const email = cleanEmail(input.email)
    if (!email) return ok({ received: true })

    const payload = await getPayloadClient()

    // Une personne déjà connectée n'a aucune raison de passer par le formulaire
    // invité : sa demande est rattachée à son compte.
    const sessionUser = await getSessionUser()

    const created = await payload.create({
      collection: 'quoteRequests',
      data: {
        customer: sessionUser?.id,
        guestEmail: sessionUser ? undefined : email,
        guestName: sessionUser ? undefined : cleanLine(input.name, 160),
        status: 'submitted',
        service: input.service || undefined,
        objectives: cleanText(input.objectives, 6000),
        budgetRange: input.budgetRange,
        submittedAt: new Date().toISOString(),
      },
      overrideAccess: true,
      context: { disableRevalidate: true, actor: 'staff' },
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
        type: 'quote_status',
        title: 'Nouvelle demande de devis (sans compte)',
        body: `${cleanLine(input.name, 60)} — ${cleanLine(input.objectives, 80)}`,
        link: `/admin/devis`,
      })
    }

    return ok({ received: true, reference: created.reference }, 201)
  })
