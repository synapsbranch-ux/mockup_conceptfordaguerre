import { NextResponse } from 'next/server'

import { getSessionUser } from '@/lib/auth/dal'
import { buildInvoicePdf } from '@/lib/commerce/invoicePdf'
import { getPayloadClient } from '@/lib/payload'
import { checkRateLimit } from '@/lib/rateLimit'
import { getBillingSettings } from '@/lib/settings'
import { isStaffRole } from '@/lib/auth/roles'

/**
 * PDF d'une facture.
 *
 * Lu avec les droits réels de la personne : la clause `read` de la collection
 * restreint déjà aux factures dont elle est le client. Un identifiant
 * appartenant à quelqu'un d'autre répond 404.
 *
 * Une facture en **brouillon** n'est jamais téléchargeable par un client : elle
 * n'a pas été émise et son contenu peut encore changer. Seul le personnel peut
 * en obtenir un aperçu.
 *
 * Les notes internes ne sont pas transmises au générateur : elles ne peuvent
 * donc pas se retrouver sur le document, quelles que soient les évolutions du
 * gabarit.
 */

export const dynamic = 'force-dynamic'

export const GET = async (
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> => {
  const { id } = await params

  const sessionUser = await getSessionUser()
  if (!sessionUser) {
    return NextResponse.json({ ok: false, code: 'unauthenticated' }, { status: 401 })
  }

  const { allowed } = await checkRateLimit('invoice-pdf', sessionUser.id, 60, 3600)
  if (!allowed) {
    return NextResponse.json({ ok: false, code: 'rate_limited' }, { status: 429 })
  }

  const payload = await getPayloadClient()

  const invoice = await payload
    .findByID({
      collection: 'invoices',
      id,
      depth: 0,
      overrideAccess: false,
      user: { ...sessionUser, collection: 'users' },
    })
    .catch(() => null)

  if (!invoice) {
    return NextResponse.json({ ok: false, code: 'not_found' }, { status: 404 })
  }

  const staff = isStaffRole(sessionUser.role)

  // Un brouillon n'existe pas encore pour le client.
  if (invoice.status === 'draft' && !staff) {
    return NextResponse.json({ ok: false, code: 'not_found' }, { status: 404 })
  }

  const settings = await getBillingSettings()

  const pdf = await buildInvoicePdf({
    number: invoice.number ?? String(invoice.id),
    issueDate: invoice.issueDate,
    dueDate: invoice.dueDate,
    currency: (invoice.currency as string) ?? settings.defaultCurrency ?? 'CAD',
    status: invoice.status as string,
    issuer: {
      name: settings.companyName,
      email: settings.companyEmail,
      phone: settings.companyPhone,
      address: settings.companyAddress,
      taxIdentifiers: (settings.taxIdentifiers ?? []).map((entry) => ({
        label: entry.label,
        value: entry.value,
      })),
    },
    billTo: {
      name: invoice.billTo?.name,
      email: invoice.billTo?.email,
      address: invoice.billTo?.address,
      taxId: invoice.billTo?.taxId,
    },
    lines: (invoice.lines ?? []).map((line) => ({
      description: line.description ?? '',
      quantity: line.quantity ?? 0,
      unitPrice: line.unitPrice ?? 0,
      taxRate: line.taxRate ?? 0,
    })),
    totals: {
      subtotal: invoice.totals?.subtotal ?? 0,
      discountAmount: invoice.totals?.discountAmount ?? 0,
      taxAmount: invoice.totals?.taxAmount ?? 0,
      total: invoice.totals?.total ?? 0,
      balanceDue: invoice.totals?.balanceDue ?? 0,
    },
    depositPaid: invoice.depositPaid,
    amountPaid: invoice.amountPaid,
    paymentTerms: invoice.paymentTerms ?? settings.defaultPaymentTerms,
    publicNotes: invoice.publicNotes,
    footer: settings.invoiceFooter,
    // `internalNotes` n'est volontairement pas transmis.
  })

  const filename = `${(invoice.number ?? 'facture').replace(/[^a-z0-9-]/gi, '')}.pdf`

  return new Response(new Uint8Array(pdf), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Length': String(pdf.length),
      'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(filename)}`,
      'Cache-Control': 'private, no-store, max-age=0',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
