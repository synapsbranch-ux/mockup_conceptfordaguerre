/**
 * Amorçage des comptes super-administrateurs, sur Better Auth.
 *
 * Aucun mot de passe n'est écrit dans le dépôt : il est demandé en saisie
 * masquée, ou lu depuis `BOOTSTRAP_ADMIN_PASSWORD` pour un déploiement
 * automatisé.
 *
 * Le script est **idempotent** et couvre deux situations :
 *
 *  1. Compte absent — l'utilisateur et ses identifiants sont créés.
 *  2. Compte déjà présent en base mais sans identifiants Better Auth — c'est le
 *     cas des comptes hérités de l'authentification Payload, dont l'empreinte
 *     de mot de passe n'est pas transposable. Le document utilisateur est
 *     conservé tel quel (contributions, relations, historique) et seuls des
 *     identifiants Better Auth lui sont rattachés.
 *
 * Un compte disposant déjà d'identifiants n'est jamais réinitialisé.
 *
 *   npm run payload:bootstrap-admin
 */
import { createInterface } from 'node:readline'
import { stdin, stdout } from 'node:process'

import { ObjectId } from 'mongodb'

import { auth } from '@/lib/auth/server'
import { getAuthDb } from '@/lib/auth/db'

type Candidate = { email: string; name: string }

const CANDIDATES: Candidate[] = [
  { email: 'jdvalcy02@gmail.com', name: 'Jacques-Daguerre Valcy' },
  { email: 'synapsbranch@gmail.com', name: 'Administrateur technique' },
]

const MIN_PASSWORD_LENGTH = 12

/** Émetteur utilisé par Better Auth pour un compte à mot de passe local. */
const CREDENTIAL_ISSUER = 'local:credential'

/** Lecture d'une ligne sans écho, pour ne jamais afficher un mot de passe. */
const promptHidden = (question: string): Promise<string> =>
  new Promise((resolve) => {
    const rl = createInterface({ input: stdin, output: stdout, terminal: true })
    const asMutable = rl as unknown as { _writeToOutput?: (text: string) => void }
    stdout.write(question)
    asMutable._writeToOutput = () => {}
    rl.question('', (answer) => {
      rl.close()
      stdout.write('\n')
      resolve(answer)
    })
  })

const validatePassword = (value: string): string | null => {
  if (value.length < MIN_PASSWORD_LENGTH) {
    return `Le mot de passe doit faire au moins ${MIN_PASSWORD_LENGTH} caractères.`
  }
  if (!/[a-z]/.test(value) || !/[A-Z]/.test(value) || !/[0-9]/.test(value)) {
    return 'Le mot de passe doit contenir au moins une minuscule, une majuscule et un chiffre.'
  }
  return null
}

const resolvePassword = async (email: string): Promise<string> => {
  const fromEnv = process.env.BOOTSTRAP_ADMIN_PASSWORD
  if (fromEnv) {
    const problem = validatePassword(fromEnv)
    if (problem) throw new Error(`BOOTSTRAP_ADMIN_PASSWORD refusé : ${problem}`)
    return fromEnv
  }

  if (!stdin.isTTY) {
    throw new Error(
      `Aucun terminal interactif disponible pour saisir le mot de passe de ${email}. ` +
        'Définir BOOTSTRAP_ADMIN_PASSWORD, ou exécuter la commande dans un terminal.',
    )
  }

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const first = await promptHidden(`  Mot de passe pour ${email} : `)
    const problem = validatePassword(first)
    if (problem) {
      console.log(`  ✗ ${problem}`)
      continue
    }
    const second = await promptHidden('  Confirmer le mot de passe    : ')
    if (first !== second) {
      console.log('  ✗ Les deux saisies diffèrent.')
      continue
    }
    return first
  }

  throw new Error(`Impossible d'obtenir un mot de passe valide pour ${email}.`)
}

/**
 * Comptes à traiter.
 * `BOOTSTRAP_ADMIN_EMAIL` permet de n'en viser qu'un seul, afin d'attribuer un
 * mot de passe distinct à chaque compte lors d'un amorçage non interactif.
 */
const resolveCandidates = (): Candidate[] => {
  const only = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase()
  if (!only) return CANDIDATES
  const known = CANDIDATES.find((candidate) => candidate.email.toLowerCase() === only)
  if (known) return [known]
  return [{ email: only, name: process.env.BOOTSTRAP_ADMIN_NAME?.trim() || only }]
}

/** Normalisation identique à celle utilisée par la migration : appariement fiable. */
const normalizeEmail = (value: string): string => value.trim().toLowerCase()

const run = async (): Promise<void> => {
  const ctx = await auth.$context
  const db = getAuthDb()
  const users = db.collection('users')

  console.log('\nAmorçage des comptes super-administrateurs')
  console.log('──────────────────────────────────────────')

  let created = 0
  let linked = 0
  let unchanged = 0

  for (const candidate of resolveCandidates()) {
    const email = normalizeEmail(candidate.email)
    const existing = await ctx.internalAdapter.findUserByEmail(email)

    if (!existing) {
      const password = await resolvePassword(email)
      const user = await ctx.internalAdapter.createUser(
        { email, name: candidate.name },
        // Origine du provisionnement : amorçage administrateur, hors requête HTTP.
        { method: 'admin' },
      )
      await ctx.internalAdapter.createAccount({
        userId: user.id,
        providerId: 'credential',
        issuer: CREDENTIAL_ISSUER,
        accountId: user.id,
        password: await ctx.password.hash(password),
      })
      // `role` est `input: false` : il ne peut pas être posé à la création.
      // Il est écrit ici, côté serveur, hors de toute requête client.
      await users.updateOne(
        { _id: new ObjectId(String(user.id)) },
        { $set: { role: 'super-admin', active: true, suspended: false, forumBanned: false } },
      )
      console.log(`  ✓ ${email} — compte super-administrateur créé.`)
      created += 1
      continue
    }

    const accounts = await ctx.internalAdapter.findAccounts(existing.user.id)
    const hasCredential = accounts.some((account) => account.providerId === 'credential')

    if (hasCredential) {
      console.log(`  • ${email} — identifiants déjà en place, aucune modification.`)
      unchanged += 1
    } else {
      // Compte hérité de l'authentification Payload : l'empreinte de mot de
      // passe n'est pas transposable, on rattache de nouveaux identifiants sans
      // toucher au document utilisateur ni à ses relations.
      const password = await resolvePassword(email)
      await ctx.internalAdapter.createAccount({
        userId: existing.user.id,
        providerId: 'credential',
        issuer: CREDENTIAL_ISSUER,
        accountId: existing.user.id,
        password: await ctx.password.hash(password),
      })
      console.log(`  ✓ ${email} — identifiants Better Auth rattachés au compte existant.`)
      linked += 1
    }

    await users.updateOne(
      { _id: new ObjectId(String(existing.user.id)) },
      { $set: { role: 'super-admin', active: true, suspended: false } },
    )
  }

  console.log('──────────────────────────────────────────')
  console.log(`${created} créé(s), ${linked} rattaché(s), ${unchanged} inchangé(s).`)
  console.log('Connexion : /connexion — administration : /admin — CMS : /cms\n')

  process.exit(0)
}

await run()
