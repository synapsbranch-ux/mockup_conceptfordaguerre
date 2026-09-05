import { draftMode } from 'next/headers'
import { redirect } from 'next/navigation'
import { NextResponse } from 'next/server'

import { env } from '@/lib/env'
import { getPayloadClient } from '@/lib/payload'
import { publicPathFor, type PreviewableCollection } from '@/payload/utils/preview'

/**
 * Ouverture d'une previsualisation de brouillon.
 *
 * Deux conditions cumulatives, l'une ne suffisant pas :
 *  1. le secret `PREVIEW_SECRET` present dans l'URL generee par l'admin ;
 *  2. une session Payload valide appartenant a un membre actif du CMS.
 *
 * Un visiteur anonyme qui obtiendrait le lien n'accede donc a rien.
 */

const COLLECTIONS: PreviewableCollection[] = ['pages', 'projects', 'articles']

const isPreviewable = (value: string | null): value is PreviewableCollection =>
  Boolean(value) && COLLECTIONS.includes(value as PreviewableCollection)

export const GET = async (request: Request): Promise<NextResponse | never> => {
  const { searchParams } = new URL(request.url)
  const secret = searchParams.get('secret')
  const collection = searchParams.get('collection')
  const slug = searchParams.get('slug')

  if (secret !== env.previewSecret) {
    return NextResponse.json({ error: 'Secret de previsualisation invalide.' }, { status: 401 })
  }

  if (!isPreviewable(collection) || !slug) {
    return NextResponse.json({ error: 'Parametres de previsualisation manquants.' }, { status: 400 })
  }

  const payload = await getPayloadClient()
  const { user } = await payload.auth({ headers: request.headers })

  if (!user || user.collection !== 'users' || user.active === false) {
    return NextResponse.json(
      { error: 'Authentification requise pour previsualiser un brouillon.' },
      { status: 403 },
    )
  }

  // Le document doit exister, brouillon compris, avant d'ouvrir la session.
  const { docs } = await payload.find({
    collection,
    where: { slug: { equals: slug } },
    limit: 1,
    draft: true,
    overrideAccess: false,
    user,
  })

  if (docs.length === 0) {
    return NextResponse.json({ error: 'Document introuvable.' }, { status: 404 })
  }

  const draft = await draftMode()
  draft.enable()

  redirect(publicPathFor(collection, slug))
}
