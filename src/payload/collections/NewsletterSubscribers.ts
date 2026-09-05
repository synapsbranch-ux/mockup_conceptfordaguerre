import type { CollectionConfig } from 'payload'

import { authenticated, superAdminOnly } from '../access'

/**
 * Abonnés à l'infolettre.
 *
 * L'unicité de l'adresse est garantie par un index unique en base : une
 * seconde inscription avec la même adresse ne crée jamais de doublon, elle
 * réactive l'enregistrement existant (voir `/api/newsletter`).
 */
export const NewsletterSubscribers: CollectionConfig = {
  slug: 'newsletterSubscribers',
  labels: { singular: 'Abonné', plural: 'Abonnés à l’infolettre' },
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'name', 'status', 'source', 'subscribedAt'],
    group: 'Formulaires',
    description: 'Liste privée des inscriptions à l’infolettre.',
    listSearchableFields: ['email', 'name'],
  },
  defaultSort: '-subscribedAt',
  access: {
    read: authenticated,
    create: authenticated,
    update: authenticated,
    delete: superAdminOnly,
  },
  hooks: {
    beforeChange: [
      ({ data, originalDoc }) => {
        const next = { ...data }
        if (typeof next.email === 'string') next.email = next.email.trim().toLowerCase()
        if (next.status === 'unsubscribed' && !next.unsubscribedAt) {
          next.unsubscribedAt = new Date().toISOString()
        }
        if (next.status === 'active' && originalDoc?.status === 'unsubscribed') {
          next.unsubscribedAt = null
        }
        return next
      },
    ],
  },
  fields: [
    {
      name: 'email',
      type: 'email',
      label: 'Adresse courriel',
      required: true,
      unique: true,
      index: true,
    },
    { name: 'name', type: 'text', label: 'Nom', maxLength: 160 },
    {
      name: 'status',
      type: 'select',
      label: 'Statut',
      required: true,
      defaultValue: 'active',
      options: [
        { label: 'Actif', value: 'active' },
        { label: 'Désabonné', value: 'unsubscribed' },
        { label: 'En attente de confirmation', value: 'pending' },
        { label: 'Adresse en échec', value: 'bounced' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'source',
      type: 'text',
      label: 'Origine de l’inscription',
      maxLength: 60,
      admin: { position: 'sidebar', description: 'Ex. « pied-de-page », « blog ».' },
    },
    {
      name: 'consent',
      type: 'checkbox',
      label: 'Consentement recueilli',
      required: true,
      defaultValue: true,
      admin: { position: 'sidebar' },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'subscribedAt',
          type: 'date',
          label: 'Inscrit le',
          admin: {
            width: '50%',
            date: { pickerAppearance: 'dayAndTime', displayFormat: 'd MMM yyyy, HH:mm' },
          },
        },
        {
          name: 'unsubscribedAt',
          type: 'date',
          label: 'Désabonné le',
          admin: {
            width: '50%',
            date: { pickerAppearance: 'dayAndTime', displayFormat: 'd MMM yyyy, HH:mm' },
          },
        },
      ],
    },
    {
      name: 'notes',
      type: 'textarea',
      label: 'Notes internes',
      maxLength: 1000,
    },
  ],
  timestamps: true,
}
