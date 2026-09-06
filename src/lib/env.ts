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

/**
 * Normalise et valide une origine publique : protocole obligatoire, hôte seul,
 * sans chemin ni slash final — afin d'éviter les doubles slashs dans les URLs
 * canoniques.
 *
 * La validation n'est pas cosmétique. Un schéma dupliqué
 * (`https://https://exemple.fr`) reste accepté par `new URL()` : l'hôte devient
 * « https » et le vrai domaine se retrouve dans le *chemin*. Le site continue
 * alors de répondre, mais Better Auth déduit son `basePath` du chemin de
 * `baseURL` : plus rien ne correspond à `/api/auth/*`, qui répond 404 avec un
 * corps vide — connexion et inscription deviennent impossibles sans la moindre
 * trace dans les journaux. L'échec doit donc survenir au démarrage, avec un
 * message explicite, plutôt que se transformer en panne silencieuse.
 */
export const normalizePublicOrigin = (value: string, name: string): string => {
  const invalid = (reason: string): never => {
    throw new Error(
      `Variable d'environnement invalide : ${name} = « ${value} » — ${reason}. ` +
        'Attendu : une origine seule, par exemple https://exemple.fr',
    )
  }

  let url: URL
  try {
    url = new URL(value)
  } catch {
    return invalid("ce n'est pas une URL absolue")
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return invalid('le protocole doit être http:// ou https://')
  }

  // Attrape le schéma dupliqué, dont le domaine réel atterrit dans le chemin.
  if (url.pathname.replace(/\/+$/, '') !== '') {
    return invalid("une origine ne comporte pas de chemin (schéma dupliqué ?)")
  }

  if (url.search !== '' || url.hash !== '') {
    return invalid('une origine ne comporte ni paramètres ni ancre')
  }

  return url.origin
}

/**
 * Fournisseur Google.
 * Optionnel au démarrage : sans identifiants, le bouton « Continuer avec Google »
 * est masqué plutôt que de faire échouer le rendu de tout le site. La connexion
 * par courriel reste disponible.
 */
const googleClientId = read('GOOGLE_CLIENT_ID')
const googleClientSecret = read('GOOGLE_CLIENT_SECRET')
const google =
  googleClientId && googleClientSecret
    ? { clientId: googleClientId, clientSecret: googleClientSecret }
    : null

/** Envoi de courriels transactionnels. Absent : les envois sont signalés comme non effectués. */
const resendApiKey = read('RESEND_API_KEY')

export const env = {
  /** URI MongoDB complète. `MONGODB_URI` est accepté en repli pour compatibilité. */
  databaseURI: require_('DATABASE_URI', ['MONGODB_URI']),
  payloadSecret: require_('PAYLOAD_SECRET'),
  previewSecret: require_('PREVIEW_SECRET'),
  serverURL: normalizePublicOrigin(
    require_('NEXT_PUBLIC_SERVER_URL', ['NEXT_PUBLIC_SITE_URL']),
    'NEXT_PUBLIC_SERVER_URL',
  ),
  mediaDriver,
  s3,
  redisURL: read('REDIS_URL'),
  isProduction: process.env.NODE_ENV === 'production',

  /** Clé de signature des sessions Better Auth. Distincte de `PAYLOAD_SECRET`. */
  authSecret: require_('BETTER_AUTH_SECRET'),
  google,
  resend: resendApiKey
    ? {
        apiKey: resendApiKey,
        from: read('RESEND_FROM_EMAIL') ?? 'onboarding@resend.dev',
        replyTo: read('RESEND_REPLY_TO'),
      }
    : null,
} as const

/**
 * Origines autorisées pour CORS et CSRF.
 * Volontairement restreint : seule l'origine publique déclarée est acceptée.
 */
export const trustedOrigins = Array.from(
  new Set([
    env.serverURL,
    normalizePublicOrigin(read('NEXT_PUBLIC_SITE_URL') ?? env.serverURL, 'NEXT_PUBLIC_SITE_URL'),
  ]),
)
