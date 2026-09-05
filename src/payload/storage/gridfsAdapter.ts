import { createReadStream } from 'node:fs'
import { Readable } from 'node:stream'

import type { Adapter, GeneratedAdapter } from '@payloadcms/plugin-cloud-storage/types'
import mongoose from 'mongoose'
import type { Payload } from 'payload'

const { GridFSBucket } = mongoose.mongo

type Bucket = InstanceType<typeof GridFSBucket>

/** Nom du bucket GridFS. Produit les collections `media.files` et `media.chunks`. */
const BUCKET_NAME = 'media'

/** Taille de chunk GridFS (255 Kio, valeur par défaut du pilote). */
const CHUNK_SIZE = 255 * 1024

type DatabaseWithConnection = { connection?: mongoose.Connection }

const getBucket = (payload: Payload): Bucket => {
  const { connection } = payload.db as unknown as DatabaseWithConnection
  if (!connection?.db) {
    throw new Error(
      'Connexion MongoDB indisponible : le stockage GridFS ne peut pas être initialisé.',
    )
  }
  return new GridFSBucket(connection.db, { bucketName: BUCKET_NAME, chunkSizeBytes: CHUNK_SIZE })
}

const findFile = async (bucket: Bucket, filename: string) => {
  const [file] = await bucket.find({ filename }, { limit: 1 }).toArray()
  return file ?? null
}

/**
 * Supprime un fichier GridFS en tolérant qu'il ait déjà disparu.
 *
 * Payload appelle `handleDelete` une fois par déclinaison. Comme deux
 * déclinaisons peuvent partager un nom de fichier (voir `pruneOlderRevisions`),
 * deux suppressions concurrentes visent alors le même binaire : la seconde
 * lèverait « File not found » alors que le résultat recherché — le fichier
 * n'existe plus — est bien atteint.
 */
const deleteQuietly = async (bucket: Bucket, id: mongoose.Types.ObjectId): Promise<boolean> => {
  try {
    await bucket.delete(id)
    return true
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (message.includes('File not found')) return false
    throw error
  }
}

/** Supprime toutes les révisions portant ce nom de fichier, chunks compris. */
const deleteByFilename = async (bucket: Bucket, filename: string): Promise<number> => {
  const files = await bucket.find({ filename }).toArray()
  const results = await Promise.all(files.map((file) => deleteQuietly(bucket, file._id)))
  return results.filter(Boolean).length
}

/**
 * Ne conserve que la révision la plus récente d'un nom de fichier.
 *
 * Payload téléverse l'original et toutes ses déclinaisons en parallèle. Or
 * `withoutEnlargement` fait que deux tailles cibles différentes produisent le
 * même nom lorsque l'image source est plus petite que les deux (un portrait de
 * 1000 px large donne le même `-1000x1500.webp` pour `content` et `hero`).
 * Un « supprimer puis écrire » se court-circuiterait entre ces écritures
 * concurrentes : on élague donc après coup, en gardant l'`_id` le plus élevé.
 * Le critère est déterministe, donc stable quel que soit l'ordre d'arrivée.
 */
const pruneOlderRevisions = async (bucket: Bucket, filename: string): Promise<number> => {
  const files = await bucket.find({ filename }).toArray()
  if (files.length <= 1) return 0
  const newest = files.reduce((a, b) => (String(a._id) > String(b._id) ? a : b))
  const stale = files.filter((file) => !file._id.equals(newest._id))
  const results = await Promise.all(stale.map((file) => deleteQuietly(bucket, file._id)))
  return results.filter(Boolean).length
}

const pipeToBucket = (bucket: Bucket, filename: string, source: Readable, options: {
  contentType: string
  metadata: Record<string, unknown>
}): Promise<void> =>
  new Promise((resolve, reject) => {
    const upload = bucket.openUploadStream(filename, {
      contentType: options.contentType,
      metadata: options.metadata,
    })
    source.on('error', reject)
    upload.on('error', reject)
    upload.on('finish', () => resolve())
    source.pipe(upload)
  })

