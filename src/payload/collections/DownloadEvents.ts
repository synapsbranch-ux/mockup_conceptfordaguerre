import type { CollectionConfig } from 'payload'

import { authenticated } from '../access'
import { ownerOrStaffRead, serverWriteOnly } from '../access/ownership'

/**
 * Historique des téléchargements.
 *
 * Registre en ajout seul, écrit par la route de téléchargement après que
 * l'autorisation a été accordée.
 *
 * Point important : l'écriture de l'historique ne doit **jamais** empêcher un
 * téléchargement légitime. La route enregistre l'événement de façon défensive
 * et sert le fichier même si cette écriture échoue — une panne d'analytique ne
 * peut pas devenir une panne de service.
 *
 * Aucune adresse IP n'est conservée, conformément au reste du site.
 */
export const DownloadEvents: CollectionConfig = {
  slug: 'downloadEvents',
  labels: { singular: 'Téléchargement', plural: 'Historique des téléchargements' },
  admin: {
    useAsTitle: 'documentTitle',
    defaultColumns: ['documentTitle', 'user', 'createdAt'],
    group: 'Relation client',
    description: 'Registre en ajout seul. Aucune adresse IP n’est conservée.',
  },
  defaultSort: '-createdAt',
  access: {
    read: ownerOrStaffRead('user'),
    create: authenticated,
    update: () => false,
    delete: () => false,
  },
  indexes: [
    { fields: ['user', 'createdAt'] },
    { fields: ['document', 'createdAt'] },
  ],
  fields: [
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      label: 'Utilisateur',
      index: true,
      access: { create: serverWriteOnly, update: serverWriteOnly },
      admin: { description: 'Vide pour un téléchargement anonyme d’une ressource publique.' },
    },
    {
      name: 'document',
      type: 'relationship',
      relationTo: 'documents',
      label: 'Document',
      required: true,
      index: true,
      access: { create: serverWriteOnly, update: serverWriteOnly },
    },
    {
      name: 'documentTitle',
      type: 'text',
      label: 'Titre au moment du téléchargement',
      maxLength: 200,
      access: { create: serverWriteOnly, update: serverWriteOnly },
      admin: {
        readOnly: true,
        description: 'Figé : l’historique reste lisible même si le document est renommé.',
      },
    },
  ],
  timestamps: true,
}
