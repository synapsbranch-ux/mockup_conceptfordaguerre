/**
 * Reprise des comptes existants sous Better Auth.
 *
 * Contexte — ce dépôt n'a jamais utilisé Logto : la « migration Logto » décrite
 * dans le cahier des charges n'a pas d'objet ici. Ce qui doit réellement être
 * repris, ce sont les comptes créés par l'authentification native de Payload.
 *
 * Ce que fait le script :
 *
 *  1. Normalise l'adresse de chaque compte (minuscules, espaces retirés) et
 *     refuse de continuer si deux comptes se replient sur la même adresse.
 *  2. Complète les champs attendus par Better Auth et par les nouvelles règles
 *     d'accès : `role` (défaut `customer`), `active`, `suspended`,
 *     `forumBanned`, `emailVerified`.
 *  3. Marque `emailVerified` **uniquement** pour les adresses explicitement
 *     confirmées par l'opérateur (`MIGRATION_VERIFIED_EMAILS`), afin qu'une
 *     connexion Google puisse rejoindre le compte existant. Sans cette marque,
 *     Better Auth refuse le rattachement implicite — protection volontaire
 *     contre la prise de contrôle par pré-enregistrement d'adresse.
 *
 * Ce que le script ne fait pas :
 *
 *  - Il ne copie aucun mot de passe. Les empreintes Payload (PBKDF2 `salt`/
 *    `hash`) ne sont pas transposables vers Better Auth. Les comptes concernés
 *    se reconnectent via Google ou reçoivent de nouveaux identifiants par
 *    `npm run payload:bootstrap-admin`.
 *  - Il ne supprime rien : devis, projets, conversations, documents,
 *    notifications et historiques restent rattachés au même `_id`.
 *
 * Le script est **idempotent** : le rejouer ne produit aucun changement
 * supplémentaire.
 *
 *   npm run auth:migrate            # aperçu, aucune écriture
 *   npm run auth:migrate -- --apply # applique
 *
 * Sauvegarde et retour arrière : voir la section « Sauvegarde et restauration »
 * du README. En résumé, avant d'appliquer :
 *
 *   mongodump --uri "$DATABASE_URI" --collection users --out sauvegarde/
 *
 * et pour revenir en arrière :
 *
 *   mongorestore --uri "$DATABASE_URI" --drop sauvegarde/
 */
import { ObjectId } from 'mongodb'

import { getAuthDb } from '@/lib/auth/db'
import { normalizeRole } from '@/lib/auth/roles'

const APPLY = process.argv.includes('--apply')

/** Adresses dont l'opérateur confirme la propriété, pour le rattachement Google. */
const verifiedEmails = new Set(
  (process.env.MIGRATION_VERIFIED_EMAILS ?? '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean),
)

const normalizeEmail = (value: unknown): string | null => {
  if (typeof value !== 'string') return null
  const trimmed = value.trim().toLowerCase()
  return trimmed === '' ? null : trimmed
}

type Change = { id: string; email: string; sets: Record<string, unknown> }

const run = async (): Promise<void> => {
  const users = getAuthDb().collection('users')
  const docs = await users.find({}).toArray()

  console.log('\nReprise des comptes sous Better Auth')
  console.log('────────────────────────────────────')
  console.log(`${docs.length} compte(s) en base.`)
  console.log(APPLY ? 'Mode : APPLICATION' : 'Mode : APERÇU (aucune écriture)')
  console.log('')

  // 1. Contrôle d'unicité avant toute écriture.
  const byEmail = new Map<string, string[]>()
  for (const doc of docs) {
    const email = normalizeEmail(doc.email)
    if (!email) {
      console.log(`  ! ${String(doc._id)} — adresse absente ou invalide, compte ignoré.`)
      continue
    }
    byEmail.set(email, [...(byEmail.get(email) ?? []), String(doc._id)])
  }

  const collisions = [...byEmail.entries()].filter(([, ids]) => ids.length > 1)
  if (collisions.length > 0) {
    console.error('\n  ✗ Collision d’adresses après normalisation :')
    for (const [email, ids] of collisions) {
      console.error(`     ${email} → ${ids.join(', ')}`)
    }
    console.error(
      '\n  Aucune écriture effectuée. Fusionner ou corriger ces comptes à la main,\n' +
        '  puis relancer : l’appariement ne doit jamais être ambigu.\n',
    )
    process.exit(1)
  }

  // 2. Calcul des changements.
  const changes: Change[] = []
  for (const doc of docs) {
    const email = normalizeEmail(doc.email)
    if (!email) continue

    const sets: Record<string, unknown> = {}

    if (doc.email !== email) sets.email = email

    const role = normalizeRole(doc.role)
    if (doc.role !== role) sets.role = role

    if (typeof doc.active !== 'boolean') sets.active = true
    if (typeof doc.suspended !== 'boolean') sets.suspended = false
    if (typeof doc.forumBanned !== 'boolean') sets.forumBanned = false

    const shouldVerify = verifiedEmails.has(email)
    if (shouldVerify && doc.emailVerified !== true) sets.emailVerified = true
    else if (!shouldVerify && typeof doc.emailVerified !== 'boolean') sets.emailVerified = false

    if (Object.keys(sets).length > 0) {
      changes.push({ id: String(doc._id), email, sets })
    }
  }

  if (changes.length === 0) {
    console.log('  ✓ Rien à faire : tous les comptes sont déjà conformes.\n')
    process.exit(0)
  }

  for (const change of changes) {
    const summary = Object.entries(change.sets)
      .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
      .join(', ')
    console.log(`  • ${change.email} — ${summary}`)
  }

  if (!APPLY) {
    console.log(
      `\n${changes.length} compte(s) seraient modifiés.` +
        '\nRelancer avec --apply pour écrire. Sauvegarder la collection `users` avant.\n',
    )
    process.exit(0)
  }

  let applied = 0
  for (const change of changes) {
    await users.updateOne({ _id: new ObjectId(change.id) }, { $set: change.sets })
    applied += 1
  }

  console.log('────────────────────────────────────')
  console.log(`${applied} compte(s) mis à jour.`)
  if (verifiedEmails.size === 0) {
    console.log(
      '\nAucune adresse déclarée dans MIGRATION_VERIFIED_EMAILS : aucun compte ne\n' +
        'pourra être rejoint par connexion Google tant que ce n’est pas fait.',
    )
  }
  console.log('')
  process.exit(0)
}

await run()
