import type { CollectionConfig } from 'payload'

import { isCMSUser } from '../access'
import { ownerOrStaffRead, serverWriteOnly } from '../access/ownership'

/**
 * Articles mis en favori par une personne.
 *
 * L'unicite du couple (utilisateur, article) est imposee par un index unique
 * compose : deux clics rapides sur le meme bouton ne peuvent pas creer deux
 * lignes. C'est la base qui garantit l'invariant, pas l'interface.
 */
export const ArticleFavorites: CollectionConfig = {
  slug: 'articleFavorites',
  labels: { singular: 'Favori', plural: 'Favoris' },
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['user', 'article', 'createdAt'],
    group: 'Communauté',
    hidden: ({ user }) => !isCMSUser(user),
  },
  defaultSort: '-createdAt',
  access: {
    read: ownerOrStaffRead('user'),
    create: ({ req: { user } }) => isCMSUser(user),
    update: () => false,
    delete: ({ req: { user } }) => isCMSUser(user),
  },
  indexes: [
    // Empeche tout doublon, y compris en cas de requetes concurrentes.
    { fields: ['user', 'article'], unique: true },
    { fields: ['user', 'createdAt'] },
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
      name: 'article',
      type: 'relationship',
      relationTo: 'articles',
      label: 'Article',
      required: true,
      index: true,
      access: { create: serverWriteOnly, update: serverWriteOnly },
    },
  ],
  timestamps: true,
}
