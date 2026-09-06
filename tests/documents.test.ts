import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'

import type { Payload } from 'payload'

/**
 * Documents prives : isolation entre clients et absence d'enumeration.
 *
 * Le point verifie est que la clause `read` de la collection suffit a elle
 * seule. Les pages et la route de telechargement lisent avec
 * `overrideAccess: false` : si la regle est juste, aucun ecran ne peut laisser
 * fuiter une ligne, meme par lecture directe sur un identifiant connu.
 *
 * Base jetable, supprimee en fin de suite.
 */

const SOURCE_URI = process.env.DATABASE_URI ?? ''
const SCRATCH_DB = `daguerre_test_docs_${Date.now()}`

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
let alice: Record<string, unknown>
let bob: Record<string, unknown>
let staff: Record<string, unknown>

let authenticatedDoc: string
let aliceDoc: string
let archivedDoc: string

/** Lecture avec les droits reels d'une personne, comme le font les pages. */
const readAs = (user: Record<string, unknown> | null, id: string) =>
  payload
    .findByID({
      collection: 'documents',
      id,
      depth: 0,
      overrideAccess: false,
      ...(user ? { user: { ...user, collection: 'users' } } : {}),
    })
    .then(() => true)
    .catch(() => false)

const listAs = (user: Record<string, unknown> | null) =>
  payload.find({
    collection: 'documents',
    limit: 100,
    depth: 0,
    overrideAccess: false,
    ...(user ? { user: { ...user, collection: 'users' } } : {}),
  })

describe('documents prives', () => {
  before(async () => {
    payload = await getPayload({ config })

    const mk = async (name: string, email: string, role: string) =>
      (await payload.create({
        collection: 'users',
        data: { name, email, role } as never,
        overrideAccess: true,
        context: { disableRevalidate: true },
      })) as unknown as Record<string, unknown>

    alice = await mk('Alice', 'alice@example.test', 'customer')
    bob = await mk('Bob', 'bob@example.test', 'customer')
    staff = await mk('Equipe', 'equipe@example.test', 'super-admin')

    // `documents` est une collection d'upload : un binaire est obligatoire.
    // Un fichier minuscule suffit, le contenu n'est pas l'objet du test.
    let fileCounter = 0
    const mkDoc = async (data: Record<string, unknown>) => {
      fileCounter += 1
      const body = Buffer.from(`document de test ${fileCounter}`, 'utf8')
      return String(
        (
          await payload.create({
            collection: 'documents',
            data: data as never,
            file: {
              data: body,
              mimetype: 'text/plain',
              name: `test-${fileCounter}.txt`,
              size: body.length,
            },
            overrideAccess: true,
            context: { disableRevalidate: true },
          })
        ).id,
      )
    }

    await mkDoc({ title: 'Guide public', category: 'guide', visibility: 'public' })
    authenticatedDoc = await mkDoc({
      title: 'Modele reserve',
      category: 'template',
      visibility: 'authenticated',
    })
    aliceDoc = await mkDoc({
      title: 'Rapport confidentiel Alice',
      category: 'report',
      visibility: 'assigned',
      assignedTo: [alice.id],
    })
    archivedDoc = await mkDoc({
      title: 'Ancien guide',
      category: 'guide',
      visibility: 'public',
      archived: true,
    })
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

  it('un visiteur anonyme ne voit que le public non archive', async () => {
    const result = await listAs(null)
    const titles = result.docs.map((doc) => doc.title)
    assert.deepEqual(titles, ['Guide public'])
  })

  it('un visiteur anonyme ne peut pas lire un document reserve, meme par identifiant', async () => {
    assert.equal(await readAs(null, authenticatedDoc), false)
    assert.equal(await readAs(null, aliceDoc), false)
  })

  it('un compte connecte voit le public et le reserve aux comptes', async () => {
    const result = await listAs(bob)
    const titles = result.docs.map((doc) => doc.title).sort()
    assert.deepEqual(titles, ['Guide public', 'Modele reserve'])
  })

  it('un client ne voit pas le document assigne a un autre client', async () => {
    // Coeur de la prevention d'IDOR : Bob connait l'identifiant, cela ne suffit pas.
    assert.equal(await readAs(bob, aliceDoc), false)

    const result = await listAs(bob)
    assert.ok(
      !result.docs.some((doc) => doc.title === 'Rapport confidentiel Alice'),
      'le document d autrui ne doit jamais apparaitre',
    )
  })

  it('le client destinataire accede bien a son document', async () => {
    assert.equal(await readAs(alice, aliceDoc), true)

    const result = await listAs(alice)
    assert.ok(result.docs.some((doc) => doc.title === 'Rapport confidentiel Alice'))
  })

  it('un document archive disparait des listes clientes', async () => {
    const result = await listAs(alice)
    assert.ok(!result.docs.some((doc) => doc.title === 'Ancien guide'))
    assert.equal(await readAs(alice, archivedDoc), false)
  })

  it('le personnel voit tout, archives compris', async () => {
    const result = await listAs(staff)
    assert.equal(result.totalDocs, 4)
    assert.equal(await readAs(staff, aliceDoc), true)
    assert.equal(await readAs(staff, archivedDoc), true)
  })

  it('la note interne n est jamais lisible par un client', async () => {
    await payload.update({
      collection: 'documents',
      id: aliceDoc,
      data: { internalNote: 'Negociation en cours, ne pas relancer.' },
      overrideAccess: true,
      context: { disableRevalidate: true },
    })

    const asOwner = await payload.findByID({
      collection: 'documents',
      id: aliceDoc,
      depth: 0,
      overrideAccess: false,
      user: { ...alice, collection: 'users' } as never,
    })
    assert.equal(
      (asOwner as { internalNote?: string }).internalNote,
      undefined,
      'la note interne ne doit pas etre serialisee pour le client destinataire',
    )

    const asStaff = await payload.findByID({
      collection: 'documents',
      id: aliceDoc,
      depth: 0,
      overrideAccess: false,
      user: { ...staff, collection: 'users' } as never,
    })
    assert.equal(
      (asStaff as { internalNote?: string }).internalNote,
      'Negociation en cours, ne pas relancer.',
    )
  })

  it('un client ne peut pas s auto-assigner un document', async () => {
    // `assignedTo` est en ecriture reservee au personnel.
    await payload
      .update({
        collection: 'documents',
        id: aliceDoc,
        data: { assignedTo: [alice.id, bob.id] } as never,
        overrideAccess: false,
        user: { ...bob, collection: 'users' } as never,
      })
      .catch(() => null)

    // Quoi qu'il advienne de l'appel, Bob ne doit toujours pas y acceder.
    assert.equal(await readAs(bob, aliceDoc), false)
  })

  it('l historique de telechargement reste cloisonne', async () => {
    await payload.create({
      collection: 'downloadEvents',
      data: { user: alice.id, document: aliceDoc, documentTitle: 'Rapport confidentiel Alice' } as never,
      overrideAccess: true,
      context: { disableRevalidate: true },
    })

    const bobHistory = await payload.find({
      collection: 'downloadEvents',
      limit: 50,
      depth: 0,
      overrideAccess: false,
      user: { ...bob, collection: 'users' } as never,
    })
    assert.equal(bobHistory.totalDocs, 0, 'Bob ne doit pas voir les telechargements d Alice')

    const aliceHistory = await payload.find({
      collection: 'downloadEvents',
      limit: 50,
      depth: 0,
      overrideAccess: false,
      user: { ...alice, collection: 'users' } as never,
    })
    assert.equal(aliceHistory.totalDocs, 1)
  })
})
