import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'

import type { Payload, TypedUser } from 'payload'

/**
 * Visibilite des articles.
 *
 * Le point verifie ici est qu'un article non public est **introuvable**, et pas
 * seulement masque dans les listes : la regle d'acces renvoie une clause `Where`
 * appliquee a la requete MongoDB, donc la lecture directe par identifiant est
 * filtree elle aussi. C'est ce qui ferme les fuites par API REST, GraphQL,
 * plan du site et generation statique.
 *
 * Base jetable, supprimee en fin de suite.
 */

const SOURCE_URI = process.env.DATABASE_URI ?? ''
const SCRATCH_DB = `daguerre_test_visibility_${Date.now()}`

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
let allowed: TypedUser
let outsider: TypedUser
let staff: TypedUser

const ids: Record<string, string> = {}

/** Lecture d'une liste sous l'identite donnee, regles d'acces appliquees. */
const listSlugs = async (user: TypedUser | null): Promise<string[]> => {
  const result = await payload.find({
    collection: 'articles',
    limit: 100,
    depth: 0,
    overrideAccess: false,
    user,
  })
  return result.docs.map((doc) => doc.slug).sort()
}

/** Lecture directe par identifiant : doit echouer si l'acces est refuse. */
const canReadById = async (user: TypedUser | null, id: string): Promise<boolean> => {
  try {
    const doc = await payload.findByID({
      collection: 'articles',
      id,
      depth: 0,
      overrideAccess: false,
      user,
    })
    return Boolean(doc)
  } catch {
    return false
  }
}

describe('visibilite des articles', () => {
  before(async () => {
    payload = await getPayload({ config })

    const mk = async (name: string, email: string, role: 'customer' | 'super-admin') =>
      (await payload.create({
        collection: 'users',
        data: { name, email, role },
        overrideAccess: true,
        context: { disableRevalidate: true },
      })) as unknown as TypedUser

    allowed = await mk('Cliente autorisee', 'autorisee@example.test', 'customer')
    outsider = await mk('Client tiers', 'tiers@example.test', 'customer')
    staff = await mk('Editrice', 'editrice@example.test', 'super-admin')

    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64',
    )
    const media = await payload.create({
      collection: 'media',
      data: { title: 'Pixel', alt: 'Pixel' },
      file: { data: png, mimetype: 'image/png', name: 'pixel.png', size: png.length },
      overrideAccess: true,
      context: { disableRevalidate: true },
    })

    const article = async (
      slug: string,
      visibility: 'public' | 'authenticated' | 'private',
      status: 'published' | 'draft',
      authorized?: string[],
    ) => {
      const doc = await payload.create({
        collection: 'articles',
        data: {
          title: slug,
          slug,
          category: 'Test',
          excerpt: 'Extrait.',
          hero: media.id,
          visibility,
          authorizedCustomers: authorized,
          _status: status,
        },
        overrideAccess: true,
        context: { disableRevalidate: true },
      })
      ids[slug] = String(doc.id)
    }

    await article('public-publie', 'public', 'published')
    await article('public-brouillon', 'public', 'draft')
    await article('connectes-publie', 'authenticated', 'published')
    await article('prive-publie', 'private', 'published', [String(allowed.id)])
  })

  after(async () => {
    const connection = (
      payload.db as unknown as {
        connection?: { dropDatabase: () => Promise<void>; close: () => Promise<void> }
      }
    ).connection
    if (connection) {
      await connection.dropDatabase()
      await connection.close()
    }
  })

  it('un visiteur anonyme ne voit que le public publie', async () => {
    assert.deepEqual(await listSlugs(null), ['public-publie'])
  })

  it('un visiteur anonyme ne peut pas ouvrir un article reserve, meme par identifiant', async () => {
    assert.equal(await canReadById(null, ids['connectes-publie']), false)
    assert.equal(await canReadById(null, ids['prive-publie']), false)
    assert.equal(await canReadById(null, ids['public-brouillon']), false)
  })

  it('un client connecte voit le public et les articles reserves aux connectes', async () => {
    const slugs = await listSlugs(outsider)
    assert.ok(slugs.includes('public-publie'))
    assert.ok(slugs.includes('connectes-publie'))
    assert.ok(!slugs.includes('prive-publie'), 'un article prive ne doit pas fuiter')
    assert.ok(!slugs.includes('public-brouillon'), 'un brouillon ne doit jamais fuiter')
  })

  it('un article prive n est lisible que par les clients designes', async () => {
    assert.equal(await canReadById(allowed, ids['prive-publie']), true)
    assert.equal(await canReadById(outsider, ids['prive-publie']), false)

    const slugs = await listSlugs(allowed)
    assert.ok(slugs.includes('prive-publie'))
  })

  it('le personnel voit tout, brouillons compris', async () => {
    const slugs = await listSlugs(staff)
    assert.deepEqual(slugs, [
      'connectes-publie',
      'prive-publie',
      'public-brouillon',
      'public-publie',
    ])
  })

  it('la clause publique n expose ni brouillon ni article reserve', async () => {
    const { PUBLIC_ARTICLE_WHERE } = await import('@/payload/access/articles')
    const result = await payload.find({
      collection: 'articles',
      where: PUBLIC_ARTICLE_WHERE,
      limit: 100,
      depth: 0,
      overrideAccess: true,
    })
    // Clause utilisee par le plan du site et les metadonnees publiques.
    assert.deepEqual(
      result.docs.map((doc) => doc.slug),
      ['public-publie'],
    )
  })
})
