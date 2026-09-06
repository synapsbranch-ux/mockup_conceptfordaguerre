import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'

import type { Payload } from 'payload'

import { isDuplicateKeyError } from './helpers/duplicate'

/**
 * Regles commerciales appliquees par la base.
 *
 * Ces tests ne verifient pas les fonctions pures — c'est le role de
 * `commerce.test.ts` — mais que les hooks des collections les IMPOSENT
 * reellement, y compris face a une ecriture directe qui contournerait les
 * routes d'API.
 *
 * Base jetable, supprimee en fin de suite.
 */

const SOURCE_URI = process.env.DATABASE_URI ?? ''
const SCRATCH_DB = `daguerre_test_flow_${Date.now()}`

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
let other: string

const mkProposal = async (data: Record<string, unknown> = {}) =>
  payload.create({
    collection: 'proposals',
    data: {
      title: 'Refonte du tableau de bord',
      customer,
      status: 'draft',
      lines: [{ description: 'Conception', quantity: 2, unitPrice: 50_000, taxRate: 10 }],
      currency: 'CAD',
      ...data,
    } as never,
    overrideAccess: true,
    context: { disableRevalidate: true },
  })

describe('regles commerciales en base', () => {
  before(async () => {
    payload = await getPayload({ config })

    // Les index partiels ne sont pas exprimables dans la configuration Payload :
    // on les pose ici comme le fait `npm run db:ensure-indexes`.
    const { ensurePartialUniqueIndexes } = await import('@/payload/scripts/ensureIndexes')
    await ensurePartialUniqueIndexes(
      (payload.db as unknown as { connection: { db: import('mongodb').Db } }).connection.db,
    )

    const mk = async (name: string, email: string, role: string) =>
      String(
        (
          await payload.create({
            collection: 'users',
            data: { name, email, role } as never,
            overrideAccess: true,
            context: { disableRevalidate: true },
          })
        ).id,
      )

    customer = await mk('Cliente', 'flow-client@example.test', 'customer')
    other = await mk('Autre', 'flow-autre@example.test', 'customer')
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

  it('calcule les totaux cote serveur, en ignorant ceux transmis', async () => {
    const proposal = await mkProposal({
      // Total falsifie : doit etre entierement ecrase.
      totals: { subtotal: 1, discountAmount: 0, taxAmount: 0, total: 1, balanceDue: 1 },
    })

    // 2 x 50 000 = 100 000, plus 10 % de taxe = 110 000.
    assert.equal(proposal.totals?.subtotal, 100_000)
    assert.equal(proposal.totals?.taxAmount, 10_000)
    assert.equal(proposal.totals?.total, 110_000)
  })

  it('recalcule les totaux quand les lignes changent', async () => {
    const proposal = await mkProposal()
    const updated = await payload.update({
      collection: 'proposals',
      id: proposal.id,
      data: { lines: [{ description: 'Atelier', quantity: 1, unitPrice: 25_000, taxRate: 0 }] } as never,
      overrideAccess: true,
      context: { disableRevalidate: true },
    })
    assert.equal(updated.totals?.total, 25_000)
  })

  it('fige une proposition des son envoi', async () => {
    const proposal = await mkProposal()

    await payload.update({
      collection: 'proposals',
      id: proposal.id,
      data: { status: 'sent' },
      overrideAccess: true,
      context: { disableRevalidate: true, actor: 'staff' },
    })

    // Toute tentative de modifier le contenu doit echouer, meme avec
    // `overrideAccess` : c'est le hook qui refuse, pas le controle d'acces.
    await assert.rejects(
      () =>
        payload.update({
          collection: 'proposals',
          id: proposal.id,
          data: { lines: [{ description: 'Ajout', quantity: 9, unitPrice: 1, taxRate: 0 }] } as never,
          overrideAccess: true,
          context: { disableRevalidate: true },
        }),
      /envoy/i,
      'le contenu d une proposition envoyee ne doit plus changer',
    )
  })

  it('horodate l envoi', async () => {
    const proposal = await mkProposal()
    const sent = await payload.update({
      collection: 'proposals',
      id: proposal.id,
      data: { status: 'sent' },
      overrideAccess: true,
      context: { disableRevalidate: true, actor: 'staff' },
    })
    assert.ok(sent.sentAt, 'sentAt doit etre renseigne a l envoi')
  })

  it('refuse une transition de proposition interdite', async () => {
    const proposal = await mkProposal()
    // draft -> accepted saute l'envoi.
    await assert.rejects(
      () =>
        payload.update({
          collection: 'proposals',
          id: proposal.id,
          data: { status: 'accepted' },
          overrideAccess: true,
          context: { disableRevalidate: true },
        }),
      /Transition refus/,
    )
  })

  it('n autorise qu une seule conversion en projet', async () => {
    const proposal = await mkProposal()

    const first = await payload.create({
      collection: 'clientProjects',
      data: { title: 'Projet issu', customer, status: 'planned', sourceProposal: proposal.id } as never,
      overrideAccess: true,
      context: { disableRevalidate: true },
    })
    assert.ok(first.id)

    // L'index unique sur `sourceProposal` doit refuser la seconde.
    await assert.rejects(
      () =>
        payload.create({
          collection: 'clientProjects',
          data: {
            title: 'Doublon',
            customer,
            status: 'planned',
            sourceProposal: proposal.id,
          } as never,
          overrideAccess: true,
          context: { disableRevalidate: true },
        }),
      isDuplicateKeyError,
      'une proposition ne peut donner qu un seul projet',
    )
  })

  it('attribue une reference unique aux demandes', async () => {
    const a = await payload.create({
      collection: 'quoteRequests',
      data: { customer, status: 'draft', objectives: 'Un besoin a clarifier ensemble.' } as never,
      overrideAccess: true,
      context: { disableRevalidate: true },
    })
    const b = await payload.create({
      collection: 'quoteRequests',
      data: { customer, status: 'draft', objectives: 'Un autre besoin distinct.' } as never,
      overrideAccess: true,
      context: { disableRevalidate: true },
    })

    assert.ok(a.reference)
    assert.notEqual(a.reference, b.reference)
  })

  it('refuse une transition de devis interdite', async () => {
    const quote = await payload.create({
      collection: 'quoteRequests',
      data: { customer, status: 'draft', objectives: 'Description suffisamment longue.' } as never,
      overrideAccess: true,
      context: { disableRevalidate: true },
    })

    // draft -> accepted saute tout le parcours.
    await assert.rejects(
      () =>
        payload.update({
          collection: 'quoteRequests',
          id: quote.id,
          data: { status: 'accepted' },
          overrideAccess: true,
          context: { disableRevalidate: true },
        }),
      /Transition de statut refus/,
    )
  })

  it('isole les propositions entre clients', async () => {
    const proposal = await mkProposal()
    await payload.update({
      collection: 'proposals',
      id: proposal.id,
      data: { status: 'sent' },
      overrideAccess: true,
      context: { disableRevalidate: true, actor: 'staff' },
    })

    const otherUser = await payload.findByID({
      collection: 'users',
      id: other,
      overrideAccess: true,
    })

    const visible = await payload.find({
      collection: 'proposals',
      limit: 50,
      depth: 0,
      overrideAccess: false,
      user: { ...otherUser, collection: 'users' } as never,
    })

    assert.equal(visible.totalDocs, 0, 'un client ne voit pas les propositions d autrui')
  })

  it('n expose pas les notes internes au client', async () => {
    const proposal = await mkProposal({ internalNotes: 'Marge reduite, ne pas ceder davantage.' })

    const owner = await payload.findByID({
      collection: 'users',
      id: customer,
      overrideAccess: true,
    })

    const asCustomer = await payload.findByID({
      collection: 'proposals',
      id: proposal.id,
      depth: 0,
      overrideAccess: false,
      user: { ...owner, collection: 'users' } as never,
    })

    assert.equal(
      (asCustomer as { internalNotes?: string }).internalNotes,
      undefined,
      'les notes internes ne doivent jamais etre serialisees pour un client',
    )
  })

  it('fige une facture des son emission', async () => {
    const invoice = await payload.create({
      collection: 'invoices',
      data: {
        customer,
        status: 'draft',
        lines: [{ description: 'Prestation', quantity: 1, unitPrice: 80_000, taxRate: 0 }],
        currency: 'CAD',
      } as never,
      overrideAccess: true,
      context: { disableRevalidate: true },
    })

    assert.equal(invoice.totals?.total, 80_000)

    await payload.update({
      collection: 'invoices',
      id: invoice.id,
      data: { status: 'sent' },
      overrideAccess: true,
      context: { disableRevalidate: true, actor: 'staff' },
    })

    await assert.rejects(
      () =>
        payload.update({
          collection: 'invoices',
          id: invoice.id,
          data: { lines: [{ description: 'Autre', quantity: 1, unitPrice: 1, taxRate: 0 }] } as never,
          overrideAccess: true,
          context: { disableRevalidate: true },
        }),
      /mise|emise|émise/i,
      'une facture emise ne se reecrit pas',
    )
  })
})
