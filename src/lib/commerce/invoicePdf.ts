import 'server-only'

import { formatMoney } from './money'

/**
 * Génération du PDF d'une facture.
 *
 * `pdfkit` écrit en flux ; on collecte les fragments pour renvoyer un `Buffer`
 * complet, ce qui permet de fixer `Content-Length` et de joindre le document à
 * un courriel.
 *
 * Aucune note interne n'entre ici : la fonction ne reçoit que des champs
 * destinés au client. C'est délibéré — une facture est un document qui sort de
 * l'organisation, et la meilleure garantie qu'une note interne n'y figure pas
 * est qu'elle ne soit pas passée à la fonction qui la compose.
 */

export type InvoiceLine = {
  description: string
  quantity: number
  unitPrice: number
  taxRate: number
}

export type InvoicePdfInput = {
  number: string
  issueDate?: string | null
  dueDate?: string | null
  currency: string
  status: string
  issuer: {
    name?: string | null
    email?: string | null
    phone?: string | null
    address?: string | null
    taxIdentifiers?: { label: string; value: string }[]
  }
  billTo: {
    name?: string | null
    email?: string | null
    address?: string | null
    taxId?: string | null
  }
  lines: InvoiceLine[]
  totals: {
    subtotal: number
    discountAmount: number
    taxAmount: number
    total: number
    balanceDue: number
  }
  depositPaid?: number | null
  amountPaid?: number | null
  paymentTerms?: string | null
  publicNotes?: string | null
  footer?: string | null
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'BROUILLON',
  sent: 'Envoyée',
  partially_paid: 'Partiellement payée',
  paid: 'PAYÉE',
  overdue: 'EN RETARD',
  cancelled: 'ANNULÉE',
}

const formatDate = (value: string | null | undefined): string =>
  value ? new Intl.DateTimeFormat('fr-CA', { dateStyle: 'long' }).format(new Date(value)) : '—'