const quoteETag = (value: string): string => `"${value}"`

/**
 * Adaptateur de stockage MongoDB GridFS pour `@payloadcms/plugin-cloud-storage`.
 *
 * Les binaires — original comme déclinaisons générées — sont écrits en flux
 * dans GridFS, jamais encodés en base64 ni stockés dans le document Payload.
 * MongoDB ne conserve dans `media` que les métadonnées et les relations.
 *
 * Le contrôle d'accès Payload reste actif : les fichiers sont servis par
 * `/api/media/file/<filename>`, ce qui les rend directement consommables par
 * `next/image` sans configuration d'hôte distant.
 */
export const gridfsAdapter = (): Adapter => {
  return ({ collection, prefix }): GeneratedAdapter => ({
    name: 'mongodb-gridfs',

    handleUpload: async ({ data, file, req }) => {
      const bucket = getBucket(req.payload)

      const source = file.tempFilePath
        ? createReadStream(file.tempFilePath)
        : Readable.from(file.buffer)

      await pipeToBucket(bucket, file.filename, source, {
        contentType: file.mimeType,
        metadata: {
          payloadCollection: collection.slug,
          prefix: prefix ?? data?.prefix ?? null,
          uploadedAt: new Date().toISOString(),
        },
      })

      // Remplacement idempotent : un renvoi du même nom ne laisse jamais
      // deux binaires derrière lui.
      await pruneOlderRevisions(bucket, file.filename)
    },

    handleDelete: async ({ filename, req }) => {
      const bucket = getBucket(req.payload)
      await deleteByFilename(bucket, filename)
    },

    generateURL: ({ filename }) => `/api/${collection.slug}/file/${encodeURIComponent(filename)}`,

    staticHandler: async (req, { params: { filename } }) => {
      const bucket = getBucket(req.payload)
      const file = await findFile(bucket, filename)

      if (!file) {
        return new Response('Fichier introuvable', { status: 404 })
      }

      const etag = quoteETag(String(file._id))
      const lastModified = file.uploadDate?.toUTCString()
      const contentType = file.contentType ?? 'application/octet-stream'

      const baseHeaders: Record<string, string> = {
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Content-Type': contentType,
        ETag: etag,
      }
      if (lastModified) baseHeaders['Last-Modified'] = lastModified

      // Revalidation conditionnelle : évite de retransmettre un binaire inchangé.
      if (req.headers.get('if-none-match') === etag) {
        return new Response(null, { status: 304, headers: baseHeaders })
      }

      const rangeHeader = req.headers.get('range')
      if (rangeHeader) {
        const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim())
        if (match) {
          const [, rawStart, rawEnd] = match
          const start = rawStart === '' ? Math.max(file.length - Number(rawEnd), 0) : Number(rawStart)
          const end = rawStart === '' || rawEnd === '' ? file.length - 1 : Number(rawEnd)

          if (Number.isNaN(start) || Number.isNaN(end) || start > end || start >= file.length) {
            return new Response('Plage demandée invalide', {
              status: 416,
              headers: { 'Content-Range': `bytes */${file.length}` },
            })
          }

          const clampedEnd = Math.min(end, file.length - 1)
          const stream = bucket.openDownloadStream(file._id, { start, end: clampedEnd + 1 })
          return new Response(Readable.toWeb(stream) as ReadableStream, {
            status: 206,
            headers: {
              ...baseHeaders,
              'Content-Length': String(clampedEnd - start + 1),
              'Content-Range': `bytes ${start}-${clampedEnd}/${file.length}`,
            },
          })
        }
      }

      const stream = bucket.openDownloadStream(file._id)
      return new Response(Readable.toWeb(stream) as ReadableStream, {
        status: 200,
        headers: { ...baseHeaders, 'Content-Length': String(file.length) },
      })
    },
  })
}

/** Exposé pour les tests et les scripts de vérification de migration. */
export const gridfsInternals = {
  BUCKET_NAME,
  getBucket,
  deleteByFilename,
  pruneOlderRevisions,
  findFile,
}
