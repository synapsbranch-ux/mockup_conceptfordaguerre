import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { mongooseAdapter } from '@payloadcms/db-mongodb'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { fr } from '@payloadcms/translations/languages/fr'
import { buildConfig } from 'payload'
import sharp from 'sharp'

import { env, trustedOrigins } from '@/lib/env'

import {
  Appointments,
  ArticleComments,
  ArticleFavorites,
  Articles,
  AuditLog,
  AvailabilityExceptions,
  AvailabilityRules,
  ClientProjects,
  Commitments,
  ContactSubmissions,
  Conversations,
  Documents,
  DownloadEvents,
  ForumCategories,
  ForumReactions,
  ForumReplies,
  ForumReports,
  ForumSubscriptions,
  ForumTopics,
  InternalNotes,
  Invoices,
  Media,
  MeetingTypes,
  Messages,
  NewsletterSubscribers,
  Notifications,
  Pages,
  Payments,
  Projects,
  Proposals,
  QuoteRequests,
  Services,
  Users,
} from './payload/collections'
import {
  BillingSettings,
  ClientSpaceSettings,
  CommunitySettings,
  Footer,
  Header,
  SiteSettings,
} from './payload/globals'
import { mediaStoragePlugin } from './payload/storage'

const dirname = path.dirname(fileURLToPath(import.meta.url))

/** Taille maximale acceptée à l'upload : 8 Mo. */
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024

export default buildConfig({
  serverURL: env.serverURL,

  /**
   * Le panneau CMS vit sur `/cms`. `/admin` est desormais le tableau de bord
   * d'administration du site, construit sur shadcn/ui, qui pointe vers `/cms`
   * pour l'edition des pages et des blocs.
   */
  routes: { admin: '/cms' },
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
    // Contenu editorial
    Pages,
    Projects,
    Articles,
    Services,
    Commitments,
    Media,
    // Communaute
    ArticleComments,
    ArticleFavorites,
    ForumCategories,
    ForumTopics,
    ForumReplies,
    ForumReactions,
    ForumSubscriptions,
    ForumReports,
    // Commercial
    QuoteRequests,
    Proposals,
    ClientProjects,
    Invoices,
    Payments,
    // Rendez-vous
    MeetingTypes,
    AvailabilityRules,
    AvailabilityExceptions,
    Appointments,
    // Relation client
    Documents,
    DownloadEvents,
    Conversations,
    Messages,
    InternalNotes,
    ContactSubmissions,
    NewsletterSubscribers,
    Notifications,
    // Systeme
    Users,
    AuditLog,
  ],

  globals: [SiteSettings, Header, Footer, CommunitySettings, ClientSpaceSettings, BillingSettings],

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
