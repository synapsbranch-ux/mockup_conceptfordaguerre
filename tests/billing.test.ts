import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'

import type { Payload } from 'payload'

import { isDuplicateKeyError } from './helpers/duplicate'

/**
 * Facturation et campagnes : unicite des numeros, garde anti-double-envoi,
 * generation du PDF.
 *
 * Base jetable, supprimee en fin de suite.
 */

const SOURCE_URI = process.env.DATABASE_URI ?? ''
const SCRATCH_DB = `daguerre_test_billing_${Date.now()}`

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
let customer: string

describe('facturation', () => {
  before(async () => {
    payload = await getPayload({ config })

    // Index partiels, comme `npm run db:ensure-indexes`.
    const { ensurePartialUniqueIndexes } = await import('@/payload/scripts/ensureIndexes')
    await ensurePartialUniqueIndexes(
      (payload.db as unknown as { connection: { db: import('mongodb').Db } }).connection.db,
    )

    customer = String(
      (
        await payload.create({
          collection: 'users',
          data: { name: 'Cliente', email: 'billing@example.test', role: 'customer' } as never,
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

    // `reserveInvoiceNumber` ouvre son propre client Mongo : sans fermeture,
    // la boucle d'evenements reste active et le processus ne se termine pas.
    const { getAuthMongoClient } = await import('@/lib/auth/db')
    await getAuthMongoClient().close()
  })

  it('refuse deux factures portant le meme numero', async () => {
    const make = (number: string) =>
      payload.create({
        collection: 'invoices',
        data: {
          number,
          customer,
          status: 'draft',
          currency: 'CAD',
          lines: [{ description: 'Prestation', quantity: 1, unitPrice: 10_000, taxRate: 0 }],
        } as never,
        overrideAccess: true,
        context: { disableRevalidate: true },
      })

    await make('FA-2027-0001')
    await assert.rejects(
      () => make('FA-2027-0001'),
      isDuplicateKeyError,
      'le numero de facture doit etre unique',
    )
  })

  it('reserve des numeros distincts sous appels concurrents', async () => {
    const { reserveInvoiceNumber } = await import('@/lib/commerce/numbering')

    // Dix reservations simultanees : l'increment atomique doit donner dix
    // valeurs distinctes. Une lecture-puis-ecriture non atomique en produirait
    // plusieurs identiques.
    const numbers = await Promise.all(Array.from({ length: 10 }, () => reserveInvoiceNumber()))

    assert.equal(new Set(numbers).size, 10, 'chaque appel doit obtenir un numero different')
    for (const number of numbers) assert.match(number, /^FA-\d{4}-\d{4}$/)
  })

  it('ne recalcule jamais le compteur depuis les factures existantes', async () => {
    const { reserveInvoiceNumber } = await import('@/lib/commerce/numbering')

    const first = await reserveInvoiceNumber()
    const second = await reserveInvoiceNumber()

    const firstSequence = Number(first.split('-').pop())
    const secondSequence = Number(second.split('-').pop())

    assert.equal(secondSequence, firstSequence + 1)

    // Meme si aucune facture n'a ete creee entre les deux, le compteur avance :
    // un numero consomme n'est jamais reattribue.
    const third = await reserveInvoiceNumber()
    assert.equal(Number(third.split('-').pop()), secondSequence + 1)
  })

  it('genere un PDF valide sans y faire figurer les notes internes', async () => {
    const { buildInvoicePdf } = await import('@/lib/commerce/invoicePdf')

    const pdf = await buildInvoicePdf({
      number: 'FA-2027-0009',
      issueDate: '2027-01-10T00:00:00.000Z',
      dueDate: '2027-02-10T00:00:00.000Z',
      currency: 'CAD',
      status: 'sent',
      issuer: { name: 'Emetteur' },
      billTo: { name: 'Cliente' },
      lines: [{ description: 'Atelier', quantity: 2, unitPrice: 50_000, taxRate: 15 }],
      totals: {
        subtotal: 100_000,
        discountAmount: 0,
        taxAmount: 15_000,
        total: 115_000,
        balanceDue: 115_000,
      },
      publicNotes: 'Merci de votre confiance.',
    })

    assert.ok(pdf.length > 500, 'le PDF doit avoir un contenu')
    assert.equal(pdf.subarray(0, 5).toString(), '%PDF-', 'en-tete PDF attendu')

    // Le generateur ne recoit meme pas les notes internes : rien ne peut les
    // faire apparaitre sur le document.
    assert.ok(!pdf.toString('latin1').includes('Negociation'))
  })
  it('empeche un second envoi', async () => {
    const campaign = await payload.create({
      collection: 'newsletterCampaigns',
      data: {
        subject: 'Lettre de janvier',
        body: 'Bonjour a toutes et tous.',
        audience: 'subscribed',
        status: 'draft',
      } as never,
      overrideAccess: true,
      context: { disableRevalidate: true },
    })

    // Premier envoi.
    await payload.update({
      collection: 'newsletterCampaigns',
      id: campaign.id,
      data: { status: 'sent', sentAt: new Date().toISOString(), recipientCount: 34 } as never,
      overrideAccess: true,
      context: { disableRevalidate: true },
    })

    // Toute tentative de repasser en brouillon — donc de renvoyer — echoue.
    await assert.rejects(
      () =>
        payload.update({
          collection: 'newsletterCampaigns',
          id: campaign.id,
          data: { status: 'draft' },
          overrideAccess: true,
          context: { disableRevalidate: true },
        }),
      /deja ete envoyee|déjà été envoyée/i,
    )
  })

  it('fige le contenu d une campagne envoyee', async () => {
    const campaign = await payload.create({
      collection: 'newsletterCampaigns',
      data: {
        subject: 'Lettre de fevrier',
        body: 'Contenu initial.',
        audience: 'subscribed',
        status: 'draft',
      } as never,
      overrideAccess: true,
      context: { disableRevalidate: true },
    })

    await payload.update({
      collection: 'newsletterCampaigns',
      id: campaign.id,
      data: { status: 'sent', sentAt: new Date().toISOString() } as never,
      overrideAccess: true,
      context: { disableRevalidate: true },
    })

    await assert.rejects(
      () =>
        payload.update({
          collection: 'newsletterCampaigns',
          id: campaign.id,
          data: { body: 'Contenu reecrit apres coup.' },
          overrideAccess: true,
          context: { disableRevalidate: true },
        }),
      /ne peut plus etre modifie|ne peut plus être modifié/i,
    )
  })

  it('laisse modifier un brouillon', async () => {
    const campaign = await payload.create({
      collection: 'newsletterCampaigns',
      data: {
        subject: 'Brouillon',
        body: 'Premiere version.',
        audience: 'subscribed',
        status: 'draft',
      } as never,
      overrideAccess: true,
      context: { disableRevalidate: true },
    })

    const updated = await payload.update({
      collection: 'newsletterCampaigns',
      id: campaign.id,
      data: { body: 'Seconde version.' },
      overrideAccess: true,
      context: { disableRevalidate: true },
    })

    assert.equal(updated.body, 'Seconde version.')
  })
})
