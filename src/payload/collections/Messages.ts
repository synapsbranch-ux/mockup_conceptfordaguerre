import type { CollectionConfig } from 'payload'

import { isCMSUser } from '../access'
import { serverWriteOnly } from '../access/ownership'

/**
 * Messages d'une conversation.
 *
 * La lecture est adossée à la propriété de la conversation parente. Payload ne
 * sachant pas exprimer une jointure dans une clause d'accès, les routes d'API
 * chargent d'abord la conversation, vérifient la propriété, puis lisent les
 * messages avec `overrideAccess`. La règle ci-dessous reste volontairement
 * fermée pour qu'un accès direct à la collection ne contourne rien.
 *
 * Les notes internes ne sont **pas** ici : elles vivent dans `internalNotes`,
 * une collection distincte que le code client n'importe jamais.
 */
export const Messages: CollectionConfig = {
  slug: 'messages',
  labels: { singular: 'Message', plural: 'Messages' },
  admin: {
    useAsTitle: 'excerpt',
    defaultColumns: ['excerpt', 'conversation', 'author', 'createdAt'],
    group: 'Relation client',
  },
  defaultSort: 'createdAt',
  access: {
    // Volontairement fermé : la lecture passe par les routes, après
    // vérification de la propriété de la conversation.
    read: ({ req: { user } }) => isCMSUser(user),
    create: ({ req: { user } }) => isCMSUser(user),
    update: ({ req: { user } }) => isCMSUser(user),
    delete: () => false,
  },
  indexes: [{ fields: ['conversation', 'createdAt'] }],
  fields: [
    {
      name: 'conversation',
      type: 'relationship',
      relationTo: 'conversations',
      label: 'Conversation',
      required: true,
      index: true,
      access: { create: serverWriteOnly, update: serverWriteOnly },
    },
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
      name: 'authorSide',
      type: 'select',
      label: 'Émetteur',
      required: true,
      options: [
        { label: 'Client', value: 'customer' },
        { label: 'Équipe', value: 'staff' },
      ],
      access: { create: serverWriteOnly, update: serverWriteOnly },
      admin: { description: 'Déduit de la session, jamais transmis par le navigateur.' },
    },
    {
      name: 'body',
      type: 'textarea',
      label: 'Message',
      required: true,
      maxLength: 10000,
      admin: { description: 'Texte brut. Aucun HTML n’est interprété au rendu.' },
    },
    {
      name: 'excerpt',
      type: 'text',
      label: 'Aperçu',
      maxLength: 120,
      admin: { readOnly: true },
    },
    {
      name: 'attachments',
      type: 'relationship',
      relationTo: 'documents',
      hasMany: true,
      label: 'Pièces jointes',
    },
    {
      name: 'readAt',
      type: 'date',
      label: 'Lu le',
      access: { create: serverWriteOnly, update: serverWriteOnly },
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
