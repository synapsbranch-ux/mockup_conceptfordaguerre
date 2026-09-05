import type { CollectionConfig, Where } from 'payload'

import { isCMSUser } from '../access'
import { serverWriteOnly, staffWriteOnly } from '../access/ownership'

/**
 * Réponses aux discussions du forum.
 *
 * Un seul niveau de réponse imbriquée, comme pour les commentaires d'articles :
 * `parent` doit désigner une réponse racine de la même discussion, contrainte
 * vérifiée côté serveur.
 */
export const REPLY_STATUSES = [
  { label: 'Publiée', value: 'published' },
  { label: 'Masquée', value: 'hidden' },
  { label: 'Indésirable', value: 'spam' },
] as const

export const ForumReplies: CollectionConfig = {
  slug: 'forumReplies',
  labels: { singular: 'Réponse', plural: 'Réponses du forum' },
  admin: {
    useAsTitle: 'excerpt',
    defaultColumns: ['excerpt', 'topic', 'author', 'status', 'reportCount', 'createdAt'],
    group: 'Communauté',
  },
  defaultSort: 'createdAt',
  access: {
    read: ({ req: { user } }) => {
      if (isCMSUser(user)) return true
      if (user) {
        const clause: Where = {
          or: [{ status: { equals: 'published' } }, { author: { equals: user.id } }],
        }
        return clause
      }
      return { status: { equals: 'published' } }
    },
    create: ({ req: { user } }) => isCMSUser(user),
    update: ({ req: { user } }) => isCMSUser(user),
    delete: ({ req: { user } }) => isCMSUser(user),
  },
  indexes: [
    { fields: ['topic', 'status', 'createdAt'] },
    { fields: ['author', 'createdAt'] },
    { fields: ['status', 'reportCount'] },
    { fields: ['parent', 'status'] },
  ],
  fields: [
    {
      name: 'topic',
      type: 'relationship',
      relationTo: 'forumTopics',
      label: 'Discussion',
      required: true,
      index: true,
      access: { create: serverWriteOnly, update: serverWriteOnly },
    },
    {
      name: 'parent',
      type: 'relationship',
      relationTo: 'forumReplies',
      label: 'Réponse à',
      index: true,
      access: { create: serverWriteOnly, update: serverWriteOnly },
      admin: { description: 'Un seul niveau d’imbrication est autorisé.' },
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
      name: 'body',
      type: 'textarea',
      label: 'Message',
      required: true,
      maxLength: 8000,
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
      name: 'status',
      type: 'select',
      label: 'Statut',
      required: true,
      defaultValue: 'published',
      index: true,
      options: [...REPLY_STATUSES],
      access: { create: staffWriteOnly, update: staffWriteOnly },
    },
    {
      name: 'acceptedAnswer',
      type: 'checkbox',
      label: 'Réponse retenue',
      defaultValue: false,
      admin: {
        description: 'Marquée par l’auteur de la discussion lorsqu’elle résout sa question.',
      },
    },
    {
      name: 'reactionCount',
      type: 'number',
      label: 'Réactions',
      defaultValue: 0,
      min: 0,
      access: { create: serverWriteOnly, update: serverWriteOnly },
      admin: { readOnly: true },
    },
    {
      name: 'reportCount',
      type: 'number',
      label: 'Signalements',
      defaultValue: 0,
      min: 0,
      access: { create: serverWriteOnly, update: staffWriteOnly },
    },
    {
      name: 'editedAt',
      type: 'date',
      label: 'Modifiée le',
      admin: { readOnly: true, date: { pickerAppearance: 'dayAndTime' } },
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
