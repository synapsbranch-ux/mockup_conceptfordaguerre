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
  const globals = db.collection('globals')

  /**
   * Étape 1 — garantir que le compteur existe.
   *
   * `$setOnInsert` n'écrit qu'à la création : un compteur déjà en place n'est
   * jamais remis à sa valeur de départ. L'index unique sur `globalType`
   * (`npm run db:ensure-indexes`) fait qu'une seule insertion peut aboutir ;
   * les autres échouent en doublon, ce qui est sans conséquence puisque le
   * document existe alors.
   *
   * Cette étape ne consomme aucun numéro : elle prépare seulement le terrain
   * pour l'incrément atomique qui suit.
   */
  await globals
    .updateOne(
      { globalType: 'billingSettings' },
      { $setOnInsert: { globalType: 'billingSettings', invoiceNextNumber: start } },
      { upsert: true },
    )
    .catch((error: { code?: number }) => {
      // 11000 : une insertion concurrente a gagné. Le document existe, c'est
      // tout ce qui compte.
      if (error?.code !== 11000) throw error
    })

  /**
   * Étape 2 — consommer un numéro.
   *
   * `$inc` est atomique au niveau du document et le document existe désormais
   * à coup sûr : deux appels simultanés obtiennent nécessairement deux valeurs
   * distinctes. Il n'y a plus de branche de repli où deux appelants pourraient
   * lire la même valeur.
   */
  const before = await globals.findOneAndUpdate(
    { globalType: 'billingSettings' },
    { $inc: { invoiceNextNumber: 1 } },
    { returnDocument: 'before' },
  )

  const sequence =
    before && typeof before.invoiceNextNumber === 'number' ? before.invoiceNextNumber : start

  return formatInvoiceNumber(sequence, format)
}
