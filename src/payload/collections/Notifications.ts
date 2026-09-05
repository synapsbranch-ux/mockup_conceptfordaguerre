import type { CollectionConfig } from 'payload'

import { authenticated } from '../access'
import { ownerOrStaffRead, ownerOrStaffUpdate, serverWriteOnly } from '../access/ownership'

/**
 * Notifications destinées à une personne précise.
 *
 * Elles ne sont jamais créées depuis le navigateur : seuls les hooks serveur et
 * les routes d'API les écrivent, via `overrideAccess`. Le destinataire ne peut
 * qu'en modifier l'état de lecture — d'où `recipient`, `type`, `title` et
 * `link` en écriture serveur uniquement.
 */
export const NOTIFICATION_TYPES = [
  { label: 'Nouveau message', value: 'message' },
  { label: 'Nouvelle proposition', value: 'proposal' },
  { label: 'Proposition acceptée ou refusée', value: 'proposal_decision' },
  { label: 'Changement de statut d’un devis', value: 'quote_status' },
  { label: 'Nouveau document', value: 'document' },
  { label: 'Nouvelle facture', value: 'invoice' },
  { label: 'Facture en retard', value: 'invoice_overdue' },
  { label: 'Mise à jour d’un projet', value: 'project_update' },
  { label: 'Rendez-vous confirmé', value: 'appointment_confirmed' },
  { label: 'Rendez-vous reporté', value: 'appointment_rescheduled' },
  { label: 'Rendez-vous annulé', value: 'appointment_cancelled' },
  { label: 'Réponse à un commentaire', value: 'comment_reply' },
  { label: 'Réponse à une discussion suivie', value: 'forum_reply' },
  { label: 'Action de modération', value: 'moderation' },
] as const

export const Notifications: CollectionConfig = {
  slug: 'notifications',
  labels: { singular: 'Notification', plural: 'Notifications' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'recipient', 'type', 'read', 'createdAt'],
    group: 'Relation client',
    description: 'Générées automatiquement. Aucune saisie manuelle n’est prévue.',
    hidden: ({ user }) => !user,
  },
  defaultSort: '-createdAt',
  access: {
    read: ownerOrStaffRead('recipient'),
    // Jamais depuis une requête client : les hooks serveur passent par
    // `overrideAccess`.
    create: authenticated,
    update: ownerOrStaffUpdate('recipient'),
    delete: ownerOrStaffUpdate('recipient'),
  },
  indexes: [
    // Fil « mes notifications », trié par date, filtré sur les non lues.
    { fields: ['recipient', 'read', 'createdAt'] },
  ],
  fields: [
    {
      name: 'recipient',
      type: 'relationship',
      relationTo: 'users',
      label: 'Destinataire',
      required: true,
      index: true,
      access: { create: serverWriteOnly, update: serverWriteOnly },
    },
    {
      name: 'type',
      type: 'select',
      label: 'Type',
      required: true,
      options: [...NOTIFICATION_TYPES],
      access: { create: serverWriteOnly, update: serverWriteOnly },
    },
    {
      name: 'title',
      type: 'text',
      label: 'Intitulé',
      required: true,
      maxLength: 200,
      access: { create: serverWriteOnly, update: serverWriteOnly },
    },
    {
      name: 'body',
      type: 'textarea',
      label: 'Détail',
      maxLength: 600,
      access: { create: serverWriteOnly, update: serverWriteOnly },
    },
    {
      name: 'link',
      type: 'text',
      label: 'Lien',
      maxLength: 300,
      admin: { description: 'Chemin interne vers la ressource concernée.' },
      access: { create: serverWriteOnly, update: serverWriteOnly },
      validate: (value: string | null | undefined) => {
        if (!value) return true
        // Chemin interne uniquement : une notification ne doit jamais pouvoir
        // renvoyer vers un site externe.
        if (!value.startsWith('/') || value.startsWith('//')) {
          return 'Le lien doit être un chemin interne commençant par « / ».'
        }
        return true
      },
    },
    {
      name: 'read',
      type: 'checkbox',
      label: 'Lue',
      defaultValue: false,
      index: true,
    },
    {
      name: 'readAt',
      type: 'date',
      label: 'Lue le',
      admin: { readOnly: true, date: { pickerAppearance: 'dayAndTime' } },
    },
  ],
  hooks: {
    beforeChange: [
      ({ data, originalDoc }) => {
        // Horodate le passage à « lue », et le retire si l'état repasse à non lue.
        if (data.read === true && originalDoc?.read !== true) {
          return { ...data, readAt: new Date().toISOString() }
        }
        if (data.read === false) return { ...data, readAt: null }
        return data
      },
    ],
  },
  timestamps: true,
}
