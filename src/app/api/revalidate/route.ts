import { revalidateTag } from 'next/cache'
import { NextResponse } from 'next/server'

import { env } from '@/lib/env'
import { getPayloadClient } from '@/lib/payload'

/**
 * Invalidation du cache a la demande.
 *
 * Les hooks Payload invalident deja le cache lorsqu'une modification passe par
 * l'application (admin ou API). Les scripts en ligne de commande — seed,
 * migration — s'executent hors contexte Next et ne le peuvent pas : ils
 * sollicitent cette route en fin d'execution.
 *
 * Deux voies d'autorisation, l'une ou l'autre :
 *  - le secret `PREVIEW_SECRET`, utilise par les scripts locaux ;
 *  - une session Payload appartenant a un membre actif du CMS.
 */

const TAGS = ['content', 'pages', 'projects', 'articles', 'services', 'commitments', 'globals']

const authorize = async (request: Request): Promise<boolean> => {
  const provided = request.headers.get('x-revalidate-secret')
  if (provided && provided === env.previewSecret) return true

  const payload = await getPayloadClient()
  const { user } = await payload.auth({ headers: request.headers })
  return Boolean(user && user.collection === 'users' && user.active !== false)
}

export const POST = async (request: Request): Promise<NextResponse> => {
  if (!(await authorize(request))) {
    return NextResponse.json({ error: 'Non autorise.' }, { status: 401 })
  }

  for (const tag of TAGS) revalidateTag(tag, 'max')

  return NextResponse.json({ status: 'revalidated', tags: TAGS })
}
