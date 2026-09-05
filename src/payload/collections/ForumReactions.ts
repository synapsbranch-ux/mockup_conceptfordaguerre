import type { CollectionConfig } from 'payload'

import { isCMSUser } from '../access'
import { ownerOrStaffRead, serverWriteOnly } from '../access/ownership'

/**
 * Reactions aux discussions et aux reponses.
 *
 * L'unicite du triplet (utilisateur, cible, type) est imposee par un index
 * unique compose. C'est la base qui empeche la double reaction, y compris sous
 * requetes concurrentes : un double-clic ne peut pas produire deux lignes, et
 * aucune verification cote client n'est necessaire pour tenir l'invariant.
 *
 * La cible est decrite par deux champs plutot que par une relation polymorphe,
 * afin que l'index unique porte sur des valeurs scalaires.
 */
export const REACTION_TYPES = [
  { label: 'Utile', value: 'helpful' },
  { label: 'Merci', value: 'thanks' },
  { label: 'Interessant', value: 'insightful' },
] as const

export const ForumReactions: CollectionConfig = {
  slug: 'forumReactions',
  labels: { singular: 'Réaction', plural: 'Réactions du forum' },
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['user', 'targetType', 'targetId', 'type', 'createdAt'],
    group: 'Communauté',
    hidden: ({ user }) => !isCMSUser(user),
  },
  access: {
    read: ownerOrStaffRead('user'),
    create: ({ req: { user } }) => isCMSUser(user),
    update: () => false,
    delete: ({ req: { user } }) => isCMSUser(user),
  },
  indexes: [
    // Invariant central : une seule reaction d'un type donne, par personne et
    // par cible.
    { fields: ['user', 'targetType', 'targetId', 'type'], unique: true },
    // Comptage par cible.
    { fields: ['targetType', 'targetId'] },
  ],
  fields: [
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      label: 'Utilisateur',
      required: true,
      index: true,
      access: { create: serverWriteOnly, update: serverWriteOnly },
    },
    {
      name: 'targetType',
      type: 'select',
      label: 'Type de cible',
      required: true,
      options: [
        { label: 'Discussion', value: 'topic' },
        { label: 'Réponse', value: 'reply' },
      ],
      access: { create: serverWriteOnly, update: serverWriteOnly },
    },
    {
      name: 'targetId',
      type: 'text',
      label: 'Identifiant de la cible',
      required: true,
      maxLength: 60,
      access: { create: serverWriteOnly, update: serverWriteOnly },
    },
    {
      name: 'type',
      type: 'select',
      label: 'Réaction',
      required: true,
      defaultValue: 'helpful',
      options: [...REACTION_TYPES],
      access: { create: serverWriteOnly, update: serverWriteOnly },
    },
  ],
  timestamps: true,
}
