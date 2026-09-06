import type { PayloadRequest } from 'payload'

import type { Actor } from '@/lib/commerce/transitions'

import { isCMSUser } from './index'

/**
 * Détermine au nom de qui une transition de statut est demandée.
 *
 * Trois sources, dans cet ordre :
 *
 *  1. **`context.actor`, explicite.** Une opération serveur légitime déclare
 *     l'acteur dont elle applique la décision. C'est indispensable parce qu'une
 *     écriture faite avec `overrideAccess: true` n'a pas de `req.user` : sans
 *     déclaration, une action d'équipe parfaitement valide serait prise pour
 *     une action cliente et refusée.
 *
 *  2. **`req.user`**, quand l'écriture vient du panneau CMS ou de l'API REST
 *     authentifiée.
 *
 *  3. **`customer`** par défaut — le moins privilégié. Une origine inconnue
 *     n'obtient jamais les droits de l'équipe.
 *
 * `context.actor` n'est pas une faille : `context` n'est jamais alimenté depuis
 * le corps d'une requête HTTP. Il est posé par du code serveur qui a déjà
 * vérifié la session et la propriété.
 */
export const resolveActor = (req: PayloadRequest): Actor => {
  const declared = (req.context as { actor?: unknown } | undefined)?.actor
  if (declared === 'staff' || declared === 'customer') return declared

  if (isCMSUser(req.user)) return 'staff'

  return 'customer'
}