export const buildInvoicePdf = async (invoice: InvoicePdfInput): Promise<Buffer> => {
  const { default: PDFDocument } = await import('pdfkit')

  const doc = new PDFDocument({ size: 'A4', margin: 50, bufferPages: true })

  const chunks: Buffer[] = []
  doc.on('data', (chunk: Buffer) => chunks.push(chunk))

  const finished = new Promise<Buffer>((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)
  })

  const money = (amount: number) => formatMoney(amount, invoice.currency)

  const INK = '#101716'
  const MUTED = '#65706c'
  const LINE = '#d9d5c9'

  // --- En-tête --------------------------------------------------------------
  doc.fillColor(INK).fontSize(22).font('Helvetica-Bold').text('Facture', 50, 50)

  doc
    .fontSize(10)
    .font('Helvetica')
    .fillColor(MUTED)
    .text(invoice.number, 50, 78)

  // Statut, aligné à droite. Un brouillon ou une annulation doit sauter aux yeux.
  const statusLabel = STATUS_LABELS[invoice.status] ?? invoice.status
  const emphasise = ['draft', 'cancelled', 'overdue'].includes(invoice.status)
  doc
    .fontSize(emphasise ? 12 : 10)
    .font(emphasise ? 'Helvetica-Bold' : 'Helvetica')
    .fillColor(invoice.status === 'paid' ? '#173f35' : emphasise ? '#a3231b' : MUTED)
    .text(statusLabel, 300, 52, { width: 245, align: 'right' })

  doc
    .fontSize(9)
    .font('Helvetica')
    .fillColor(MUTED)
    .text(`Émise le ${formatDate(invoice.issueDate)}`, 300, 72, { width: 245, align: 'right' })
    .text(`Échéance ${formatDate(invoice.dueDate)}`, 300, 85, { width: 245, align: 'right' })

  // --- Émetteur et destinataire ---------------------------------------------
  let y = 125

  doc.fontSize(9).font('Helvetica-Bold').fillColor(INK).text('Émetteur', 50, y)
  doc.font('Helvetica').fillColor(MUTED)
  let leftY = y + 14
  for (const line of [
    invoice.issuer.name,
    invoice.issuer.address,
    invoice.issuer.email,
    invoice.issuer.phone,
    ...(invoice.issuer.taxIdentifiers ?? []).map((entry) => `${entry.label} : ${entry.value}`),
  ]) {
    if (!line) continue
    doc.text(String(line), 50, leftY, { width: 220 })
    leftY = doc.y + 2
  }

  doc.fontSize(9).font('Helvetica-Bold').fillColor(INK).text('Facturé à', 310, y)
  doc.font('Helvetica').fillColor(MUTED)
  let rightY = y + 14
  for (const line of [
    invoice.billTo.name,
    invoice.billTo.address,
    invoice.billTo.email,
    invoice.billTo.taxId ? `N° fiscal : ${invoice.billTo.taxId}` : null,
  ]) {
    if (!line) continue
    doc.text(String(line), 310, rightY, { width: 235 })
    rightY = doc.y + 2
  }

  y = Math.max(leftY, rightY) + 22

  // --- Lignes ---------------------------------------------------------------
  const columns = { description: 50, quantity: 330, unit: 390, total: 470 }

  doc.fontSize(9).font('Helvetica-Bold').fillColor(INK)
  doc.text('Désignation', columns.description, y)
  doc.text('Qté', columns.quantity, y, { width: 40, align: 'right' })
  doc.text('Prix unit.', columns.unit, y, { width: 70, align: 'right' })
  doc.text('Total', columns.total, y, { width: 75, align: 'right' })

  y += 14
  doc.strokeColor(LINE).lineWidth(0.5).moveTo(50, y).lineTo(545, y).stroke()
  y += 8

  doc.font('Helvetica').fillColor(INK)
  for (const line of invoice.lines) {
    // Saut de page si la ligne ne tient plus.
    if (y > 690) {
      doc.addPage()
      y = 50
    }

    const lineTotal = Math.round(line.quantity * line.unitPrice)

    doc.fontSize(9).text(line.description, columns.description, y, { width: 270 })
    const descriptionBottom = doc.y

    doc.text(String(line.quantity), columns.quantity, y, { width: 40, align: 'right' })
    doc.text(money(line.unitPrice), columns.unit, y, { width: 70, align: 'right' })
    doc.text(money(lineTotal), columns.total, y, { width: 75, align: 'right' })

    if (line.taxRate > 0) {
      doc
        .fontSize(8)
        .fillColor(MUTED)
        .text(`Taxe ${line.taxRate} %`, columns.description, descriptionBottom + 1)
        .fillColor(INK)
        .fontSize(9)
      y = doc.y + 6
    } else {
      y = Math.max(descriptionBottom, y + 11) + 6
    }
  }

  doc.strokeColor(LINE).moveTo(50, y).lineTo(545, y).stroke()
  y += 10

  // --- Totaux ---------------------------------------------------------------
  const totalRow = (label: string, value: string, bold = false) => {
    doc
      .fontSize(bold ? 11 : 9)
      .font(bold ? 'Helvetica-Bold' : 'Helvetica')
      .fillColor(bold ? INK : MUTED)
      .text(label, 330, y, { width: 130, align: 'right' })
      .fillColor(INK)
      .text(value, columns.total, y, { width: 75, align: 'right' })
    y = doc.y + 4
  }

  totalRow('Sous-total', money(invoice.totals.subtotal))
  if (invoice.totals.discountAmount > 0) {
    totalRow('Remise', `−${money(invoice.totals.discountAmount)}`)
  }
  if (invoice.totals.taxAmount > 0) totalRow('Taxes', money(invoice.totals.taxAmount))
  totalRow('Total', money(invoice.totals.total), true)

  if ((invoice.depositPaid ?? 0) > 0) totalRow('Acompte réglé', `−${money(invoice.depositPaid ?? 0)}`)
  if ((invoice.amountPaid ?? 0) > 0) totalRow('Déjà encaissé', `−${money(invoice.amountPaid ?? 0)}`)

  if (invoice.totals.balanceDue !== invoice.totals.total) {
    totalRow('Reste à payer', money(invoice.totals.balanceDue), true)
  }

  // --- Mentions -------------------------------------------------------------
  y += 16
  for (const [title, body] of [
    ['Conditions de paiement', invoice.paymentTerms],
    ['Notes', invoice.publicNotes],
  ] as const) {
    if (!body) continue
    if (y > 700) {
      doc.addPage()
      y = 50
    }
    doc.fontSize(9).font('Helvetica-Bold').fillColor(INK).text(title, 50, y)
    doc.font('Helvetica').fillColor(MUTED).fontSize(9).text(body, 50, doc.y + 3, { width: 495 })
    y = doc.y + 12
  }

  if (invoice.footer) {
    doc
      .fontSize(8)
      .fillColor(MUTED)
      .text(invoice.footer, 50, 780, { width: 495, align: 'center' })
  }

  doc.end()
  return finished
}
