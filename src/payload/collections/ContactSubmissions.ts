import type { CollectionConfig } from 'payload'

import { authenticated, superAdminOnly } from '../access'

/**
 * Demandes reçues via le formulaire de contact.
 *
 * L'accès en création reste réservé aux membres du CMS : le formulaire public
 * ne passe pas par l'API REST mais par `/api/contact`, qui applique honeypot,
 * limitation de débit et assainissement avant d'écrire avec `overrideAccess`.
 * Un POST anonyme direct sur `/api/contactSubmissions` est donc refusé.
 *
 * Aucune adresse IP ni empreinte de navigateur n'est conservée : seules les
 * informations que la personne a volontairement saisies sont stockées.
 */
export const ContactSubmissions: CollectionConfig = {
  slug: 'contactSubmissions',
  labels: { singular: 'Demande de contact', plural: 'Demandes de contact' },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'email', 'subject', 'status', 'createdAt'],
    group: 'Formulaires',
    description:
      'Messages reçus via la page Contact. Contenu privé : jamais exposé publiquement.',
    listSearchableFields: ['name', 'email', 'organisation', 'subject'],
  },
  defaultSort: '-createdAt',
  access: {
    read: authenticated,
    create: authenticated,
    update: authenticated,
    delete: superAdminOnly,
  },
  fields: [
    {
      name: 'status',
      type: 'select',
      label: 'Statut',
      required: true,
      defaultValue: 'new',
      options: [
        { label: 'Nouvelle', value: 'new' },
        { label: 'En cours', value: 'in-progress' },
        { label: 'Répondue', value: 'answered' },
        { label: 'Archivée', value: 'archived' },
        { label: 'Indésirable', value: 'spam' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'name',
          type: 'text',
          label: 'Nom',
          required: true,
          maxLength: 160,
          admin: { readOnly: true, width: '50%' },
        },
        {
          name: 'email',
          type: 'email',
          label: 'Courriel',
          required: true,
          admin: { readOnly: true, width: '50%' },
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'organisation',
          type: 'text',
          label: 'Organisation',
          maxLength: 200,
          admin: { readOnly: true, width: '50%' },
        },
        {
          name: 'subject',
          type: 'text',
          label: 'Sujet',
          maxLength: 160,
          admin: { readOnly: true, width: '50%' },
        },
      ],
    },
    {
      name: 'message',
      type: 'textarea',
      label: 'Message',
      required: true,
      maxLength: 8000,
      admin: { readOnly: true, rows: 10 },
    },
    {
      name: 'consent',
      type: 'checkbox',
      label: 'Consentement au traitement de la demande',
      required: true,
      admin: { readOnly: true, position: 'sidebar' },
    },
    {
      name: 'submittedAt',
      type: 'date',
      label: 'Reçue le',
      admin: {
        readOnly: true,
        position: 'sidebar',
        date: { pickerAppearance: 'dayAndTime', displayFormat: 'd MMM yyyy, HH:mm' },
      },
    },
    {
      name: 'notes',
      type: 'textarea',
      label: 'Notes internes',
      maxLength: 2000,
      admin: { description: 'Visible uniquement dans le CMS.' },
    },
  ],
  timestamps: true,
}
