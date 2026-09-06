import 'server-only'

import { unstable_cache } from 'next/cache'

import { getPayloadClient } from '@/lib/payload'
import type { BillingSetting, ClientSpaceSetting, CommunitySetting } from '@/payload-types'

/**
 * Accès aux réglages administrables.
 *
 * Ces globals portent tout le contenu éditorial de l'espace client, du forum et
 * des commentaires : titres, introductions, états vides, règles. Rien de tout
 * cela n'est codé en dur dans un composant, afin qu'une reformulation ne
 * demande jamais de déploiement.
 *
 * Les lectures sont mémoïsées et invalidées par le hook `revalidateGlobal` posé
 * sur chaque global, comme le reste du contenu.
 */

const CONTENT_TAG = 'content'

const cached = <T>(fetcher: () => Promise<T>, key: string) =>
  unstable_cache(fetcher, ['settings', key], { tags: ['globals', CONTENT_TAG] })

export const getCommunitySettings = cached(async (): Promise<CommunitySetting> => {
  const payload = await getPayloadClient()
  return payload.findGlobal({ slug: 'communitySettings', depth: 1 })
}, 'community')

export const getClientSpaceSettings = cached(async (): Promise<ClientSpaceSetting> => {
  const payload = await getPayloadClient()
  return payload.findGlobal({ slug: 'clientSpaceSettings', depth: 1 })
}, 'client-space')

/**
 * Réglages de facturation.
 *
 * **Jamais** exposés à une page publique ni à l'espace client : ils portent les
 * coordonnées de l'émetteur et la numérotation. Réservés au code
 * d'administration et à la génération des factures.
 */
export const getBillingSettings = async (): Promise<BillingSetting> => {
  const payload = await getPayloadClient()
  return payload.findGlobal({ slug: 'billingSettings', depth: 1 })
}

/**
 * Remplace les jetons d'un modèle de texte administrable.
 * Un jeton inconnu est laissé tel quel plutôt que remplacé par « undefined ».
 */
export const fillTemplate = (
  template: string | null | undefined,
  values: Record<string, string>,
): string => {
  if (!template) return ''
  return template.replace(/\{(\w+)\}/g, (match, key: string) => values[key] ?? match)
}
