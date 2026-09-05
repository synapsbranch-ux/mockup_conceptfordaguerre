import { NextResponse } from 'next/server'

import { getPayloadClient } from '@/lib/payload'
import { callerIdentifier, checkRateLimit } from '@/lib/rateLimit'
import { cleanEmail, cleanLine, looksAutomated } from '@/lib/sanitize'

/**
 * Inscription a l'infolettre.
 *
 * L'unicite de l'adresse est garantie par un index unique. Une adresse deja
 * active renvoie `already-subscribed` sans creer de doublon ; une adresse
 * precedemment desabonnee est reactivee.
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

  if (looksAutomated({ honeypot: input.company, elapsed: input.elapsed })) {
    return NextResponse.json({ status: 'ok' })
  }

  const { allowed } = await checkRateLimit(
    'newsletter',
    callerIdentifier(request),
    LIMIT,
    WINDOW_SECONDS,
  )
  if (!allowed) {
    return NextResponse.json({ status: 'rate-limited' }, { status: 429 })
  }

  const email = cleanEmail(input.email)
  if (!email) {
    return NextResponse.json({ status: 'invalid' }, { status: 400 })
  }

  const source = cleanLine(input.source, 60) || 'site'
  const name = cleanLine(input.name, 160)

  try {
    const payload = await getPayloadClient()
    const existing = await payload.find({
      collection: 'newsletterSubscribers',
      where: { email: { equals: email } },
      limit: 1,
      overrideAccess: true,
    })

    if (existing.totalDocs > 0) {
      const subscriber = existing.docs[0]
      if (subscriber.status === 'active') {
        return NextResponse.json({ status: 'already-subscribed' })
      }
      // Reinscription : on reactive l'enregistrement plutot que d'en creer un second.
      await payload.update({
        collection: 'newsletterSubscribers',
        id: subscriber.id,
        data: {
          status: 'active',
          consent: true,
          source,
          subscribedAt: new Date().toISOString(),
        },
        overrideAccess: true,
        context: { disableRevalidate: true },
      })
      return NextResponse.json({ status: 'ok' })
    }

    await payload.create({
      collection: 'newsletterSubscribers',
      data: {
        email,
        name: name || undefined,
        status: 'active',
        consent: true,
        source,
        subscribedAt: new Date().toISOString(),
      },
      overrideAccess: true,
      context: { disableRevalidate: true },
    })

    return NextResponse.json({ status: 'ok' })
  } catch {
    return NextResponse.json({ status: 'error' }, { status: 500 })
  }
}
