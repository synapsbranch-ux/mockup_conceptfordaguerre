import { NextResponse } from 'next/server'

import { z } from 'zod'

import { getPayloadClient } from '@/lib/payload'
import { notFound, ok, readBody, withUser } from '@/lib/server/api'

/**
 * Mise en favori d'un article (bascule).
 *
 * L'article est relu avec les regles d'acces de la personne : on ne peut pas
 * mettre en favori un article qu'on n'a pas le droit de lire, ce qui
 * empecherait sinon de deviner l'existence d'un article reserve.
 *
 * L'unicite (personne, article) est tenue par un index compose : une course
 * perdue produit le meme resultat qu'un succes.
 */
const schema = z.object({ articleId: z.string().regex(/^[0-9a-fA-F]{24}$/) })

export const POST = async (request: Request): Promise<NextResponse> =>
  withUser(request, { scope: 'favorite:toggle', limit: 60, windowSeconds: 10 * 60 }, async (user) => {
    const parsed = await readBody(request, schema)
    if (!parsed.ok) return parsed.response
    const { articleId } = parsed.data

    const payload = await getPayloadClient()

    const article = await payload
      .findByID({
        collection: 'articles',
        id: articleId,
        depth: 0,
        overrideAccess: false,
        user: user as never,
      })
      .catch(() => null)
    if (!article) return notFound()

    const existing = await payload.find({
      collection: 'articleFavorites',
      where: { and: [{ user: { equals: user.id } }, { article: { equals: articleId } }] },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })

    if (existing.docs.length > 0) {
      await payload.delete({
        collection: 'articleFavorites',
        id: existing.docs[0].id,
        overrideAccess: true,
        context: { disableRevalidate: true },
      })
      return ok({ favorite: false })
    }

    try {
      await payload.create({
        collection: 'articleFavorites',
        data: { user: user.id, article: articleId },
        overrideAccess: true,
        context: { disableRevalidate: true },
      })
    } catch {
      // Deja en favori : l'index a tranche, resultat identique.
    }
    return ok({ favorite: true })
  })
