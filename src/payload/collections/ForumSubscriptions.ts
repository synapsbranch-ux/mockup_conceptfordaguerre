import type { CollectionConfig } from 'payload'

import { isCMSUser } from '../access'
import { ownerOrStaffRead, serverWriteOnly } from '../access/ownership'

/**
 * Suivi d'une discussion : notifie son abonne a chaque nouvelle reponse.
 *
 * Comme pour les reactions, l'unicite du couple (utilisateur, discussion) est
 * imposee par un index unique compose plutot que par une verification
 * applicative.
 */
export const ForumSubscriptions: CollectionConfig = {
  slug: 'forumSubscriptions',
  labels: { singular: 'Abonnement', plural: 'Abonnements du forum' },
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['user', 'topic', 'createdAt'],
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
    // Invariant : un seul abonnement par personne et par discussion.
    // L'index simple sur `topic` (destinataires a notifier) vient de
    // `index: true` sur le champ : le redeclarer ici creerait un doublon.
    { fields: ['user', 'topic'], unique: true },
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
      name: 'topic',
      type: 'relationship',
      relationTo: 'forumTopics',
      label: 'Discussion',
      required: true,
      index: true,
      access: { create: serverWriteOnly, update: serverWriteOnly },
    },
  ],
  timestamps: true,
}
