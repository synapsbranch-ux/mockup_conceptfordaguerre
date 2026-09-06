import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'

import type { Payload } from 'payload'

/**
 * Protections sur les comptes : dernier administrateur et auto-modification.
 *
 * Ce sont des gardes dont l'echec est irreversible en pratique — se retirer le
 * dernier acces d'administration ne se repare que par un acces direct a la
 * base. Ils meritent donc d'etre verifies contre la vraie base, pas seulement
 * en logique pure.
 *
 * Base jetable, supprimee en fin de suite.
 */

const SOURCE_URI = process.env.DATABASE_URI ?? ''
const SCRATCH_DB = `daguerre_test_guard_${Date.now()}`

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
const guard = await import('@/lib/server/adminGuard')

let payload: Payload
let soleAdmin: string
let secondAdmin: string
let customer: string

const mk = async (name: string, email: string, role: string, extra: Record<string, unknown> = {}) =>
  String(
    (
      await payload.create({
        collection: 'users',
        data: { name, email, role, ...extra } as never,
        overrideAccess: true,
        context: { disableRevalidate: true },
      })
    ).id,
  )

const setRole = (id: string, role: string) =>
  payload.update({
    collection: 'users',
    id,
    data: { role } as never,
    overrideAccess: true,
    context: { disableRevalidate: true },
  })

describe('protections sur les comptes', () => {
  before(async () => {
    payload = await getPayload({ config })
    soleAdmin = await mk('Admin unique', 'admin1@example.test', 'super-admin')
    customer = await mk('Cliente', 'cliente@example.test', 'customer')
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

  it('refuse de retrograder le dernier administrateur', async () => {
    const result = await guard.canChangeRole({
      // Un autre compte tente la retrogradation : ce n'est donc pas la garde
      // d'auto-modification qui repond, mais bien celle du dernier admin.
      actorId: customer,
      targetId: soleAdmin,
      currentRole: 'super-admin',
      nextRole: 'customer',
    })

    assert.equal(result.ok, false)
    assert.match(result.ok === false ? result.reason : '', /dernier administrateur/i)
  })

  it('refuse de suspendre le dernier administrateur', async () => {
    const result = await guard.canSuspend({
      actorId: customer,
      targetId: soleAdmin,
      currentRole: 'super-admin',
    })
    assert.equal(result.ok, false)
  })

  it('refuse de supprimer le dernier administrateur', async () => {
    const result = await guard.canDeleteUser({
      actorId: customer,
      targetId: soleAdmin,
      currentRole: 'super-admin',
    })
    assert.equal(result.ok, false)
  })

  it('autorise la retrogradation des qu un second administrateur existe', async () => {
    secondAdmin = await mk('Second admin', 'admin2@example.test', 'super-admin')

    const result = await guard.canChangeRole({
      actorId: customer,
      targetId: soleAdmin,
      currentRole: 'super-admin',
      nextRole: 'customer',
    })
    assert.equal(result.ok, true, 'deux administrateurs : la retrogradation devient possible')
  })

  it('ne compte pas un administrateur suspendu comme actif', async () => {
    await payload.update({
      collection: 'users',
      id: secondAdmin,
      data: { suspended: true } as never,
      overrideAccess: true,
      context: { disableRevalidate: true },
    })

    // Le second admin etant suspendu, le premier redevient le seul actif.
    const result = await guard.canChangeRole({
      actorId: customer,
      targetId: soleAdmin,
      currentRole: 'super-admin',
      nextRole: 'customer',
    })
    assert.equal(result.ok, false, 'un compte suspendu ne tient pas lieu d administrateur')

    await payload.update({
      collection: 'users',
      id: secondAdmin,
      data: { suspended: false } as never,
      overrideAccess: true,
      context: { disableRevalidate: true },
    })
  })

  it('ne compte pas un administrateur desactive comme actif', async () => {
    await payload.update({
      collection: 'users',
      id: secondAdmin,
      data: { active: false } as never,
      overrideAccess: true,
      context: { disableRevalidate: true },
    })

    const result = await guard.canSuspend({
      actorId: customer,
      targetId: soleAdmin,
      currentRole: 'super-admin',
    })
    assert.equal(result.ok, false)

    await payload.update({
      collection: 'users',
      id: secondAdmin,
      data: { active: true } as never,
      overrideAccess: true,
      context: { disableRevalidate: true },
    })
  })

  it('interdit de modifier son propre role', async () => {
    const result = await guard.canChangeRole({
      actorId: soleAdmin,
      targetId: soleAdmin,
      currentRole: 'super-admin',
      nextRole: 'customer',
    })
    assert.equal(result.ok, false)
    assert.match(result.ok === false ? result.reason : '', /votre propre r/i)
  })

  it('interdit de suspendre son propre compte', async () => {
    const result = await guard.canSuspend({
      actorId: soleAdmin,
      targetId: soleAdmin,
      currentRole: 'super-admin',
    })
    assert.equal(result.ok, false)
    assert.match(result.ok === false ? result.reason : '', /votre propre compte/i)
  })

  it('reserve l attribution du palier super-administrateur', async () => {
    // Un editeur ne doit pas pouvoir fabriquer un super-administrateur.
    assert.equal(guard.canAssignRole('editor', 'super-admin').ok, false)
    assert.equal(guard.canAssignRole('super-admin', 'super-admin').ok, true)
    // En revanche, un editeur peut gerer les paliers inferieurs.
    assert.equal(guard.canAssignRole('editor', 'editor').ok, true)
    assert.equal(guard.canAssignRole('editor', 'customer').ok, true)
  })

  it('laisse retrograder un editeur quand un super-administrateur demeure', async () => {
    const editor = await mk('Editrice', 'editrice@example.test', 'editor')

    const result = await guard.canChangeRole({
      actorId: soleAdmin,
      targetId: editor,
      currentRole: 'editor',
      nextRole: 'customer',
    })
    assert.equal(result.ok, true)

    await setRole(editor, 'customer')
    const updated = await payload.findByID({
      collection: 'users',
      id: editor,
      overrideAccess: true,
    })
    assert.equal(updated.role, 'customer')
  })
})
