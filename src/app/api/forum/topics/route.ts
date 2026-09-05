import { NextResponse } from 'next/server'

import { canPublish, createTopicSchema } from '@/lib/server/community'
import { formatSlug } from '@/payload/fields/slug'
import { getPayloadClient } from '@/lib/payload'
import { badRequest, fail, ok, readBody, withUser } from '@/lib/server/api'

/**
 * Creation d'une discussion.
 *
 * L'auteur vient de la session ; le statut, l'epinglage et les compteurs ne
 * sont jamais acceptes depuis le corps de la requete — ils sont en ecriture
 * serveur sur la collection. Le forum peut etre ferme globalement depuis le
 * CMS, ce qui est verifie ici et pas seulement en masquant un bouton.
 */
export const POST = async (request: Request): Promise<NextResponse> =>
  withUser(request, { scope: 'forum:topic', limit: 5, windowSeconds: 30 * 60 }, async (user) => {
    const permission = canPublish(user)
    if (!permission.ok) return fail(permission.code, 403)

    const parsed = await readBody(request, createTopicSchema)
    if (!parsed.ok) return parsed.response
    const { title, body, categoryId, tags } = parsed.data

    const payload = await getPayloadClient()

    const settings = await payload
      .findGlobal({ slug: 'communitySettings', depth: 0 })
      .catch(() => null)
    if (settings?.forumEnabled === false) {
      return fail('forum_closed', 403, 'Le forum est actuellement ferme.')
    }

    // La categorie doit exister et ne pas etre archivee.
    const category = await payload
      .findByID({ collection: 'forumCategories', id: categoryId, depth: 0, overrideAccess: true })
      .catch(() => null)
    if (!category || category.archived) return badRequest('Categorie introuvable.')

    // Slug unique : on suffixe si le titre est deja pris, plutot que d'echouer.
    const base = formatSlug(title).slice(0, 100) || 'discussion'
    let slug = base
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const clash = await payload.count({
        collection: 'forumTopics',
        where: { slug: { equals: slug } },
        overrideAccess: true,
      })
      if (clash.totalDocs === 0) break
      slug = `${base}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`
    }

    const created = await payload.create({
      collection: 'forumTopics',
      data: {
        title,
        slug,
        body,
        category: categoryId,
        author: user.id,
        status: 'published',
        tags: tags?.map((label) => ({ label })),
        replyCount: 0,
        viewCount: 0,
        reactionCount: 0,
        reportCount: 0,
        lastActivityAt: new Date().toISOString(),
      },
      overrideAccess: true,
      context: { disableRevalidate: true },
    })

    // L'auteur suit sa propre discussion pour etre averti des reponses.
    await payload
      .create({
        collection: 'forumSubscriptions',
        data: { user: user.id, topic: String(created.id) },
        overrideAccess: true,
        context: { disableRevalidate: true },
      })
      .catch(() => null)

    return ok({ id: created.id, slug: created.slug }, 201)
  })
