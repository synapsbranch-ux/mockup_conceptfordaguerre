import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { mongooseAdapter } from '@payloadcms/db-mongodb'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { fr } from '@payloadcms/translations/languages/fr'
import { buildConfig } from 'payload'
import sharp from 'sharp'

import { env, trustedOrigins } from '@/lib/env'

import {
  Articles,
  Commitments,
  ContactSubmissions,
  Media,
  NewsletterSubscribers,
  Pages,
  Projects,
  Services,
  Users,
} from './payload/collections'
import { Footer, Header, SiteSettings } from './payload/globals'
import { mediaStoragePlugin } from './payload/storage'

const dirname = path.dirname(fileURLToPath(import.meta.url))

/** Taille maximale acceptée à l'upload : 8 Mo. */
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024

export default buildConfig({
  serverURL: env.serverURL,
  secret: env.payloadSecret,

  admin: {
    user: Users.slug,
    importMap: { baseDir: path.resolve(dirname) },
    meta: {
      titleSuffix: ' — Administration Jacques-Daguerre Valcy',
      description: 'Panneau d’administration du portfolio et de l’offre Datakle.',
    },
    dateFormat: 'd MMMM yyyy, HH:mm',
    // `all` laisse l'utilisateur choisir entre clair, sombre et systeme.
    theme: 'all',
    components: {
      graphics: {
        Logo: '@/payload/components/BrandLogo#BrandLogo',
        Icon: '@/payload/components/BrandLogo#BrandIcon',
      },
    },
  },

  // Interface, libellés de collections et messages de validation en français.
  i18n: {
    supportedLanguages: { fr },
    fallbackLanguage: 'fr',
  },

  collections: [
    Pages,
    Projects,
    Articles,
    Services,
    Commitments,
    Media,
    ContactSubmissions,
    NewsletterSubscribers,
    Users,
  ],

  globals: [SiteSettings, Header, Footer],

  db: mongooseAdapter({
    url: env.databaseURI,
    // L'instance MongoDB de production est en mode autonome (pas de replica set),
    // configuration qui ne supporte pas les transactions. Les scripts de seed
    // sont donc écrits pour être rejouables plutôt que transactionnels.
    transactionOptions: false,
    ensureIndexes: true,
  }),

  editor: lexicalEditor(),

  sharp,

  upload: {
    limits: { fileSize: MAX_UPLOAD_BYTES },
    abortOnLimit: true,
  },

  // Origines strictement limitées à l'URL publique déclarée.
  cors: trustedOrigins,
  csrf: trustedOrigins,

  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },

  graphQL: {
    disablePlaygroundInProduction: true,
  },

  plugins: [mediaStoragePlugin()],
})
