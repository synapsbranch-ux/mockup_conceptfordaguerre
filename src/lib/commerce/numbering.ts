import 'server-only'

import { getAuthDb } from '@/lib/auth/db'
import { getBillingSettings } from '@/lib/settings'

/**
 * Attribution du numéro de facture.
 *
 * Le compteur est incrémenté par une **seule opération atomique**, une mise à
 * jour par pipeline d'agrégation avec `upsert`. C'est indispensable : sans
 * transactions, toute variante « lire puis écrire » — y compris une simple
 * branche de repli quand le document de réglages n'existe pas encore — laisse
 * deux appels simultanés obtenir le même numéro.
 *
 * Le pipeline fait deux choses en un temps :
 *  - si `invoiceNextNumber` est absent, il part de la valeur configurée ;
 *  - il l'incrémente.
 *
 * `returnDocument: 'before'` rend la valeur **avant** incrément : c'est celle
 * que l'appelant consomme. Un numéro consommé n'est jamais réattribué, même si
 * l'émission échoue ensuite : un trou dans la numérotation est préférable à un
 * doublon comptable.
 *
 * L'unicité reste par ailleurs garantie en base par un index unique partiel sur
 * `number` (voir `npm run db:ensure-indexes`) : si un numéro était malgré tout
 * réutilisé, l'écriture serait refusée plutôt que d'aboutir à un doublon.
 */

export type NumberFormat = {
  prefix: string
  padding: number
  includeYear: boolean
}

/** Met en forme une séquence selon les réglages. */
export const formatInvoiceNumber = (sequence: number, format: NumberFormat): string => {
  const padded = String(Math.max(1, sequence)).padStart(format.padding, '0')
  return format.includeYear
    ? `${format.prefix}-${new Date().getFullYear()}-${padded}`
    : `${format.prefix}-${padded}`
}

/**
 * Réserve le prochain numéro, de façon atomique.
 * Deux appels concurrents obtiennent toujours deux valeurs distinctes.
 */
export const reserveInvoiceNumber = async (): Promise<string> => {
  const settings = await getBillingSettings()

  const format: NumberFormat = {
    prefix: settings.invoicePrefix?.trim() || 'FA',
    padding: Math.min(10, Math.max(1, settings.invoiceNumberPadding ?? 4)),
    includeYear: settings.includeYear !== false,
  }

  // Point de départ si le compteur n'a jamais été écrit en base.
  const start = Math.max(1, settings.invoiceNextNumber ?? 1)

  const db = getAuthDb()

  // Les globals Payload vivent tous dans `globals`, distingués par `globalType`.
  const before = await db.collection('globals').findOneAndUpdate(
    { globalType: 'billingSettings' },
    [
      {
        $set: {
          globalType: 'billingSettings',
          // `$ifNull` couvre le cas où le document existe sans le champ, et
          // celui où il est créé par l'upsert : une seule expression, donc une
          // seule opération atomique, sans branche de repli.
          invoiceNextNumber: { $add: [{ $ifNull: ['$invoiceNextNumber', start] }, 1] },
        },
      },
    ],
    { returnDocument: 'before', upsert: true },
  )

  // `before` est nul lors de la toute première insertion : la valeur consommée
  // est alors le point de départ configuré.
  const sequence =
    before && typeof before.invoiceNextNumber === 'number' ? before.invoiceNextNumber : start

  return formatInvoiceNumber(sequence, format)
}
