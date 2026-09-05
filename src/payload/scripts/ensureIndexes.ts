/**
 * Pose les index uniques **partiels** que la configuration Payload ne sait pas
 * exprimer.
 *
 * Pourquoi partiels plutôt qu'uniques tout court — MongoDB traite l'absence de
 * valeur comme une valeur. Un index unique ordinaire sur un champ nullable
 * ferait donc entrer en collision **tous** les documents qui ne le portent pas
 * entre eux : tous les brouillons de facture (pas encore de numéro), tous les
 * projets créés à la main (pas de proposition d'origine), tous les rendez-vous
 * annulés (créneau libéré). En restreignant l'index aux documents où le champ
 * est réellement renseigné, seuls les cas à contraindre le sont.
 *
 * Ces index sont la seule garantie d'exclusion mutuelle disponible : l'instance
 * MongoDB de production est autonome, sans replica set, donc sans transactions.
 * Deux écritures concurrentes ne peuvent pas être sérialisées autrement.
 *
 * Idempotent : relancer ne produit aucun changement.
 *
 *   npm run db:ensure-indexes
 */
import { getAuthDb } from '@/lib/auth/db'

type PartialIndex = {
  collection: string
  name: string
  key: Record<string, 1>
  field: string
  purpose: string
}

const INDEXES: PartialIndex[] = [
  {
    collection: 'appointments',
    name: 'appointments_active_slot_unique',
    key: { slotKey: 1 },
    field: 'slotKey',
    purpose: 'un créneau ne peut être réservé qu’une fois tant qu’il est actif',
  },
  {
    collection: 'invoices',
    name: 'invoices_number_unique',
    key: { number: 1 },
    field: 'number',
    purpose: 'un numéro de facture émise est unique',
  },
  {
    collection: 'clientProjects',
    name: 'client_projects_source_proposal_unique',
    key: { sourceProposal: 1 },
    field: 'sourceProposal',
    purpose: 'une proposition ne peut être convertie qu’une seule fois en projet',
  },
]

const run = async (): Promise<void> => {
  const db = getAuthDb()

  console.log('\nIndex uniques partiels')
  console.log('──────────────────────')

  let created = 0
  let unchanged = 0

  for (const index of INDEXES) {
    const collection = db.collection(index.collection)
    const existing = await collection.indexes().catch(() => [])

    if (existing.some((entry) => entry.name === index.name)) {
      console.log(`  • ${index.name} — déjà en place.`)
      unchanged += 1
      continue
    }

    await collection.createIndex(index.key, {
      name: index.name,
      unique: true,
      // N'indexe que les documents où le champ porte réellement une valeur.
      partialFilterExpression: { [index.field]: { $type: index.field === 'sourceProposal' ? 'objectId' : 'string' } },
    })

    console.log(`  ✓ ${index.name} — créé (${index.purpose}).`)
    created += 1
  }

  console.log('──────────────────────')
  console.log(`${created} créé(s), ${unchanged} inchangé(s).\n`)
  process.exit(0)
}

await run()
