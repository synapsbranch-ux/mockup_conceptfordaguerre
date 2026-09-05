import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { computeTotals, formatMoney, roundCents } from '@/lib/commerce/money'
import {
  ACTIVE_APPOINTMENT_STATUSES,
  canTransitionAppointment,
  canTransitionInvoice,
  canTransitionProposal,
  canTransitionQuote,
  isInvoiceLocked,
  isProposalLocked,
} from '@/lib/commerce/transitions'

/**
 * Tests purs des regles commerciales : totaux et transitions de statut.
 * Aucune base de donnees n'est sollicitee.
 */

describe('calcul des totaux', () => {
  it('somme les lignes en centimes', () => {
    const totals = computeTotals({
      lines: [
        { description: 'Atelier', quantity: 2, unitPrice: 50_000 },
        { description: 'Rapport', quantity: 1, unitPrice: 25_000 },
      ],
    })
    assert.equal(totals.subtotal, 125_000)
    assert.equal(totals.total, 125_000)
    assert.equal(totals.balanceDue, 125_000)
  })

  it('applique une remise en pourcentage', () => {
    const totals = computeTotals({
      lines: [{ quantity: 1, unitPrice: 100_000 }],
      discountKind: 'percent',
      discountValue: 10,
    })
    assert.equal(totals.discountAmount, 10_000)
    assert.equal(totals.taxableBase, 90_000)
    assert.equal(totals.total, 90_000)
  })

  it('applique une remise fixe sans jamais depasser le sous-total', () => {
    const totals = computeTotals({
      lines: [{ quantity: 1, unitPrice: 30_000 }],
      discountKind: 'fixed',
      discountValue: 90_000,
    })
    assert.equal(totals.discountAmount, 30_000)
    assert.equal(totals.taxableBase, 0)
    assert.equal(totals.total, 0)
    assert.equal(totals.balanceDue, 0, 'un total ne peut jamais devenir negatif')
  })

  it('borne une remise en pourcentage superieure a 100', () => {
    const totals = computeTotals({
      lines: [{ quantity: 1, unitPrice: 50_000 }],
      discountKind: 'percent',
      discountValue: 250,
    })
    assert.equal(totals.discountAmount, 50_000)
    assert.equal(totals.total, 0)
  })

  it('calcule la taxe sur la base apres remise', () => {
    const totals = computeTotals({
      lines: [{ quantity: 1, unitPrice: 100_000, taxRate: 15 }],
      discountKind: 'percent',
      discountValue: 10,
    })
    assert.equal(totals.taxableBase, 90_000)
    // 15 % de 90 000, et non de 100 000.
    assert.equal(totals.taxAmount, 13_500)
    assert.equal(totals.total, 103_500)
  })

  it('repartit la remise au prorata quand les taux de taxe different', () => {
    // Deux lignes egales, l'une taxee a 20 %, l'autre exoneree.
    // La remise de 20 % doit peser sur les deux a parts egales.
    const totals = computeTotals({
      lines: [
        { quantity: 1, unitPrice: 100_000, taxRate: 20 },
        { quantity: 1, unitPrice: 100_000, taxRate: 0 },
      ],
      discountKind: 'percent',
      discountValue: 20,
    })
    assert.equal(totals.subtotal, 200_000)
    assert.equal(totals.discountAmount, 40_000)
    assert.equal(totals.taxableBase, 160_000)
    // Ligne taxee : 100 000 - 20 000 = 80 000, dont 20 % = 16 000.
    assert.equal(totals.taxAmount, 16_000)
    assert.equal(totals.total, 176_000)
  })

  it('deduit acompte et paiements du solde', () => {
    const totals = computeTotals({
      lines: [{ quantity: 1, unitPrice: 100_000 }],
      depositPaid: 30_000,
      amountPaid: 20_000,
    })
    assert.equal(totals.total, 100_000)
    assert.equal(totals.balanceDue, 50_000)
  })

  it('ne rend jamais un solde negatif en cas de surpaiement', () => {
    const totals = computeTotals({
      lines: [{ quantity: 1, unitPrice: 10_000 }],
      amountPaid: 50_000,
    })
    assert.equal(totals.balanceDue, 0)
  })

  it('neutralise les saisies aberrantes', () => {
    const totals = computeTotals({
      lines: [
        { quantity: -5, unitPrice: 10_000 },
        { quantity: Number.NaN, unitPrice: 10_000 },
        { quantity: 1, unitPrice: Number.POSITIVE_INFINITY },
        { quantity: 2, unitPrice: 1_000 },
      ],
    })
    // Seule la derniere ligne est exploitable.
    assert.equal(totals.subtotal, 2_000)
  })

  it('ignore un total transmis par le navigateur', () => {
    // Le calcul ne lit que les lignes : un champ `total` injecte est sans effet.
    const forged = { lines: [{ quantity: 1, unitPrice: 90_000 }], total: 1 } as never
    assert.equal(computeTotals(forged).total, 90_000)
  })

  it('arrondit au centime sans derive flottante', () => {
    assert.equal(roundCents(0.1 + 0.2), 0)
    assert.equal(roundCents(1234.5), 1235)
    assert.equal(roundCents(-1234.5), -1235)
    const totals = computeTotals({ lines: [{ quantity: 3, unitPrice: 3_333, taxRate: 14.975 }] })
    assert.ok(Number.isInteger(totals.total), 'le total doit rester un entier de centimes')
  })

  it('formate un montant en devise', () => {
    const formatted = formatMoney(123_456, 'CAD', 'fr-CA')
    assert.match(formatted, /1\s?234,56/)
  })
})

