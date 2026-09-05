import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'

import { MongoClient } from 'mongodb'
import type { Db } from 'mongodb'

/**
 * Tests d'integration de l'authentification, contre la configuration reelle de
 * l'application (`src/lib/auth/server.ts`).
 *
 * Ils s'executent sur une base jetable, creee puis supprimee par la suite :
 * aucune ecriture n'atteint la base de production et aucun compte fictif n'y
 * est ajoute. `DATABASE_URI` est donc reecrit **avant** le premier import du
 * module d'authentification, qui lit l'environnement au chargement.
 *
 * `node --test` execute chaque fichier dans un processus distinct : cette
 * reecriture n'affecte aucune autre suite.
 */

const SOURCE_URI = process.env.DATABASE_URI ?? ''
const SCRATCH_DB = `daguerre_test_auth_${Date.now()}`

/** Remplace le nom de base dans l'URI, en preservant les parametres de connexion. */
const withDatabase = (uri: string, database: string): string => {
  const [head, query] = uri.split('?')
  const base = head.replace(/\/[^/]*$/, `/${database}`)
  return query ? `${base}?${query}` : base
}

const scratchUri = withDatabase(SOURCE_URI, SCRATCH_DB)

process.env.DATABASE_URI = scratchUri
process.env.MONGODB_URI = scratchUri
// Secret propre a la suite : jamais celui de production.
process.env.BETTER_AUTH_SECRET = 'test-secret-test-secret-test-secret-1234'

const { auth } = await import('@/lib/auth/server')
const { getAuthMongoClient } = await import('@/lib/auth/db')

let client: MongoClient
let db: Db

const signUp = (body: Record<string, unknown>) =>
  auth.api.signUpEmail({ body: body as never, asResponse: true })

describe('authentification Better Auth', () => {
  before(async () => {
    client = new MongoClient(scratchUri)
    await client.connect()
    db = client.db()
  })

  after(async () => {
    await db.dropDatabase()
    await client.close()
    // Better Auth ouvre son propre client : sans fermeture, la boucle
    // d'evenements reste active et le processus de test ne se termine jamais.
    await getAuthMongoClient().close()
  })

  it('attribue le role customer par defaut', async () => {
    const response = await signUp({
      email: 'client.defaut@example.test',
      password: 'motdepassetreslong1',
      name: 'Client Defaut',
    })
    assert.equal(response.status, 200)

    const user = await db.collection('users').findOne({ email: 'client.defaut@example.test' })
    assert.ok(user, 'le compte devrait exister')
    assert.equal(user.role, 'customer')
  })

  it('ignore un role transmis par le navigateur', async () => {
    // Tentative d'auto-promotion : le champ est declare `input: false`.
    const response = await signUp({
      email: 'usurpateur@example.test',
      password: 'motdepassetreslong1',
      name: 'Usurpateur',
      role: 'super-admin',
    })
    assert.equal(response.status, 200)

    const user = await db.collection('users').findOne({ email: 'usurpateur@example.test' })
    assert.ok(user)
    assert.equal(user.role, 'customer', 'le role injecte ne doit jamais etre retenu')
  })

  it('ignore une suspension ou un bannissement transmis par le navigateur', async () => {
    await signUp({
      email: 'faux.drapeaux@example.test',
      password: 'motdepassetreslong1',
      name: 'Faux Drapeaux',
      suspended: false,
      forumBanned: false,
      emailVerified: true,
    })

    const user = await db.collection('users').findOne({ email: 'faux.drapeaux@example.test' })
    assert.ok(user)
    // `emailVerified` est un champ Better Auth : il ne doit pas etre pilotable
    // depuis l'inscription, sans quoi le rattachement Google serait usurpable.
    assert.notEqual(user.emailVerified, true)
  })

  it('refuse un mot de passe trop court', async () => {
    const response = await signUp({
      email: 'court@example.test',
      password: 'court',
      name: 'Court',
    })
    assert.notEqual(response.status, 200)

    const user = await db.collection('users').findOne({ email: 'court@example.test' })
    assert.equal(user, null, 'aucun compte ne doit etre cree')
  })

  it('refuse une adresse deja utilisee', async () => {
    await signUp({
      email: 'doublon@example.test',
      password: 'motdepassetreslong1',
      name: 'Premier',
    })
    const second = await signUp({
      email: 'doublon@example.test',
      password: 'motdepassetreslong2',
      name: 'Second',
    })
    assert.notEqual(second.status, 200)

    const count = await db.collection('users').countDocuments({ email: 'doublon@example.test' })
    assert.equal(count, 1)
  })

  it('ouvre une session valide a la connexion et la relit', async () => {
    await signUp({
      email: 'session@example.test',
      password: 'motdepassetreslong1',
      name: 'Session',
    })

    const response = await auth.api.signInEmail({
      body: { email: 'session@example.test', password: 'motdepassetreslong1' },
      asResponse: true,
    })
    assert.equal(response.status, 200)

    const cookie = response.headers.get('set-cookie')
    assert.ok(cookie, 'un cookie de session doit etre emis')
    // Le cookie de session ne doit jamais etre lisible par du script client.
    assert.match(cookie, /HttpOnly/i)

    const session = await auth.api.getSession({
      headers: new Headers({ cookie: cookie.split(';')[0] }),
    })
    assert.ok(session, 'la session doit etre relisible')
    assert.equal(session.user.email, 'session@example.test')
    assert.equal((session.user as { role?: string }).role, 'customer')
  })

  it('refuse un mot de passe incorrect', async () => {
    await signUp({
      email: 'mauvais@example.test',
      password: 'motdepassetreslong1',
      name: 'Mauvais',
    })

    const response = await auth.api.signInEmail({
      body: { email: 'mauvais@example.test', password: 'mauvaismotdepasse1' },
      asResponse: true,
    })
    assert.notEqual(response.status, 200)
  })

  it('ne renvoie aucune session sans cookie', async () => {
    const session = await auth.api.getSession({ headers: new Headers() })
    assert.equal(session, null)
  })

  it('enregistre l horodatage de derniere connexion', async () => {
    await signUp({
      email: 'horodatage@example.test',
      password: 'motdepassetreslong1',
      name: 'Horodatage',
    })
    await auth.api.signInEmail({
      body: { email: 'horodatage@example.test', password: 'motdepassetreslong1' },
      asResponse: true,
    })

    const user = await db.collection('users').findOne({ email: 'horodatage@example.test' })
    assert.ok(user?.lastLogin instanceof Date, 'lastLogin doit etre renseigne')
  })
})
