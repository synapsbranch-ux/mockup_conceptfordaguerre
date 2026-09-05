import { MongoClient } from 'mongodb'
import type { Db } from 'mongodb'

import { env } from '@/lib/env'

/**
 * Client MongoDB dédié à Better Auth.
 *
 * Better Auth écrit ses propres collections (`user`, `session`, `account`,
 * `verification`) dans la même base que Payload.
 *
 * Le client est construit de façon synchrone : le pilote MongoDB se connecte
 * paresseusement à la première opération, ce qui permet de fournir la base à la
 * configuration Better Auth sans `await`. Il est mémorisé sur `globalThis` pour
 * survivre au rechargement à chaud, sinon chaque édition ouvrirait un pool
 * de connexions supplémentaire.
 */

type AuthMongoCache = { client?: MongoClient; db?: Db }

const globalCache = globalThis as typeof globalThis & { __authMongo?: AuthMongoCache }

const cache: AuthMongoCache = (globalCache.__authMongo ??= {})

export const getAuthMongoClient = (): MongoClient =>
  (cache.client ??= new MongoClient(env.databaseURI))

/** Base déclarée dans l'URI : aucun nom codé en dur. */
export const getAuthDb = (): Db => (cache.db ??= getAuthMongoClient().db())