describe('transitions de devis', () => {
  it('le client envoie son brouillon, le personnel ne le fait pas a sa place', () => {
    assert.equal(canTransitionQuote('draft', 'submitted', 'customer'), true)
    assert.equal(canTransitionQuote('draft', 'submitted', 'staff'), false)
  })

  it('interdit de sauter directement de brouillon a accepte', () => {
    assert.equal(canTransitionQuote('draft', 'accepted', 'customer'), false)
    assert.equal(canTransitionQuote('submitted', 'accepted', 'customer'), false)
  })

  it('seul le client decide face a une proposition recue', () => {
    assert.equal(canTransitionQuote('quoted', 'accepted', 'customer'), true)
    assert.equal(canTransitionQuote('quoted', 'declined', 'customer'), true)
    assert.equal(canTransitionQuote('quoted', 'accepted', 'staff'), false)
  })

  it('un devis clos est terminal', () => {
    assert.equal(canTransitionQuote('closed', 'submitted', 'staff'), false)
    assert.equal(canTransitionQuote('accepted', 'declined', 'customer'), false)
  })

  it('conserver le meme statut reste possible', () => {
    assert.equal(canTransitionQuote('in_review', 'in_review', 'staff'), true)
  })
})

describe('propositions', () => {
  it('seul le personnel envoie une proposition', () => {
    assert.equal(canTransitionProposal('draft', 'sent', 'staff'), true)
    assert.equal(canTransitionProposal('draft', 'sent', 'customer'), false)
  })

  it('une proposition envoyee est figee', () => {
    assert.equal(isProposalLocked('draft'), false)
    assert.equal(isProposalLocked('sent'), true)
    assert.equal(isProposalLocked('accepted'), true)
  })

  it('un client ne peut pas ramener une proposition envoyee en brouillon', () => {
    assert.equal(canTransitionProposal('sent', 'draft', 'customer'), false)
    assert.equal(canTransitionProposal('sent', 'draft', 'staff'), false)
  })

  it('une proposition acceptee est terminale', () => {
    assert.equal(canTransitionProposal('accepted', 'declined', 'customer'), false)
  })
})

describe('factures', () => {
  it('n est modifiable qu en brouillon', () => {
    assert.equal(isInvoiceLocked('draft'), false)
    assert.equal(isInvoiceLocked('sent'), true)
    assert.equal(isInvoiceLocked('paid'), true)
  })

  it('une facture payee ou annulee est definitive', () => {
    assert.equal(canTransitionInvoice('paid', 'sent', 'staff'), false)
    assert.equal(canTransitionInvoice('cancelled', 'paid', 'staff'), false)
  })

  it('un client ne pilote aucun statut de facture', () => {
    assert.equal(canTransitionInvoice('sent', 'paid', 'customer'), false)
    assert.equal(canTransitionInvoice('draft', 'sent', 'customer'), false)
  })

  it('accepte le chemin normal de reglement', () => {
    assert.equal(canTransitionInvoice('draft', 'sent', 'staff'), true)
    assert.equal(canTransitionInvoice('sent', 'partially_paid', 'staff'), true)
    assert.equal(canTransitionInvoice('partially_paid', 'paid', 'staff'), true)
  })
})

describe('rendez-vous', () => {
  it('le client peut annuler, pas confirmer', () => {
    assert.equal(canTransitionAppointment('requested', 'cancelled', 'customer'), true)
    assert.equal(canTransitionAppointment('requested', 'confirmed', 'customer'), false)
    assert.equal(canTransitionAppointment('requested', 'confirmed', 'staff'), true)
  })

  it('seul le personnel constate une absence', () => {
    assert.equal(canTransitionAppointment('confirmed', 'no_show', 'staff'), true)
    assert.equal(canTransitionAppointment('confirmed', 'no_show', 'customer'), false)
  })

  it('un rendez-vous annule est terminal', () => {
    assert.equal(canTransitionAppointment('cancelled', 'confirmed', 'staff'), false)
  })

  it('seuls les statuts actifs occupent un creneau', () => {
    assert.deepEqual(ACTIVE_APPOINTMENT_STATUSES, ['requested', 'confirmed'])
    assert.ok(!ACTIVE_APPOINTMENT_STATUSES.includes('cancelled'))
  })
})
