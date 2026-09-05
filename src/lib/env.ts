/**
 * Lecture et validation centralisées des variables d'environnement.
 * Ce module est strictement serveur : ne jamais l'importer depuis un composant client.
 */

const read = (name: string, fallbacks: string[] = []): string | undefined => {
  const candidates = [name, ...fallbacks]
  for (const key of candidates) {
    const value = process.env[key]
    if (value && value.trim() !== '') return value.trim()
  }
  return undefined
}

const require_ = (name: string, fallbacks: string[] = []): string => {
  const value = read(name, fallbacks)
  if (!value) {
    throw new Error(
      `Variable d'environnement manquante : ${name}. Copier .env.example en .env et la renseigner.`,
    )
  }
  return value
}

export type MediaStorageDriver = 'gridfs' | 's3'

const parseDriver = (): MediaStorageDriver => {
  const raw = (read('MEDIA_STORAGE_DRIVER') ?? 'gridfs').toLowerCase()
  if (raw !== 'gridfs' && raw !== 's3') {
    throw new Error(
      `MEDIA_STORAGE_DRIVER invalide : « ${raw} ». Valeurs acceptées : "gridfs" ou "s3".`,
    )
  }
  return raw
}

const mediaDriver = parseDriver()

const s3 =
  mediaDriver === 's3'
    ? {
        bucket: require_('S3_BUCKET'),
        region: read('S3_REGION') ?? 'auto',
        endpoint: read('S3_ENDPOINT'),
        accessKeyId: require_('S3_ACCESS_KEY_ID'),
        secretAccessKey: require_('S3_SECRET_ACCESS_KEY'),
        forcePathStyle: (read('S3_FORCE_PATH_STYLE') ?? 'false').toLowerCase() === 'true',
      }
    : null

/** Retire un éventuel slash final pour éviter les doubles slashs dans les URLs canoniques. */
const normalizeURL = (value: string): string => value.replace(/\/+$/, '')

export const env = {
  /** URI MongoDB complète. `MONGODB_URI` est accepté en repli pour compatibilité. */
  databaseURI: require_('DATABASE_URI', ['MONGODB_URI']),
  payloadSecret: require_('PAYLOAD_SECRET'),
  previewSecret: require_('PREVIEW_SECRET'),
  serverURL: normalizeURL(require_('NEXT_PUBLIC_SERVER_URL', ['NEXT_PUBLIC_SITE_URL'])),
  mediaDriver,
  s3,
  redisURL: read('REDIS_URL'),
  isProduction: process.env.NODE_ENV === 'production',
} as const

/**
 * Origines autorisées pour CORS et CSRF.
 * Volontairement restreint : seule l'origine publique déclarée est acceptée.
 */
export const trustedOrigins = Array.from(
  new Set([env.serverURL, normalizeURL(read('NEXT_PUBLIC_SITE_URL') ?? env.serverURL)]),
)
