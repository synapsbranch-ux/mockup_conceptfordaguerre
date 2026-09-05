import type { Access, FieldAccess } from 'payload'

import { isCMSUser, isSignedIn } from './index'

/**
 * Règles d'accès fondées sur la propriété.
 *
 * Elles renvoient une clause `Where` plutôt qu'un simple booléen : Payload
 * l'applique directement à la requête MongoDB. Une personne ne peut donc pas
 * atteindre l'enregistrement d'une autre, **même en connaissant son
 * identifiant** — la lecture par ID est filtrée par la même clause, ce qui
 * ferme les références directes non sécurisées (IDOR).
 *
 * Un document invisible remonte en 404 et non en 403 : l'existence d'une
 * ressource privée n'est jamais divulguée.
 */

/** Nom du champ portant le propriétaire. `customer` par défaut. */
type OwnerField = string

const ownerClause = (field: OwnerField, userId: string | number) => ({
  [field]: { equals: userId },
})

/** Lecture : le personnel voit tout, une personne connectée voit ses documents. */
export const ownerOrStaffRead =
  (field: OwnerField = 'customer'): Access =>
  ({ req: { user } }) => {
    if (isCMSUser(user)) return true
    if (!isSignedIn(user) || !user) return false
    return ownerClause(field, user.id)
  }

/** Mise à jour : le personnel, ou le propriétaire sur ses propres documents. */
export const ownerOrStaffUpdate =
  (field: OwnerField = 'customer'): Access =>
  ({ req: { user } }) => {
    if (isCMSUser(user)) return true
    if (!isSignedIn(user) || !user) return false
    return ownerClause(field, user.id)
  }

/**
 * Suppression réservée au personnel par défaut.
 * Les collections où l'auteur peut supprimer son propre contenu (commentaires,
 * messages de forum) déclarent explicitement `ownerOrStaffUpdate`.
 */
export const staffOnlyDelete: Access = ({ req: { user } }) => isCMSUser(user)

/** Création réservée à toute personne connectée et en règle. */
export const signedInCreate: Access = ({ req: { user } }) => isSignedIn(user)

/**
 * Champ que seul le personnel peut écrire.
 * Sert aux statuts de modération et aux notes internes : le navigateur ne doit
 * jamais pouvoir les positionner.
 */
export const staffWriteOnly: FieldAccess = ({ req: { user } }) => isCMSUser(user)

/**
 * Champ en lecture seule pour tous : renseigné exclusivement par un hook
 * serveur. Empêche par exemple qu'un auteur soit usurpé depuis la requête.
 */
export const serverWriteOnly: FieldAccess = () => false
