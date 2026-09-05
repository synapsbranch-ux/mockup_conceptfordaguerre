import type { CollectionConfig } from 'payload'

import { isCMSUser, isSuperAdmin, superAdminFieldOnly } from '../access'
import { usersCreate, usersDelete, usersRead, usersUpdate } from '../access/users'

/**
 * Comptes d'administration du CMS.
 *
 * Aucune inscription publique n'est possible : la création est réservée aux
 * super-administrateurs, et le champ `role` est protégé au niveau du champ pour
 * qu'un éditeur ne puisse jamais s'auto-promouvoir.
 */
export const Users: CollectionConfig = {
  slug: 'users',
  labels: { singular: 'Utilisateur', plural: 'Utilisateurs' },
  auth: {
    tokenExpiration: 60 * 60 * 8,
    maxLoginAttempts: 5,
    lockTime: 10 * 60 * 1000,
    useAPIKey: false,
    depth: 0,
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'email', 'role', 'active', 'lastLogin'],
    group: 'Système',
    description:
      'Comptes ayant accès à ce panneau. Seuls les super-administrateurs peuvent créer un compte ou modifier un rôle.',
  },
  access: {
    read: usersRead,
    create: usersCreate,
    update: usersUpdate,
    delete: usersDelete,
    admin: ({ req: { user } }) => isCMSUser(user),
    unlock: ({ req: { user } }) => isSuperAdmin(user),
  },
  hooks: {
    beforeLogin: [
      ({ user }) => {
        if (user?.active === false) {
          throw new Error('Ce compte est désactivé. Contacter un super-administrateur.')
        }
        return user
      },
    ],
    afterLogin: [
      async ({ req, user }) => {
        // Journalise uniquement l'horodatage : aucun identifiant ni secret.
        await req.payload.update({
          collection: 'users',
          id: user.id,
          data: { lastLogin: new Date().toISOString() },
          overrideAccess: true,
          context: { disableRevalidate: true },
        })
        return user
      },
    ],
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      label: 'Nom complet',
      required: true,
      maxLength: 120,
    },
    {
      name: 'role',
      type: 'select',
      label: 'Rôle',
      required: true,
      defaultValue: 'editor',
      options: [
        { label: 'Super-administrateur', value: 'super-admin' },
        { label: 'Éditeur', value: 'editor' },
      ],
      access: {
        create: superAdminFieldOnly,
        update: superAdminFieldOnly,
      },
      admin: {
        position: 'sidebar',
        description:
          'Éditeur : contenu et médias. Super-administrateur : accès complet, y compris les comptes.',
      },
    },
    {
      name: 'active',
      type: 'checkbox',
      label: 'Compte actif',
      defaultValue: true,
      access: {
        create: superAdminFieldOnly,
        update: superAdminFieldOnly,
      },
      admin: {
        position: 'sidebar',
        description: 'Décocher empêche la connexion sans supprimer le compte ni ses contributions.',
      },
    },
    {
      name: 'lastLogin',
      type: 'date',
      label: 'Dernière connexion',
      admin: {
        position: 'sidebar',
        readOnly: true,
        date: { pickerAppearance: 'dayAndTime', displayFormat: 'd MMM yyyy, HH:mm' },
      },
    },
  ],
  timestamps: true,
}
