/**
 * Création des comptes super-administrateurs.
 *
 * Aucun mot de passe n'est écrit dans le dépôt : il est demandé en saisie
 * masquée, ou lu depuis `BOOTSTRAP_ADMIN_PASSWORD` pour un déploiement
 * automatisé. Le script est idempotent — un compte déjà présent n'est jamais
 * écrasé et son mot de passe n'est pas réinitialisé.
 *
 *   npm run payload:bootstrap-admin
 */
import { createInterface } from 'node:readline'
import { stdin, stdout } from 'node:process'

import config from '@payload-config'
import { getPayload } from 'payload'

type Candidate = { email: string; name: string; role: 'super-admin' }

const CANDIDATES: Candidate[] = [
  { email: 'jdvalcy02@gmail.com', name: 'Jacques-Daguerre Valcy', role: 'super-admin' },
  { email: 'synapsbranch@gmail.com', name: 'Administrateur technique', role: 'super-admin' },
]

const MIN_PASSWORD_LENGTH = 12

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
 * Comptes a traiter.
 * `BOOTSTRAP_ADMIN_EMAIL` permet de n'en viser qu'un seul, afin d'attribuer un
 * mot de passe distinct a chaque compte lors d'un amorcage non interactif.
 */
const resolveCandidates = (): Candidate[] => {
  const only = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase()
  if (!only) return CANDIDATES
  const known = CANDIDATES.find((candidate) => candidate.email.toLowerCase() === only)
  if (known) return [known]
  return [
    {
      email: only,
      name: process.env.BOOTSTRAP_ADMIN_NAME?.trim() || only,
      role: 'super-admin',
    },
  ]
}

const run = async (): Promise<void> => {
  const payload = await getPayload({ config })

  console.log('\nCréation des comptes super-administrateurs')
  console.log('──────────────────────────────────────────')

  let created = 0
  let skipped = 0

  for (const candidate of resolveCandidates()) {
    const existing = await payload.find({
      collection: 'users',
      where: { email: { equals: candidate.email } },
      limit: 1,
      overrideAccess: true,
    })

    if (existing.totalDocs > 0) {
      console.log(`  • ${candidate.email} — déjà présent, aucune modification.`)
      skipped += 1
      continue
    }

    const password = await resolvePassword(candidate.email)

    await payload.create({
      collection: 'users',
      data: {
        email: candidate.email,
        name: candidate.name,
        role: candidate.role,
        active: true,
        password,
      },
      overrideAccess: true,
      context: { disableRevalidate: true },
    })

    console.log(`  ✓ ${candidate.email} — compte super-administrateur créé.`)
    created += 1
  }

  console.log('──────────────────────────────────────────')
  console.log(`${created} compte(s) créé(s), ${skipped} inchangé(s).`)
  console.log('Connexion : /admin\n')

  process.exit(0)
}

await run()
