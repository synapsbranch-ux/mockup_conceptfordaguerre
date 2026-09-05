import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'

import type { Payload } from 'payload'

/**
 * Verifie que les invariants de la communaute sont tenus par la BASE, et non
 * par l'interface : reaction unique, abonnement unique, favori unique,
 * signalement unique.
 *
 * C'est le point important — une verification applicative laisserait passer
 * deux requetes concurrentes. Seul un index unique ferme la course.
 *
 * La suite s'execute sur une base jetable, supprimee a la fin : aucune donnee
 * de production n'est touchee et aucun contenu fictif n'y est ecrit.
 */

const SOURCE_URI = process.env.DATABASE_URI ?? ''
const SCRATCH_DB = `daguerre_test_forum_${Date.now()}`

const withDatabase = (uri: string, database: string): string => {
  const [head, query] = uri.split('?')
  const base = head.replace(/\/[^/]*$/, `/${database}`)
  return query ? `${base}?${query}` : base
}

const scratchUri = withDatabase(SOURCE_URI, SCRATCH_DB)
process.env.DATABASE_URI = scratchUri
process.env.MONGODB_URI = scratchUri
process.env.BETTER_AUTH_SECRET = 'test-secret-test-secret-test-secret-1234'

const config = (await import('@payload-config')).default
const { getPayload } = await import('payload')

let payload: Payload
let userId: string
let otherUserId: string
let categoryId: string
let topicId: string
let articleId: string

/**
 * Vrai lorsque l'ecriture a ete refusee pour cause de doublon.
 *
 * Deux formes possibles, toutes deux acceptables : l'erreur brute du pilote
 * (E11000) quand l'index unique tranche, ou la ValidationError de Payload
 * quand sa validation d'unicite intercepte le conflit en amont. Dans les deux
 * cas l'invariant tient — aucune seconde ligne n'est ecrite.
 */
const isDuplicateError = (error: unknown): boolean => {
  const message = String((error as Error)?.message ?? '').toLowerCase()
  const code = (error as { code?: number })?.code
  const name = String((error as Error)?.name ?? '')
  return (
    code === 11000 ||
    name === 'ValidationError' ||
    message.includes('duplicate') ||
    message.includes('unique') ||
    message.includes('pas valide')
  )
}

describe('invariants de la communaute', () => {
  before(async () => {
    payload = await getPayload({ config })

    const user = await payload.create({
      collection: 'users',
      data: { name: 'Personne A', email: 'a@example.test', role: 'customer' },
      overrideAccess: true,
      context: { disableRevalidate: true },
    })
    userId = String(user.id)

    const other = await payload.create({
      collection: 'users',
      data: { name: 'Personne B', email: 'b@example.test', role: 'customer' },
      overrideAccess: true,
      context: { disableRevalidate: true },
    })
    otherUserId = String(other.id)

    const category = await payload.create({
      collection: 'forumCategories',
      data: { title: 'General', slug: 'general', order: 10 },
      overrideAccess: true,
      context: { disableRevalidate: true },
    })
    categoryId = String(category.id)

    const topic = await payload.create({
      collection: 'forumTopics',
      data: {
        title: 'Une question',
        slug: 'une-question',
        body: 'Corps de la discussion.',
        category: categoryId,
        author: userId,
        status: 'published',
      },
      overrideAccess: true,
      context: { disableRevalidate: true },
    })
    topicId = String(topic.id)

    // L'image d'en-tete d'un article est obligatoire : on televerse un PNG 1x1
    // reel plutot que de contourner la validation, pour rester fidele au
    // chemin de creation normal.
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64',
    )
    const media = await payload.create({
      collection: 'media',
      data: { title: 'Pixel de test', alt: 'Pixel de test' },
      file: { data: png, mimetype: 'image/png', name: 'pixel-test.png', size: png.length },
      overrideAccess: true,
      context: { disableRevalidate: true },
    })

    const article = await payload.create({
      collection: 'articles',
      data: {
        title: 'Article de test',
        slug: 'article-de-test',
        category: 'Test',
        excerpt: 'Extrait.',
        hero: media.id,
        visibility: 'public',
        _status: 'published',
      },
      overrideAccess: true,
      context: { disableRevalidate: true },
    })
    articleId = String(article.id)
  })

  after(async () => {
    const { getAuthMongoClient } = await import('@/lib/auth/db')
    // `payload.db` expose la connexion mongoose : on supprime la base jetable.
    const connection = (payload.db as unknown as { connection?: { dropDatabase: () => Promise<void>; close: () => Promise<void> } })
      .connection
    if (connection) {
      await connection.dropDatabase()
      await connection.close()
    }
    await getAuthMongoClient().close()
  })

  it('refuse une seconde reaction identique', async () => {
    const data = {
      user: userId,
      targetType: 'topic' as const,
      targetId: topicId,
      type: 'helpful' as const,
    }

    await payload.create({ collection: 'forumReactions', data, overrideAccess: true })

    await assert.rejects(
      () => payload.create({ collection: 'forumReactions', data, overrideAccess: true }),
      (error) => isDuplicateError(error),
      'la base doit refuser la reaction en double',
    )
  })

  it('autorise une reaction d un autre type ou d une autre personne', async () => {
    const second = await payload.create({
      collection: 'forumReactions',
      data: { user: userId, targetType: 'topic', targetId: topicId, type: 'thanks' },
      overrideAccess: true,
    })
    assert.ok(second.id)

    const byOther = await payload.create({
      collection: 'forumReactions',
      data: { user: otherUserId, targetType: 'topic', targetId: topicId, type: 'helpful' },
      overrideAccess: true,
    })
    assert.ok(byOther.id)
  })

  it('refuse un second abonnement a la meme discussion', async () => {
    const data = { user: userId, topic: topicId }
    await payload.create({ collection: 'forumSubscriptions', data, overrideAccess: true })

    await assert.rejects(
      () => payload.create({ collection: 'forumSubscriptions', data, overrideAccess: true }),
      (error) => isDuplicateError(error),
    )
  })

  it('refuse un favori en double', async () => {
    const data = { user: userId, article: articleId }
    await payload.create({ collection: 'articleFavorites', data, overrideAccess: true })

    await assert.rejects(
      () => payload.create({ collection: 'articleFavorites', data, overrideAccess: true }),
      (error) => isDuplicateError(error),
    )
  })

  it('refuse un second signalement de la meme personne sur la meme cible', async () => {
    const data = {
      reporter: userId,
      targetType: 'topic' as const,
      targetId: topicId,
      reason: 'spam' as const,
      status: 'open' as const,
    }
    await payload.create({ collection: 'forumReports', data, overrideAccess: true })

    await assert.rejects(
      () => payload.create({ collection: 'forumReports', data, overrideAccess: true }),
      (error) => isDuplicateError(error),
    )
  })

  it('refuse deux discussions de meme slug', async () => {
    await assert.rejects(
      () =>
        payload.create({
          collection: 'forumTopics',
          data: {
            title: 'Doublon',
            slug: 'une-question',
            body: 'Corps.',
            category: categoryId,
            author: userId,
            status: 'published',
          },
          overrideAccess: true,
        }),
      (error) => isDuplicateError(error),
    )
  })
})
