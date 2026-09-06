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
      collections: {
        media: true,
        // Les documents prives passent par le meme pilote, mais leur acces
        // reste filtre par le controle d'acces Payload : aucune URL publique
        // permanente n'est generee pour eux.
        documents: true,
      },
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
      /**
       * Documents prives.
       *
       * `disablePayloadAccessControl` reste NON active : Payload applique donc
       * la regle `read` de la collection a chaque requete de fichier. Un
       * document reserve a d'autres clients renvoie 404 meme si son nom de
       * fichier est devine.
       *
       * Le telechargement passe malgre tout par
       * `/api/documents/[id]/telecharger`, qui ajoute l'en-tete de piece
       * jointe et consigne l'historique.
       */
      documents: {
        adapter: gridfsAdapter(),
        disableLocalStorage: true,
      },
    },
  })
}
