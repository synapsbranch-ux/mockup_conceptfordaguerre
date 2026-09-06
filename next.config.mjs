import { withPayload } from '@payloadcms/next/withPayload'

/**
 * Les binaires média sont servis depuis la même origine en mode GridFS
 * (`/api/media/file/...`), donc aucun `remotePatterns` n'est requis.
 * En mode S3, l'hôte du endpoint est autorisé dynamiquement ci-dessous.
 */
const s3Host = (() => {
  if (process.env.MEDIA_STORAGE_DRIVER !== 's3') return null
  const raw = process.env.S3_ENDPOINT
  if (!raw) return null
  try {
    return new URL(raw.startsWith('http') ? raw : `https://${raw}`).hostname
  } catch {
    return null
  }
})()

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Pas de génération automatique d'AGENTS.md / CLAUDE.md dans le dépôt.
  agentRules: false,
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: s3Host
      ? [{ protocol: 'https', hostname: s3Host }, { protocol: 'https', hostname: `*.${s3Host}` }]
      : [],
  },
  /**
   * Le panneau Payload a été déplacé de `/admin` vers `/cms`, `/admin` étant
   * désormais le tableau de bord d'administration du site.
   *
   * Seuls les chemins profonds hérités sont redirigés : `/admin` lui-même ne
   * peut pas l'être, sinon le nouveau tableau de bord serait inatteignable.
   */
  async redirects() {
    const legacy = ['collections', 'globals', 'login', 'logout', 'account', 'forgot', 'reset', 'unauthorized', 'create-first-user', 'browse-by-folder']

    return [
      ...legacy.map((segment) => ({
        source: `/admin/${segment}/:path*`,
        destination: `/cms/${segment}/:path*`,
        permanent: false,
      })),

      /**
       * `/space` était la maquette d'espace utilisateur, antérieure au portail.
       * Le bouton « Espace » de l'en-tête, administré depuis le CMS, y pointe
       * toujours : le rediriger ici évite d'avoir à modifier le contenu du
       * client, et fait aboutir le lien sur le véritable espace.
       *
       * Une personne non connectée est ensuite orientée par `proxy.ts` vers
       * `/connexion?next=/espace-client`, donc le parcours se termine bien sur
       * la connexion ou la création de compte.
       *
       * Redirection temporaire : la page pourra reprendre un autre rôle.
       */
      { source: '/space', destination: '/espace-client', permanent: false },
      { source: '/en/space', destination: '/espace-client', permanent: false },
    ]
  },

  // Payload et ses dépendances natives ne doivent pas être bundlées côté serveur.
  // `pdfkit` charge ses metriques de police (.afm) depuis le disque a
  // l'execution : bundle par Next, il ne les retrouverait plus.
  // `mongodb` est le pilote de l'adaptateur Better Auth, au meme titre que
  // `mongoose` l'est pour Payload. Non declare externe, il est bundle : le
  // module d'authentification echoue alors a se charger en production, et
  // `/api/auth/*` retombe sur le catch-all Payload qui repond 404.
  serverExternalPackages: ['mongoose', 'mongodb', 'sharp', 'pdfkit'],
}

export default withPayload(nextConfig, { devBundleServerPackages: false })
