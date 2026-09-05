import type { CollectionConfig } from 'payload'

import { isCMSUser } from '../access'
import { serverWriteOnly } from '../access/ownership'

/**
 * Notes internes de l'équipe.
 *
 * Collection **délibérément séparée** des messages, et non un champ masqué sur
 * une conversation. La raison est simple : un champ « interne » sur un document
 * client finit tôt ou tard par fuiter — par une population de relation, un
 * `depth` trop généreux, un export, ou une requête oubliée.
 *
 * En vivant dans sa propre collection, dont l'accès est fermé au personnel à
 * tous les verbes, une note interne ne peut pas être sérialisée par erreur dans
 * une réponse destinée à un client. Le code de l'espace client n'importe jamais
 * ce module.
 */
export const InternalNotes: CollectionConfig = {
  slug: 'internalNotes',
  labels: { singular: 'Note interne', plural: 'Notes internes' },
  admin: {
    useAsTitle: 'excerpt',
    defaultColumns: ['excerpt', 'author', 'subjectKind', 'createdAt'],
    group: 'Relation client',
    description: 'Strictement interne. Jamais visible par un client, sous aucune forme.',
  },
  defaultSort: '-createdAt',
  access: {
    // Fermé à tous les verbes pour quiconque n'est pas membre du personnel.
    read: ({ req: { user } }) => isCMSUser(user),
    create: ({ req: { user } }) => isCMSUser(user),
    update: ({ req: { user } }) => isCMSUser(user),
    delete: ({ req: { user } }) => isCMSUser(user),
  },
  indexes: [
    { fields: ['subjectKind', 'subjectId', 'createdAt'] },
    { fields: ['author', 'createdAt'] },
  ],
  fields: [
    {
      name: 'author',
      type: 'relationship',
      relationTo: 'users',
      label: 'Auteur',
      required: true,
      index: true,
      access: { create: serverWriteOnly, update: serverWriteOnly },
    },
    {
      name: 'subjectKind',
      type: 'select',
      label: 'Rattachée à',
      required: true,
      index: true,
      options: [
        { label: 'Conversation', value: 'conversation' },
        { label: 'Demande de devis', value: 'quoteRequest' },
        { label: 'Proposition', value: 'proposal' },
        { label: 'Facture', value: 'invoice' },
        { label: 'Projet', value: 'clientProject' },
        { label: 'Rendez-vous', value: 'appointment' },
        { label: 'Client', value: 'user' },
      ],
    },
    {
      name: 'subjectId',
      type: 'text',
      label: 'Identifiant de l’élément',
      required: true,
      maxLength: 60,
      index: true,
    },
    {
      name: 'body',
      type: 'textarea',
      label: 'Note',
      required: true,
      maxLength: 8000,
    },
    {
      name: 'excerpt',
      type: 'text',
      label: 'Aperçu',
      maxLength: 120,
      admin: { readOnly: true },
    },
  ],
  hooks: {
    beforeChange: [
      ({ data }) => {
        if (typeof data.body === 'string') {
          const flat = data.body.replace(/\s+/g, ' ').trim()
          return { ...data, excerpt: flat.slice(0, 117) + (flat.length > 117 ? '…' : '') }
        }
        return data
      },
    ],
  },
  timestamps: true,
}
