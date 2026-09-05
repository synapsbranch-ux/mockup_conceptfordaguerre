import type { CollectionConfig } from 'payload'

import { isCMSUser } from '../access'
import { ownerOrStaffRead, serverWriteOnly, staffWriteOnly } from '../access/ownership'

/**
 * Projets clients.
 *
 * À ne pas confondre avec la collection `projects`, qui porte les réalisations
 * publiques du portfolio et conserve ses URLs `/projects/[slug]`. Celle-ci est
 * privée : elle suit l'exécution d'une prestation pour un client donné.
 *
 * Un projet naît d'une proposition acceptée — conversion **unique**, garantie
 * par le champ `convertedProject` de la proposition et par l'unicité de
 * `sourceProposal` ici — ou d'une création manuelle par le personnel.
 */
export const ClientProjects: CollectionConfig = {
  slug: 'clientProjects',
  labels: { singular: 'Projet client', plural: 'Projets clients' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'customer', 'status', 'progress', 'endDate'],
    group: 'Commercial',
    description: 'Suivi d’exécution des prestations. Distinct des réalisations publiques.',
  },
  defaultSort: '-createdAt',
  access: {
    read: ownerOrStaffRead('customer'),
    create: ({ req: { user } }) => isCMSUser(user),
    update: ({ req: { user } }) => isCMSUser(user),
    delete: ({ req: { user } }) => isCMSUser(user),
  },
  indexes: [
    { fields: ['customer', 'status', 'createdAt'] },
    { fields: ['status', 'endDate'] },
    // L'unicite de `sourceProposal` — une proposition ne donne qu'un seul
    // projet — est posee par un index PARTIEL dans `npm run db:ensure-indexes`.
    // Le champ est nullable pour les projets crees manuellement, et un index
    // unique ordinaire les ferait tous entrer en collision sur null.
  ],
  fields: [
    {
      name: 'title',
      type: 'text',
      label: 'Intitulé',
      required: true,
      maxLength: 200,
      access: { create: staffWriteOnly, update: staffWriteOnly },
    },
    {
      name: 'customer',
      type: 'relationship',
      relationTo: 'users',
      label: 'Client',
      required: true,
      index: true,
      access: { create: staffWriteOnly, update: staffWriteOnly },
      admin: { position: 'sidebar' },
    },
    {
      name: 'status',
      type: 'select',
      label: 'Statut',
      required: true,
      defaultValue: 'planned',
      index: true,
      options: [
        { label: 'Planifié', value: 'planned' },
        { label: 'En cours', value: 'active' },
        { label: 'Suspendu', value: 'on_hold' },
        { label: 'Terminé', value: 'completed' },
        { label: 'Annulé', value: 'cancelled' },
      ],
      access: { create: staffWriteOnly, update: staffWriteOnly },
      admin: { position: 'sidebar' },
    },
    {
      name: 'progress',
      type: 'number',
      label: 'Avancement (%)',
      defaultValue: 0,
      min: 0,
      max: 100,
      access: { create: staffWriteOnly, update: staffWriteOnly },
      admin: { position: 'sidebar' },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'startDate',
          type: 'date',
          label: 'Début',
          access: { create: staffWriteOnly, update: staffWriteOnly },
          admin: { date: { pickerAppearance: 'dayOnly' } },
        },
        {
          name: 'endDate',
          type: 'date',
          label: 'Échéance',
          index: true,
          access: { create: staffWriteOnly, update: staffWriteOnly },
          admin: { date: { pickerAppearance: 'dayOnly' } },
        },
      ],
    },
    {
      name: 'summary',
      type: 'textarea',
      label: 'Description',
      maxLength: 4000,
      access: { create: staffWriteOnly, update: staffWriteOnly },
    },
    {
      name: 'sourceProposal',
      type: 'relationship',
      relationTo: 'proposals',
      label: 'Proposition d’origine',
      access: { create: serverWriteOnly, update: serverWriteOnly },
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'Une proposition ne peut être convertie qu’une seule fois.',
      },
    },
    {
      name: 'service',
      type: 'relationship',
      relationTo: 'services',
      label: 'Service',
      access: { create: staffWriteOnly, update: staffWriteOnly },
      admin: { position: 'sidebar' },
    },
    {
      name: 'milestones',
      type: 'array',
      label: 'Jalons',
      labels: { singular: 'Jalon', plural: 'Jalons' },
      access: { create: staffWriteOnly, update: staffWriteOnly },
      fields: [
        { name: 'title', type: 'text', label: 'Intitulé', required: true, maxLength: 200 },
        {
          name: 'dueDate',
          type: 'date',
          label: 'Échéance',
          admin: { date: { pickerAppearance: 'dayOnly' } },
        },
        {
          name: 'done',
          type: 'checkbox',
          label: 'Atteint',
          defaultValue: false,
        },
      ],
    },
    {
      name: 'updates',
      type: 'array',
      label: 'Mises à jour',
      labels: { singular: 'Mise à jour', plural: 'Mises à jour' },
      access: { create: staffWriteOnly, update: staffWriteOnly },
      admin: { description: 'Visibles par le client dans son espace.' },
      fields: [
        { name: 'title', type: 'text', label: 'Titre', required: true, maxLength: 200 },
        { name: 'body', type: 'textarea', label: 'Détail', maxLength: 4000 },
        {
          name: 'publishedAt',
          type: 'date',
          label: 'Publiée le',
          admin: { date: { pickerAppearance: 'dayAndTime' } },
        },
      ],
    },
    {
      name: 'documents',
      type: 'relationship',
      relationTo: 'documents',
      hasMany: true,
      label: 'Documents associés',
      access: { create: staffWriteOnly, update: staffWriteOnly },
    },
    {
      name: 'internalNotes',
      type: 'textarea',
      label: 'Notes internes',
      maxLength: 6000,
      access: { create: staffWriteOnly, update: staffWriteOnly, read: staffWriteOnly },
      admin: { description: 'Strictement interne. Jamais exposée au client.' },
    },
  ],
  timestamps: true,
}
