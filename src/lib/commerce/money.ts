/**
 * Calculs monétaires — source de vérité unique, côté serveur.
 *
 * Aucun total transmis par le navigateur n'est jamais retenu : les lignes sont
 * relues, puis les sous-totaux, remises, taxes et solde sont recalculés ici.
 * Un client qui poste `total: 1` obtient le total réel.
 *
 * Les montants sont manipulés en **centimes entiers**. Les nombres flottants
 * accumulent des erreurs de représentation (0.1 + 0.2 ≠ 0.3), inacceptables sur
 * une facture. La conversion en unité monétaire n'a lieu qu'à l'affichage.
 *
 * Module pur : aucune dépendance serveur, donc directement testable.
 */

export type DiscountKind = 'none' | 'fixed' | 'percent'

export type LineInput = {
  /** Libellé de la ligne. */
  description?: string | null
  /** Quantité. Une valeur non finie ou négative compte pour 0. */
  quantity?: number | null
  /** Prix unitaire, en centimes. */
  unitPrice?: number | null
  /** Taux de taxe de la ligne, en pourcentage (ex. 15 pour 15 %). */
  taxRate?: number | null
}

export type TotalsInput = {
  lines: LineInput[]
  discountKind?: DiscountKind | null
  /** Montant en centimes si `fixed`, pourcentage si `percent`. */
  discountValue?: number | null
  /** Acompte déjà réglé, en centimes. */
  depositPaid?: number | null
  /** Somme des paiements enregistrés, en centimes. */
  amountPaid?: number | null
}

export type LineTotal = {
  description: string
  quantity: number
  unitPrice: number
  taxRate: number
  /** Quantité × prix unitaire, avant remise et taxe. */
  lineSubtotal: number
}

export type Totals = {
  lines: LineTotal[]
  subtotal: number
  discountAmount: number
  /** Sous-total après remise, base d'imposition. */
  taxableBase: number
  taxAmount: number
  total: number
  depositPaid: number
  amountPaid: number
  /** Reste à payer. Jamais négatif. */
  balanceDue: number
}

/** Arrondi commercial au centime, symétrique autour de zéro. */
export const roundCents = (value: number): number => {
  if (!Number.isFinite(value)) return 0
  return Math.sign(value) * Math.round(Math.abs(value))
}

/** Normalise un nombre venu d'une saisie : non fini, NaN ou négatif → 0. */
const positive = (value: unknown): number => {
  const parsed = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(parsed) || parsed < 0) return 0
  return parsed
}

/** Normalise un entier de centimes. */
const cents = (value: unknown): number => roundCents(positive(value))

/**
 * Calcule l'intégralité des totaux d'un devis, d'une proposition ou d'une
 * facture.
 *
 * Ordre d'application, volontairement explicite :
 *   1. sous-total = somme des lignes (quantité × prix unitaire) ;
 *   2. remise appliquée sur le sous-total ;
 *   3. taxe calculée ligne par ligne, sur la base **après remise**, la remise
 *      étant répartie au prorata de chaque ligne ;
 *   4. total = base imposable + taxes ;
 *   5. solde = total − acompte − paiements, borné à zéro.
 *
 * Répartir la remise au prorata évite qu'une remise globale fausse le calcul
 * lorsque plusieurs taux de taxe coexistent.
 */
export const computeTotals = (input: TotalsInput): Totals => {
  const lines: LineTotal[] = (Array.isArray(input.lines) ? input.lines : []).map((line) => {
    const quantity = positive(line.quantity)
    const unitPrice = cents(line.unitPrice)
    const taxRate = positive(line.taxRate)
    return {
      description: typeof line.description === 'string' ? line.description : '',
      quantity,
      unitPrice,
      taxRate,
      lineSubtotal: roundCents(quantity * unitPrice),
    }
  })

  const subtotal = roundCents(lines.reduce((sum, line) => sum + line.lineSubtotal, 0))

  // --- Remise ---------------------------------------------------------------
  const kind: DiscountKind = input.discountKind ?? 'none'
  const rawDiscount = positive(input.discountValue)

  let discountAmount = 0
  if (kind === 'fixed') {
    discountAmount = roundCents(rawDiscount)
  } else if (kind === 'percent') {
    // Un pourcentage au-delà de 100 est ramené à 100 : une remise ne crée
    // jamais un montant négatif.
    discountAmount = roundCents((subtotal * Math.min(rawDiscount, 100)) / 100)
  }
  // Une remise fixe ne peut pas excéder le sous-total.
  discountAmount = Math.min(discountAmount, subtotal)

  const taxableBase = roundCents(subtotal - discountAmount)

  // --- Taxes, ligne par ligne, sur la base après remise ----------------------
  // La remise est répartie au prorata du poids de chaque ligne dans le
  // sous-total, afin que des taux différents restent corrects.
  const taxAmount = roundCents(
    lines.reduce((sum, line) => {
      if (line.lineSubtotal === 0 || line.taxRate === 0) return sum
      const share = subtotal === 0 ? 0 : line.lineSubtotal / subtotal
      const lineBase = line.lineSubtotal - discountAmount * share
      return sum + (lineBase * line.taxRate) / 100
    }, 0),
  )

  const total = roundCents(taxableBase + taxAmount)

  const depositPaid = Math.min(cents(input.depositPaid), total)
  const amountPaid = cents(input.amountPaid)

  const balanceDue = Math.max(0, roundCents(total - depositPaid - amountPaid))

  return {
    lines,
    subtotal,
    discountAmount,
    taxableBase,
    taxAmount,
    total,
    depositPaid,
    amountPaid,
    balanceDue,
  }
}

/** Formatage d'affichage. Les centimes ne sont convertis qu'ici. */
export const formatMoney = (
  amountInCents: number,
  currency = 'CAD',
  locale = 'fr-CA',
): string =>
  new Intl.NumberFormat(locale, { style: 'currency', currency }).format(
    roundCents(amountInCents) / 100,
  )
