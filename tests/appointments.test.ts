import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'

import type { Payload } from 'payload'

/**
 * Rendez-vous : anti-double-reservation et conservation en UTC.
 *
 * Le point verifie est que l'exclusion mutuelle est tenue par la BASE. Une
 * verification applicative ne suffirait pas : l'instance de production est
 * autonome, sans transactions, donc deux reservations simultanees du meme
 * creneau ne peuvent pas etre serialisees autrement que par un index unique.
 *
 * Base jetable, supprimee en fin de suite.
 */

const SOURCE_URI = process.env.DATABASE_URI ?? ''
const SCRATCH_DB = `daguerre_test_rdv_${Date.now()}`

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
let hostId: string
let customerA: string
let customerB: string
let meetingTypeId: string

/** Creneau fixe, exprime en UTC. */
const SLOT_START = '2027-03-15T14:00:00.000Z'
const SLOT_END = '2027-03-15T14:30:00.000Z'

const book = (customer: string, startAt = SLOT_START, endAt = SLOT_END) =>
  payload.create({
    collection: 'appointments',
    data: {
      customer,
      host: hostId,
      meetingType: meetingTypeId,
      status: 'requested',
      startAt,
      endAt,
      customerTimezone: 'America/Port-au-Prince',
      objective: 'Discuter du projet.',
    },
    overrideAccess: true,
    context: { disableRevalidate: true },
  })

const isDuplicate = (error: unknown): boolean => {
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

describe('rendez-vous', () => {
  before(async () => {
    payload = await getPayload({ config })

    // L'index partiel n'est pas exprimable dans la configuration Payload :
    // on le pose ici comme le fait `npm run appointments:ensure-index`.
    const db = (payload.db as unknown as { connection: { db: import('mongodb').Db } }).connection.db
    await db.collection('appointments').createIndex(
      { slotKey: 1 },
      {
        name: 'appointments_active_slot_unique',
        unique: true,
        partialFilterExpression: { slotKey: { $type: 'string' } },
      },
    )

    const mk = async (name: string, email: string, role: 'customer' | 'super-admin') =>
      String(
        (
          await payload.create({
            collection: 'users',
            data: { name, email, role },
            overrideAccess: true,
            context: { disableRevalidate: true },
          })
        ).id,
      )

    hostId = await mk('Hote', 'hote@example.test', 'super-admin')
    customerA = await mk('Cliente A', 'rdv-a@example.test', 'customer')
    customerB = await mk('Client B', 'rdv-b@example.test', 'customer')

    meetingTypeId = String(
      (
        await payload.create({
          collection: 'meetingTypes',
          data: {
            title: 'Premier echange',
            slug: 'premier-echange',
            durationMinutes: 30,
            bufferMinutes: 15,
            host: hostId,
            active: true,
          },
          overrideAccess: true,
          context: { disableRevalidate: true },
        })
      ).id,
    )
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

  it('stocke les dates en UTC sans les decaler', async () => {
    const appointment = await book(customerA)
    assert.equal(new Date(appointment.startAt as string).toISOString(), SLOT_START)
    // Le fuseau du client est conserve a part, pour l'affichage seulement.
    assert.equal(appointment.customerTimezone, 'America/Port-au-Prince')
  })

  it('refuse une seconde reservation du meme creneau', async () => {
    await assert.rejects(
      () => book(customerB),
      (error) => isDuplicate(error),
      'la base doit refuser le creneau deja pris',
    )
  })

  it('refuse deux reservations simultanees du meme creneau', async () => {
    const other = '2027-04-20T13:00:00.000Z'
    const otherEnd = '2027-04-20T13:30:00.000Z'

    // Les deux ecritures partent ensemble : sans index unique, les deux
    // passeraient, puisqu'aucune transaction ne peut les serialiser.
    const results = await Promise.allSettled([
      book(customerA, other, otherEnd),
      book(customerB, other, otherEnd),
    ])

    const fulfilled = results.filter((r) => r.status === 'fulfilled')
    const rejected = results.filter((r) => r.status === 'rejected')

    assert.equal(fulfilled.length, 1, 'exactement une reservation doit aboutir')
    assert.equal(rejected.length, 1, 'exactement une reservation doit etre refusee')
    assert.ok(isDuplicate((rejected[0] as PromiseRejectedResult).reason))
  })

  it('libere le creneau lorsque le rendez-vous est annule', async () => {
    const slot = '2027-05-10T09:00:00.000Z'
    const slotEnd = '2027-05-10T09:30:00.000Z'

    const first = await book(customerA, slot, slotEnd)

    // Occupe : une seconde reservation echoue.
    await assert.rejects(() => book(customerB, slot, slotEnd), isDuplicate)

    await payload.update({
      collection: 'appointments',
      id: first.id,
      data: { status: 'cancelled' },
      overrideAccess: true,
      context: { disableRevalidate: true },
    })

    // Libere : la reservation passe.
    const second = await book(customerB, slot, slotEnd)
    assert.ok(second.id)
  })

  it('autorise plusieurs rendez-vous annules sur le meme creneau', async () => {
    // Cas que casserait un index unique ordinaire : tous les annules portent
    // slotKey nul et entreraient en collision.
    const slot = '2027-06-01T10:00:00.000Z'
    const slotEnd = '2027-06-01T10:30:00.000Z'

    const a = await book(customerA, slot, slotEnd)
    await payload.update({
      collection: 'appointments',
      id: a.id,
      data: { status: 'cancelled' },
      overrideAccess: true,
      context: { disableRevalidate: true },
    })

    const b = await book(customerB, slot, slotEnd)
    await payload.update({
      collection: 'appointments',
      id: b.id,
      data: { status: 'cancelled' },
      overrideAccess: true,
      context: { disableRevalidate: true },
    })

    const cancelled = await payload.count({
      collection: 'appointments',
      where: { and: [{ startAt: { equals: slot } }, { status: { equals: 'cancelled' } }] },
      overrideAccess: true,
    })
    assert.equal(cancelled.totalDocs, 2, 'deux annulations doivent coexister')
  })

  it('refuse une transition de statut interdite', async () => {
    const slot = '2027-07-01T08:00:00.000Z'
    const appointment = await book(customerA, slot, '2027-07-01T08:30:00.000Z')

    await payload.update({
      collection: 'appointments',
      id: appointment.id,
      data: { status: 'cancelled' },
      overrideAccess: true,
      context: { disableRevalidate: true },
    })

    // Un rendez-vous annule est terminal.
    await assert.rejects(
      () =>
        payload.update({
          collection: 'appointments',
          id: appointment.id,
          data: { status: 'confirmed' },
          overrideAccess: true,
          context: { disableRevalidate: true },
        }),
      /Transition refus/,
    )
  })
})
