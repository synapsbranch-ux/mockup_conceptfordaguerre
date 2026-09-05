import 'server-only'

import { createHash } from 'node:crypto'

import type Redis from 'ioredis'

import { env } from './env'

/**
 * Limitation de debit des points d'entree publics.
 *
 * Redis quand `REDIS_URL` est defini — le compteur est alors partage entre
 * toutes les instances. Sinon, repli en memoire, valable pour une seule
 * instance et signale comme tel dans la synthese securite.
 *
 * L'adresse IP n'est jamais stockee en clair : la cle est un condensat.
 */

let redisClient: Redis | null = null
let redisUnavailable = false

const getRedis = async (): Promise<Redis | null> => {
  if (!env.redisURL || redisUnavailable) return null
  if (redisClient) return redisClient
  try {
    const { default: RedisClient } = await import('ioredis')
    redisClient = new RedisClient(env.redisURL, {
      maxRetriesPerRequest: 1,
      connectTimeout: 3000,
      lazyConnect: true,
      enableOfflineQueue: false,
    })
    redisClient.on('error', () => {
      redisUnavailable = true
    })
    await redisClient.connect()
    return redisClient
  } catch {
    redisUnavailable = true
    return null
  }
}

/** Compteurs en memoire, utilises seulement si Redis est indisponible. */
const memory = new Map<string, { count: number; resetAt: number }>()

const memoryHit = (key: string, limit: number, windowSeconds: number) => {
  const now = Date.now()
  const entry = memory.get(key)
  if (!entry || entry.resetAt <= now) {
    memory.set(key, { count: 1, resetAt: now + windowSeconds * 1000 })
    return { allowed: true, remaining: limit - 1 }
  }
  entry.count += 1
  // Purge opportuniste : evite que la table grossisse indefiniment.
  if (memory.size > 5000) {
    for (const [existingKey, value] of memory) {
      if (value.resetAt <= now) memory.delete(existingKey)
    }
  }
  return { allowed: entry.count <= limit, remaining: Math.max(0, limit - entry.count) }
}

export type RateLimitResult = { allowed: boolean; remaining: number }

export const checkRateLimit = async (
  scope: string,
  identifier: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> => {
  const key = `rl:${scope}:${createHash('sha256').update(identifier).digest('hex').slice(0, 32)}`

  const redis = await getRedis()
  if (!redis) return memoryHit(key, limit, windowSeconds)

  try {
    const count = await redis.incr(key)
    if (count === 1) await redis.expire(key, windowSeconds)
    return { allowed: count <= limit, remaining: Math.max(0, limit - count) }
  } catch {
    redisUnavailable = true
    return memoryHit(key, limit, windowSeconds)
  }
}

/**
 * Identifiant d'appelant deduit des en-tetes de proxy.
 * Sert uniquement au comptage : il n'est ni journalise ni conserve.
 */
export const callerIdentifier = (request: Request): string => {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return request.headers.get('x-real-ip') ?? 'inconnu'
}
