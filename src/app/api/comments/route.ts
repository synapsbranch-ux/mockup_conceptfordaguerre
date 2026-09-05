import { NextResponse } from 'next/server'

import { canPublish, createCommentSchema, resolveCommentMode } from '@/lib/server/community'
import { getPayloadClient } from '@/lib/payload'
import { badRequest, fail, notFound, ok, readBody, withUser } from '@/lib/server/api'
import { notify } from '@/lib/server/notify'

/**
 * Publication d'un commentaire sous un article public.
 *
 * Rien de ce qui touche à l'autorité n'est lu depuis le corps de la requête :
 *
 *  - l'auteur vient de la session ;
 *  - l'article est relu en base pour vérifier qu'il est réellement commentable
 *    et visible par cette personne ;
 *  - le statut est déduit du mode de modération, jamais transmis ;
 *  - un `parentId` désignant déjà une réponse est refusé, ce qui borne la
 *    profondeur à un seul niveau côté serveur.
 */
export const POST = async (request: Request): Promise<NextResponse> =>
  withUser(request, { scope: 'comment:create', limit: 10, windowSeconds: 10 * 60 }, async (user) => {
    const permission = canPublish(user)
    if (!permission.ok) return fail(permission.code, 403)

    const parsed = await readBody(request, createCommentSchema)
    if (!parsed.ok) return parsed.response
    const { articleId, body, parentId } = parsed.data

    const payload = await getPayloadClient()

    // L'article est relu avec les règles d'accès de cette personne : un article
    // réservé auquel elle n'a pas droit remonte introuvable, et non interdit.
    let article
    try {
      article = await payload.findByID({
        collection: 'articles',
        id: articleId,
        depth: 0,
        overrideAccess: false,
        user: user as never,
      })
    } catch {
      return notFound()
    }
    if (!article) return notFound()

    if (article.commentsEnabled === false) {
      return fail('comments_closed', 403, 'Les commentaires sont fermés pour cet article.')
    }

    // Un seul niveau de réponse : le parent doit être un commentaire racine du
    // même article.
    if (parentId) {
      let parent
      try {
        parent = await payload.findByID({
          collection: 'articleComments',
          id: parentId,
          depth: 0,
          overrideAccess: true,
        })
      } catch {
        return badRequest('Le commentaire auquel vous répondez est introuvable.')
      }
      if (!parent || parent.status !== 'published') {
        return badRequest('Le commentaire auquel vous répondez n’est plus disponible.')
      }
      if (parent.parent) {
        return badRequest('Les réponses ne peuvent pas être imbriquées davantage.')
      }
      if (String(parent.article) !== String(articleId)) {
        return badRequest('Ce commentaire n’appartient pas à cet article.')
      }
    }

    const mode = await resolveCommentMode(article)
    const status = mode === 'premoderated' ? 'pending' : 'published'

    const created = await payload.create({
      collection: 'articleComments',
      data: {
        article: articleId,
        author: user.id,
        parent: parentId ?? undefined,
        body,
        status,
        reportCount: 0,
      },
      overrideAccess: true,
      context: { disableRevalidate: true },
    })

    // Notifie l'auteur du commentaire parent, sauf s'il se répond à lui-même.
    if (parentId && status === 'published') {
      const parent = await payload
        .findByID({ collection: 'articleComments', id: parentId, depth: 0, overrideAccess: true })
        .catch(() => null)
      const parentAuthor = parent?.author ? String(parent.author) : null
      if (parentAuthor && parentAuthor !== user.id) {
        await notify({
          recipient: parentAuthor,
          type: 'comment_reply',
          title: 'Réponse à votre commentaire',
          body: `${user.name || 'Une personne'} a répondu à votre commentaire.`,
          link: `/blog/${article.slug}#commentaire-${created.id}`,
        })
      }
    }

    return ok(
      {
        id: created.id,
        status,
        // L'interface doit dire la vérité : en prémodération, le commentaire
        // n'est pas encore visible publiquement.
        pending: status === 'pending',
      },
      201,
    )
  })
