import type { CollectionConfig } from 'payload'

import { isCMSUser } from '../access'
import { ownerOrStaffRead, serverWriteOnly, staffWriteOnly } from '../access/ownership'

/**
 * Paiements enregistrés manuellement sur une facture.
 *
 * Aucun encaissement en ligne n'est traité ici : le site n'accepte pas de
 * moyens de paiement, il **consigne** des règlements constatés hors ligne
 * (virement, chèque, espèces). Aucune donnée de carte n'est jamais collectée
 * ni stockée.
 *
 * Après chaque écriture, le total encaissé de la facture est recalculé depuis
 * la somme des paiements — jamais incrémenté à l'aveugle, pour qu'une
 * suppression ou une correction reste juste.
 */
export const Payments: CollectionConfig = {
  slug: 'payments',
  labels: { singular: 'Paiement', plural: 'Paiements' },
  admin: {
    useAsTitle: 'reference',
    defaultColumns: ['reference', 'invoice', 'amount', 'method', 'receivedAt'],
    group: 'Commercial',
    description: 'Règlements constatés hors ligne. Aucune donnée bancaire n’est conservée.',
  },
  defaultSort: '-receivedAt',
  access: {
    read: ownerOrStaffRead('customer'),
    create: ({ req: { user } }) => isCMSUser(user),
    update: ({ req: { user } }) => isCMSUser(user),
    delete: ({ req: { user } }) => isCMSUser(user),
  },
  indexes: [
    { fields: ['invoice', 'receivedAt'] },
    { fields: ['customer', 'receivedAt'] },
  ],
  fields: [
    {
      name: 'invoice',
      type: 'relationship',
      relationTo: 'invoices',
      label: 'Facture',
      required: true,
      index: true,
      access: { create: staffWriteOnly, update: staffWriteOnly },
    },
    {
      name: 'customer',
      type: 'relationship',
      relationTo: 'users',
      label: 'Client',
      required: true,
      index: true,
      access: { create: serverWriteOnly, update: serverWriteOnly },
      admin: { readOnly: true, description: 'Repris de la facture.' },
    },
    {
      name: 'amount',
      type: 'number',
      label: 'Montant (centimes)',
      required: true,
      min: 1,
      access: { create: staffWriteOnly, update: staffWriteOnly },
    },
    {
      name: 'method',
      type: 'select',
      label: 'Moyen',
      required: true,
      defaultValue: 'transfer',
      options: [
        { label: 'Virement', value: 'transfer' },
        { label: 'Chèque', value: 'cheque' },
        { label: 'Espèces', value: 'cash' },
        { label: 'Autre', value: 'other' },
      ],
      access: { create: staffWriteOnly, update: staffWriteOnly },
    },
    {
      name: 'receivedAt',
      type: 'date',
      label: 'Reçu le',
      required: true,
      index: true,
      access: { create: staffWriteOnly, update: staffWriteOnly },
      admin: { date: { pickerAppearance: 'dayOnly' } },
    },
    {
      name: 'reference',
      type: 'text',
      label: 'Référence',
      maxLength: 120,
      access: { create: staffWriteOnly, update: staffWriteOnly },
      admin: { description: 'Numéro de virement ou de chèque. Aucune coordonnée bancaire.' },
    },
    {
      name: 'note',
      type: 'textarea',
      label: 'Note interne',
      maxLength: 1000,
      access: { create: staffWriteOnly, update: staffWriteOnly, read: staffWriteOnly },
    },
  ],
  timestamps: true,
}
