import { Readable } from 'node:stream'

import { NextResponse } from 'next/server'

import { getSessionUser } from '@/lib/auth/dal'
import { getPayloadClient } from '@/lib/payload'
import { callerIdentifier, checkRateLimit } from '@/lib/rateLimit'
import { gridfsInternals } from '@/payload/storage/gridfsAdapter'

/**
 * Téléchargement sécurisé d'un document.
 *
 * L'autorisation est refaite **à chaque requête**, jamais déduite d'un lien
 * précédemment obtenu :
 *
 *  - le document est lu avec les droits réels de la personne
 *    (`overrideAccess: false`), donc la clause `read` de la collection
 *    s'applique — public, comptes connectés, ou clients désignés ;
 *  - un document non autorisé répond **404**, jamais 403 : confirmer
 *    l'existence d'une ressource privée permettrait de l'énumérer ;
 *  - aucune URL publique permanente n'est jamais émise. Le binaire ne sort que
 *    par cette route, et la réponse est marquée `private, no-store` pour qu'un
 *    intermédiaire ne la conserve pas.
 *
 * L'historique est écrit après coup et de façon défensive : une panne
 * d'analytique ne doit jamais empêcher un téléchargement légitime.
 */

export const dynamic = 'force-dynamic'

export const GET = async (
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> => {
  const { id } = await params

  const sessionUser = await getSessionUser()

  // Le débit est compté par compte quand il y en a un, sinon par appelant.
  const { allowed } = await checkRateLimit(
    'document-download',
    sessionUser?.id ?? callerIdentifier(request),
    120,
    3600,
  )
  if (!allowed) {
    return NextResponse.json({ ok: false, code: 'rate_limited' }, { status: 429 })
  }

  const payload = await getPayloadClient()

  // Lecture AVEC les droits de la personne : c'est la barrière d'autorisation.
  const document = await payload
    .findByID({
      collection: 'documents',
      id,
      depth: 0,
      overrideAccess: false,
      ...(sessionUser ? { user: { ...sessionUser, collection: 'users' } } : {}),
    })
    .catch(() => null)

  // Introuvable, archivé, ou simplement pas autorisé : même réponse.
  if (!document || document.archived === true) {
    return NextResponse.json({ ok: false, code: 'not_found' }, { status: 404 })
  }

  const filename = document.filename
  if (!filename) {
    return NextResponse.json({ ok: false, code: 'not_found' }, { status: 404 })
  }

  const bucket = gridfsInternals.getBucket(payload)
  const file = await gridfsInternals.findFile(bucket, filename)

  if (!file) {
    // Métadonnées présentes mais binaire absent : anomalie côté stockage.
    console.error(`[documents] binaire introuvable pour ${id} (${filename})`)
    return NextResponse.json({ ok: false, code: 'not_found' }, { status: 404 })
  }

  // Historique — jamais bloquant.
  try {
    await payload.create({
      collection: 'downloadEvents',
      data: {
        user: sessionUser?.id,
        document: id,
        documentTitle: document.title ?? filename,
      },
      overrideAccess: true,
      context: { disableRevalidate: true },
    })
    await payload.update({
      collection: 'documents',
      id,
      data: { downloadCount: (document.downloadCount ?? 0) + 1 },
      overrideAccess: true,
      context: { disableRevalidate: true },
    })
  } catch (error) {
    console.error('[documents] historique non enregistré', error)
  }

  const stream = bucket.openDownloadStream(file._id)

  // Le nom est nettoyé avant de partir dans un en-tête : un retour chariot ou
  // un guillemet permettrait d'injecter d'autres en-têtes dans la réponse.
  const safeName = (document.title ? `${document.title}` : filename)
    .replace(/[\r\n"\\]/g, '')
    .slice(0, 120)
  const extension = filename.includes('.') ? filename.slice(filename.lastIndexOf('.')) : ''
  const downloadName = safeName.endsWith(extension) ? safeName : `${safeName}${extension}`

  return new Response(Readable.toWeb(stream) as ReadableStream, {
    status: 200,
    headers: {
      'Content-Type': document.mimeType ?? file.contentType ?? 'application/octet-stream',
      'Content-Length': String(file.length),
      // `attachment` : le fichier est enregistré, jamais rendu dans la page —
      // ce qui neutralise un HTML ou un SVG piégé servi depuis notre origine.
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(downloadName)}`,
      // Aucun cache partagé : la réponse dépend de qui la demande.
      'Cache-Control': 'private, no-store, max-age=0',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
