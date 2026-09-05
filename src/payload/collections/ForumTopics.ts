import type { CollectionConfig, Where } from 'payload'

import { isCMSUser } from '../access'
import { serverWriteOnly, staffWriteOnly } from '../access/ownership'
import { slugField } from '../fields/slug'

/**
 * Discussions du forum.
 *
 * `author`, `status`, `pinned`, `locked` et les compteurs sont en écriture
 * serveur ou personnel uniquement : le navigateur ne peut ni usurper un auteur,
 * ni épingler sa propre discussion, ni gonfler un compteur de vues.
 *
 * `lastActivityAt` est maintenu par les hooks de réponse, ce qui permet un tri
 * « actif » sans agrégation coûteuse à chaque affichage du fil.
 */
export const TOPIC_STATUSES = [
  { label: 'Publiée', value: 'published' },
  { label: 'Masquée', value: 'hidden' },
  { label: 'Archivée', value: 'archived' },
] as const

export const ForumTopics: CollectionConfig = {
  slug: 'forumTopics',
  labels: { singular: 'Discussion', plural: 'Discussions du forum' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'category', 'author', 'status', 'replyCount', 'lastActivityAt'],
    group: 'Communauté',
    description: 'Discussions publiques. Épingler, verrouiller, résoudre ou masquer sans supprimer.',
  },
  defaultSort: '-lastActivityAt',
  access: {
    /** Fil public : seules les discussions publiées sont visibles. */
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
    // La création publique passe par la route d'API : débit, assainissement et
    // vérification du droit de publier y sont appliqués.
    create: ({ req: { user } }) => isCMSUser(user),
    update: ({ req: { user } }) => isCMSUser(user),
    delete: ({ req: { user } }) => isCMSUser(user),
  },
  indexes: [
    // Fil principal : catégorie, statut, épinglage puis activité.
    { fields: ['category', 'status', 'pinned', 'lastActivityAt'] },
    // Fil global tous sujets confondus.
    { fields: ['status', 'pinned', 'lastActivityAt'] },
    // Tri « populaire ».
    { fields: ['status', 'replyCount'] },
    // Fil « mes discussions ».
    { fields: ['author', 'createdAt'] },
  ],
  fields: [
    slugField('title'),
    {
      name: 'title',
      type: 'text',
      label: 'Titre',
      required: true,
      maxLength: 160,
    },
    {
      name: 'body',
      type: 'textarea',
      label: 'Message',
      required: true,
      maxLength: 12000,
      admin: { description: 'Texte brut. Aucun HTML n’est interprété au rendu.' },
    },
    {
      name: 'category',
      type: 'relationship',
      relationTo: 'forumCategories',
      label: 'Catégorie',
      required: true,
      index: true,
    },
    {
      name: 'tags',
      type: 'array',
      label: 'Étiquettes',
      labels: { singular: 'Étiquette', plural: 'Étiquettes' },
      maxRows: 5,
      fields: [{ name: 'label', type: 'text', label: 'Étiquette', required: true, maxLength: 30 }],
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
      name: 'status',
      type: 'select',
      label: 'Statut',
      required: true,
      defaultValue: 'published',
      index: true,
      options: [...TOPIC_STATUSES],
      access: { create: staffWriteOnly, update: staffWriteOnly },
    },
    {
      name: 'pinned',
      type: 'checkbox',
      label: 'Épinglée',
      defaultValue: false,
      index: true,
      access: { create: staffWriteOnly, update: staffWriteOnly },
      admin: { position: 'sidebar', description: 'Remonte la discussion en tête du fil.' },
    },
    {
      name: 'locked',
      type: 'checkbox',
      label: 'Verrouillée',
      defaultValue: false,
      access: { create: staffWriteOnly, update: staffWriteOnly },
      admin: { position: 'sidebar', description: 'Empêche toute nouvelle réponse.' },
    },
    {
      name: 'resolved',
      type: 'checkbox',
      label: 'Résolue',
      defaultValue: false,
      admin: {
        position: 'sidebar',
        description: 'L’auteur peut marquer sa propre discussion comme résolue.',
      },
    },
    {
      name: 'replyCount',
      type: 'number',
      label: 'Réponses',
      defaultValue: 0,
      min: 0,
      index: true,
      access: { create: serverWriteOnly, update: serverWriteOnly },
      admin: { readOnly: true },
    },
    {
      name: 'viewCount',
      type: 'number',
      label: 'Vues',
      defaultValue: 0,
      min: 0,
      access: { create: serverWriteOnly, update: serverWriteOnly },
      admin: { readOnly: true },
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
      name: 'lastActivityAt',
      type: 'date',
      label: 'Dernière activité',
      index: true,
      access: { create: serverWriteOnly, update: serverWriteOnly },
      admin: { readOnly: true, date: { pickerAppearance: 'dayAndTime' } },
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
      ({ data, operation }) => {
        // Une discussion nouvellement créée est active dès sa création.
        if (operation === 'create' && !data.lastActivityAt) {
          return { ...data, lastActivityAt: new Date().toISOString() }
        }
        return data
      },
    ],
  },
  timestamps: true,
}
