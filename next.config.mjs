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
  // Payload et ses dépendances natives ne doivent pas être bundlées côté serveur.
  serverExternalPackages: ['mongoose', 'sharp'],
}

export default withPayload(nextConfig, { devBundleServerPackages: false })
