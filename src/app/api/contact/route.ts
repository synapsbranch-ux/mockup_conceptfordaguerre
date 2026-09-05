import { NextResponse } from 'next/server'

import { getPayloadClient } from '@/lib/payload'
import { callerIdentifier, checkRateLimit } from '@/lib/rateLimit'
import { cleanEmail, cleanLine, cleanText, looksAutomated } from '@/lib/sanitize'

/**
 * Reception du formulaire de contact.
 *
 * La collection `contactSubmissions` n'autorise la creation qu'aux membres du
 * CMS : un POST anonyme sur l'API REST de Payload est refuse. Le public passe
 * donc par cette route, qui valide, assainit et limite le debit avant d'ecrire
 * avec `overrideAccess`.
 *
 * Aucune adresse IP ni empreinte de navigateur n'est conservee, et le contenu
 * du message n'est jamais journalise.
 */

const LIMIT = 5
const WINDOW_SECONDS = 15 * 60

export const POST = async (request: Request): Promise<NextResponse> => {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ status: 'invalid' }, { status: 400 })
  }

  const input = body as Record<string, unknown>

  // Robots : reponse volontairement identique a un succes, pour ne rien
  // apprendre a l'auteur de la soumission.
  if (looksAutomated({ honeypot: input.company, elapsed: input.elapsed })) {
    return NextResponse.json({ status: 'ok' })
  }

  const { allowed } = await checkRateLimit(
    'contact',
    callerIdentifier(request),
    LIMIT,
    WINDOW_SECONDS,
  )
  if (!allowed) {
    return NextResponse.json({ status: 'rate-limited' }, { status: 429 })
  }

  const name = cleanLine(input.name, 160)
  const email = cleanEmail(input.email)
  const message = cleanText(input.message, 8000)
  const consent = input.consent === true

  if (!name || !email || !message || !consent) {
    return NextResponse.json({ status: 'invalid' }, { status: 400 })
  }

  try {
    const payload = await getPayloadClient()
    await payload.create({
      collection: 'contactSubmissions',
      data: {
        name,
        email,
        organisation: cleanLine(input.organisation, 200) || undefined,
        subject: cleanLine(input.subject, 160) || undefined,
        message,
        consent: true,
        status: 'new',
        submittedAt: new Date().toISOString(),
      },
      overrideAccess: true,
      context: { disableRevalidate: true },
    })
    return NextResponse.json({ status: 'ok' })
  } catch {
    // Le detail de l'erreur reste cote serveur : il pourrait contenir la saisie.
    return NextResponse.json({ status: 'error' }, { status: 500 })
  }
}
