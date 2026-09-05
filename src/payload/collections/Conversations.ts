import type { CollectionConfig } from 'payload'

import { isCMSUser } from '../access'
import { ownerOrStaffRead, serverWriteOnly, staffWriteOnly } from '../access/ownership'

/**
 * Conversations entre un client et l'équipe.
 *
 * Une conversation peut être rattachée à un contexte : demande de devis,
 * service, facture, projet ou rendez-vous. Le contexte n'élargit jamais les
 * droits — la propriété reste portée par `customer`.
 */
export const Conversations: CollectionConfig = {
  slug: 'conversations',
  labels: { singular: 'Conversation', plural: 'Conversations' },
  admin: {
    useAsTitle: 'subject',
    defaultColumns: ['subject', 'customer', 'contextKind', 'status', 'lastMessageAt'],
    group: 'Relation client',
  },
  defaultSort: '-lastMessageAt',
  access: {
    read: ownerOrStaffRead('customer'),
    create: ({ req: { user } }) => isCMSUser(user),
    update: ({ req: { user } }) => isCMSUser(user),
    delete: () => false,
  },
  indexes: [
    { fields: ['customer', 'status', 'lastMessageAt'] },
    { fields: ['status', 'lastMessageAt'] },
    { fields: ['assignee', 'status'] },
  ],
  fields: [
    {
      name: 'subject',
      type: 'text',
      label: 'Objet',
      required: true,
      maxLength: 200,
    },
    {
      name: 'customer',
      type: 'relationship',
      relationTo: 'users',
      label: 'Client',
      required: true,
      index: true,
      access: { create: serverWriteOnly, update: staffWriteOnly },
    },
    {
      name: 'contextKind',
      type: 'select',
      label: 'Contexte',
      defaultValue: 'general',
      index: true,
      options: [
        { label: 'Général', value: 'general' },
        { label: 'Demande de devis', value: 'quote' },
        { label: 'Service', value: 'service' },
        { label: 'Facture', value: 'invoice' },
        { label: 'Projet', value: 'project' },
        { label: 'Rendez-vous', value: 'appointment' },
        { label: 'Document', value: 'document' },
      ],
    },
    {
      name: 'context',
      type: 'group',
      label: 'Élément rattaché',
      fields: [
        { name: 'quoteRequest', type: 'relationship', relationTo: 'quoteRequests', label: 'Devis' },
        { name: 'project', type: 'relationship', relationTo: 'clientProjects', label: 'Projet' },
        { name: 'invoice', type: 'relationship', relationTo: 'invoices', label: 'Facture' },
        {
          name: 'appointment',
          type: 'relationship',
          relationTo: 'appointments',
          label: 'Rendez-vous',
        },
        { name: 'document', type: 'relationship', relationTo: 'documents', label: 'Document' },
      ],
    },
    {
      name: 'status',
      type: 'select',
      label: 'Statut',
      required: true,
      defaultValue: 'open',
      index: true,
      options: [
        { label: 'Ouverte', value: 'open' },
        { label: 'Fermée', value: 'closed' },
        { label: 'Archivée', value: 'archived' },
      ],
    },
    {
      name: 'assignee',
      type: 'relationship',
      relationTo: 'users',
      label: 'Assignée à',
      index: true,
      access: { create: staffWriteOnly, update: staffWriteOnly },
      admin: { position: 'sidebar' },
    },
    {
      name: 'lastMessageAt',
      type: 'date',
      label: 'Dernier message',
      index: true,
      access: { create: serverWriteOnly, update: serverWriteOnly },
      admin: { readOnly: true, date: { pickerAppearance: 'dayAndTime' } },
    },
    {
      type: 'row',
      admin: { readOnly: true },
      fields: [
        {
          name: 'unreadForCustomer',
          type: 'number',
          label: 'Non lus côté client',
          defaultValue: 0,
          min: 0,
          access: { create: serverWriteOnly, update: serverWriteOnly },
        },
        {
          name: 'unreadForStaff',
          type: 'number',
          label: 'Non lus côté équipe',
          defaultValue: 0,
          min: 0,
          access: { create: serverWriteOnly, update: serverWriteOnly },
        },
      ],
    },
  ],
  timestamps: true,
}
