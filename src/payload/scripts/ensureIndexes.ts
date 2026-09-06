/**
 * Pose les index que la configuration Payload ne sait pas exprimer.
 *
 * Payload gère les index simples et composés, mais pas les
 * `partialFilterExpression`. Or c'est exactement ce qu'il faut ici, pour deux
 * invariants qui doivent tenir **sous concurrence** — l'instance MongoDB de
 * production étant autonome, aucune transaction ne peut les garantir.
 *
 * Pourquoi partiel et non simplement unique :
 *
 *  - MongoDB traite l'absence de valeur comme une valeur. Un index unique
 *    ordinaire ferait donc entrer en collision tous les documents « vides »
 *    entre eux — tous les rendez-vous annulés, tous les projets créés
 *    manuellement.
 *  - `sparse` ne suffit pas : il ignore les documents où le champ est
 *    **absent**, mais pas ceux où il vaut explicitement `null`. Or nos hooks
 *    écrivent `null` pour libérer un créneau.
 *
 * En restreignant l'index aux documents dont le champ est une chaîne, seuls les
 * enregistrements réellement porteurs de l'invariant sont contraints.
 *
 * Idempotent : relancer ne produit aucun changement.
 *
 *   npm run db:ensure-indexes
 */
import type { Db } from 'mongodb'

type PartialUniqueIndex = {
  collection: string
  field: string
  name: string
  /**
   * Type BSON reellement stocke.
   *
   * Determinant : un champ texte est une `string`, mais une RELATION est
   * stockee par Payload en `objectId`. Filtrer sur le mauvais type produit un
   * index qui ne couvre aucun document — donc une contrainte silencieusement
   * inoperante.
   */
  bsonType: 'string' | 'objectId'
  reason: string
}

const INDEXES: PartialUniqueIndex[] = [
  {
    collection: 'appointments',
    field: 'slotKey',
    name: 'appointments_active_slot_unique',
    // Champ texte calcule par un hook.
    bsonType: 'string',
    reason: 'Empêche deux réservations simultanées du même créneau.',
  },
  {
    collection: 'globals',
    field: 'globalType',
    name: 'globals_type_unique',
    // Un global est par definition unique pour son type. Sans cet index, deux
    // insertions concurrentes creeraient deux documents pour le meme global —
    // et le compteur de numeros de facture, qui vit ici, distribuerait deux
    // fois la meme valeur.
    bsonType: 'string',
    reason: 'Un seul document par type de reglage global.',
  },
  {
    collection: 'invoices',
    field: 'number',
    name: 'invoices_number_unique',
    // Texte. Partiel car un brouillon n'a pas encore de numero : un index
    // unique ordinaire ferait entrer en collision tous les brouillons.
    bsonType: 'string',
    reason: 'Deux factures ne peuvent pas porter le meme numero.',
  },
  {
    collection: 'clientprojects',
    field: 'sourceProposal',
    name: 'clientprojects_source_proposal_unique',
    // Relation : stockee en ObjectId, pas en chaine.
    bsonType: 'objectId',
    reason: 'Une proposition acceptée ne peut donner qu’un seul projet.',
  },
]

/**
 * Crée les index manquants.
 *
 * `db` est injectable : les tests passent la connexion déjà ouverte par
 * Payload, ce qui évite d'ouvrir un second client qui maintiendrait la boucle
 * d'événements active.
 */
export const ensurePartialUniqueIndexes = async (
  db: Db,
  log: (message: string) => void = () => {},
): Promise<void> => {
  for (const index of INDEXES) {
    const collection = db.collection(index.collection)
    const existing = await collection.indexes().catch(() => [])

    if (existing.some((entry) => entry.name === index.name)) {
      log(`  • ${index.name} — déjà en place.`)
      continue
    }

    await collection.createIndex(
      { [index.field]: 1 },
      {
        name: index.name,
        unique: true,
        partialFilterExpression: { [index.field]: { $type: index.bsonType } },
      },
    )

    log(`  ✓ ${index.name} — créé. ${index.reason}`)
  }
}

/**
 * Point d'entrée en ligne de commande.
 *
 * Volontairement séparé de la fonction ci-dessus : importer ce module ne doit
 * jamais provoquer d'effet de bord ni terminer le processus appelant.
 */
const runAsScript = async (): Promise<void> => {
  const { getAuthDb } = await import('@/lib/auth/db')
  const { getAuthMongoClient } = await import('@/lib/auth/db')

  await ensurePartialUniqueIndexes(getAuthDb(), (message) => console.log(message))

  await getAuthMongoClient().close()
  process.exit(0)
}

// `payload run` exécute ce fichier directement ; un import de test ne passe pas ici.
// `payload run` place le chemin du script quelque part dans argv, pas
// necessairement en position 1 : on balaie l'ensemble.
if (process.argv.some((arg) => arg.includes('ensureIndexes'))) {
  await runAsScript()
}
