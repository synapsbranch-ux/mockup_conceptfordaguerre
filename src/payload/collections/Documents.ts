import type { CollectionConfig, Where } from 'payload'

import { authenticated, isCMSUser } from '../access'
import { serverWriteOnly, staffWriteOnly } from '../access/ownership'

/**
 * Documents et ressources — distincts de `media`.
 *
 * `media` sert le site public : ses binaires sont servis en cache immuable par
 * une URL stable. Ces documents-ci sont **privés** : leur binaire ne doit jamais
 * être joignable par une URL permanente devinable. La collection est donc
 * `disableLocalStorage: false` mais l'accès passe systématiquement par
 * `/api/documents/[id]/telecharger`, qui revérifie l'autorisation à chaque
 * requête.
 *
 * Visibilités :
 *  - `public`     : ressource librement téléchargeable (guides, modèles).
 *  - `authenticated` : réservée aux comptes connectés.
 *  - `assigned`   : réservée aux clients explicitement désignés.
 */
export const DOCUMENT_VISIBILITIES = [
  { label: 'Publique', value: 'public' },
  { label: 'Comptes connectés', value: 'authenticated' },
  { label: 'Clients désignés', value: 'assigned' },
] as const

export const DOCUMENT_CATEGORIES = [
  { label: 'Guide', value: 'guide' },
  { label: 'Modèle', value: 'template' },
  { label: 'Rapport', value: 'report' },
  { label: 'Contrat', value: 'contract' },
  { label: 'Livrable', value: 'deliverable' },
  { label: 'Facture', value: 'invoice' },
  { label: 'Autre', value: 'other' },
] as const

/** 25 Mo : au-delà, le transfert passe par un autre canal. */
const MAX_DOCUMENT_BYTES = 25 * 1024 * 1024

export const Documents: CollectionConfig = {
  slug: 'documents',
  labels: { singular: 'Document', plural: 'Documents et ressources' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'category', 'visibility', 'archived', 'updatedAt'],
    group: 'Relation client',
    description:
      'Ressources publiques et documents privés. Le téléchargement d’un document privé est autorisé requête par requête.',
  },
  upload: {
    // Binaires stockés via l'adaptateur configuré (GridFS par défaut).
    disableLocalStorage: true,
    mimeTypes: [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/msword',
      'application/vnd.ms-excel',
      'text/csv',
      'text/plain',
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/zip',
    ],
  },
  defaultSort: '-createdAt',
  access: {
    /**
     * Lecture des MÉTADONNÉES.
     *
     * Le binaire, lui, n'est jamais servi par cette règle : il passe par la
     * route de téléchargement, qui refait la vérification. Un document non
     * autorisé est invisible, y compris par lecture directe sur son
     * identifiant — pas d'énumération possible.
     */
    read: ({ req: { user } }) => {
      if (isCMSUser(user)) return true

      if (!user) {
        const anonymous: Where = {
          and: [{ visibility: { equals: 'public' } }, { archived: { not_equals: true } }],
        }
        return anonymous
      }

      const signedIn: Where = {
        and: [
          { archived: { not_equals: true } },
          {
            or: [
              { visibility: { equals: 'public' } },
              { visibility: { equals: 'authenticated' } },
              {
                and: [
                  { visibility: { equals: 'assigned' } },
                  { assignedTo: { contains: user.id } },
                ],
              },
            ],
          },
        ],
      }
      return signedIn
    },
    create: authenticated,
    update: authenticated,
    delete: authenticated,
  },
  indexes: [
    { fields: ['visibility', 'archived', 'createdAt'] },
    { fields: ['category', 'visibility'] },
  ],
  fields: [
    {
      name: 'title',
      type: 'text',
      label: 'Titre',
      required: true,
      maxLength: 200,
    },
    {
      name: 'description',
      type: 'textarea',
      label: 'Description',
      maxLength: 600,
    },
    {
      name: 'category',
      type: 'select',
      label: 'Catégorie',
      required: true,
      defaultValue: 'other',
      index: true,
      options: [...DOCUMENT_CATEGORIES],
    },
    {
      name: 'visibility',
      type: 'select',
      label: 'Visibilité',
      required: true,
      defaultValue: 'assigned',
      index: true,
      options: [...DOCUMENT_VISIBILITIES],
      access: { create: staffWriteOnly, update: staffWriteOnly },
      admin: {
        position: 'sidebar',
        description:
          'Par défaut « clients désignés » : un document ne devient jamais public par inadvertance.',
      },
    },
    {
      name: 'assignedTo',
      type: 'relationship',
      relationTo: 'users',
      hasMany: true,
      label: 'Clients autorisés',
      index: true,
      access: { create: staffWriteOnly, update: staffWriteOnly },
      admin: {
        position: 'sidebar',
        condition: (data) => data?.visibility === 'assigned',
      },
    },
    {
      name: 'archived',
      type: 'checkbox',
      label: 'Archivé',
      defaultValue: false,
      index: true,
      access: { create: staffWriteOnly, update: staffWriteOnly },
      admin: { position: 'sidebar' },
    },
    {
      name: 'downloadCount',
      type: 'number',
      label: 'Téléchargements',
      defaultValue: 0,
      min: 0,
      access: { create: serverWriteOnly, update: serverWriteOnly },
      admin: { position: 'sidebar', readOnly: true },
    },
    {
      name: 'internalNote',
      type: 'textarea',
      label: 'Note interne',
      maxLength: 1000,
      // Jamais lisible par un client, même sur un document qui lui est assigné.
      access: { create: staffWriteOnly, update: staffWriteOnly, read: staffWriteOnly },
      admin: { description: 'Interne. N’apparaît jamais dans l’espace client.' },
    },
  ],
  hooks: {
    beforeValidate: [
      ({ data, req }) => {
        const size = req.file?.size
        if (typeof size === 'number' && size > MAX_DOCUMENT_BYTES) {
          throw new Error(
            `Le fichier dépasse la taille maximale autorisée (${Math.round(MAX_DOCUMENT_BYTES / 1024 / 1024)} Mo).`,
          )
        }
        return data
      },
    ],
  },
  timestamps: true,
}
