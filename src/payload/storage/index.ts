import { cloudStoragePlugin } from '@payloadcms/plugin-cloud-storage'
import { s3Storage } from '@payloadcms/storage-s3'
import type { Plugin } from 'payload'

import { env } from '@/lib/env'

import { gridfsAdapter } from './gridfsAdapter'

/**
 * Sélectionne le pilote de stockage média selon `MEDIA_STORAGE_DRIVER`.
 *
 * Le système de fichiers local n'est jamais utilisé comme stockage permanent :
 * `disableLocalStorage` est actif dans les deux modes.
 */
export const mediaStoragePlugin = (): Plugin => {
  if (env.mediaDriver === 's3') {
    const { s3 } = env
    if (!s3) {
      throw new Error('MEDIA_STORAGE_DRIVER=s3 mais la configuration S3 est incomplète.')
    }

    return s3Storage({
      collections: { media: true },
      bucket: s3.bucket,
      config: {
        region: s3.region,
        ...(s3.endpoint ? { endpoint: s3.endpoint } : {}),
        forcePathStyle: s3.forcePathStyle,
        credentials: {
          accessKeyId: s3.accessKeyId,
          secretAccessKey: s3.secretAccessKey,
        },
      },
    })
  }

  return cloudStoragePlugin({
    collections: {
      media: {
        adapter: gridfsAdapter(),
        disableLocalStorage: true,
      },
    },
  })
}
