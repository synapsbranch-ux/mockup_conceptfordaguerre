import type { CollectionConfig } from 'payload'

import { authenticated, superAdminOnly } from '../access'
import { serverWriteOnly, staffWriteOnly } from '../access/ownership'

/**
 * Campagnes d'infolettre.
 *
 * Deux garde-fous structurants, tous deux imposés par le hook `beforeChange` :
 *
 *  1. **Aucun double envoi.** `sentAt` est écrit une seule fois. Une campagne
 *     déjà envoyée ne peut plus repasser en brouillon ni être renvoyée : sans
 *     cela, un double clic ou un rechargement inonderait la liste entière.
 *
 *  2. **Contenu figé après envoi.** Objet et corps ne changent plus une fois
 *     partis, pour que l'historique reflète ce qui a réellement été reçu.
 *
 * `recipientCount` est constaté au moment de l'envoi, jamais estimé à
 * l'avance : c'est le nombre réel de destinataires retenus.
 */
export const NewsletterCampaigns: CollectionConfig = {
  slug: 'newsletterCampaigns',
  labels: { singular: 'Campagne', plural: 'Campagnes d’infolettre' },
  admin: {
    useAsTitle: 'subject',
    defaultColumns: ['subject', 'status', 'recipientCount', 'sentAt'],
    group: 'Diffusion',
    description:
      'Une campagne envoyée est définitive : son contenu est figé et elle ne peut pas être renvoyée.',
  },
  defaultSort: '-createdAt',
  access: {
    read: authenticated,
    create: authenticated,
    update: authenticated,
    // Supprimer une campagne effacerait la trace d'un envoi réel.
    delete: superAdminOnly,
  },
  indexes: [{ fields: ['status', 'createdAt'] }],
  fields: [
    {
      name: 'subject',
      type: 'text',
      label: 'Objet du courriel',
      required: true,
      maxLength: 200,
    },
    {
      name: 'preheader',
      type: 'text',
      label: 'Texte d’aperçu',
      maxLength: 200,
      admin: { description: 'Court extrait affiché après l’objet dans la boîte de réception.' },
    },
    {
      name: 'body',
      type: 'textarea',
      label: 'Contenu',
      required: true,
      maxLength: 20000,
      admin: {
        description:
          'Texte brut. Aucun HTML n’est interprété : le rendu échappe systématiquement le contenu.',
      },
    },
    {
      name: 'audience',
      type: 'select',
      label: 'Audience',
      required: true,
      defaultValue: 'subscribed',
      options: [
        { label: 'Abonnés confirmés', value: 'subscribed' },
        { label: 'Abonnés confirmés et clients', value: 'subscribed_and_customers' },
      ],
      access: { create: staffWriteOnly, update: staffWriteOnly },
    },
    {
      name: 'status',
      type: 'select',
      label: 'Statut',
      required: true,
      defaultValue: 'draft',
      index: true,
      options: [
        { label: 'Brouillon', value: 'draft' },
        { label: 'Programmée', value: 'scheduled' },
        { label: 'Envoyée', value: 'sent' },
        { label: 'Échec', value: 'failed' },
      ],
      access: { create: staffWriteOnly, update: staffWriteOnly },
      admin: { position: 'sidebar' },
    },
    {
      name: 'scheduledFor',
      type: 'date',
      label: 'Envoi programmé',
      access: { create: staffWriteOnly, update: staffWriteOnly },
      admin: {
        position: 'sidebar',
        date: { pickerAppearance: 'dayAndTime' },
        condition: (data) => data?.status === 'scheduled',
      },
    },
    {
      name: 'sentAt',
      type: 'date',
      label: 'Envoyée le',
      access: { create: serverWriteOnly, update: serverWriteOnly },
      admin: { position: 'sidebar', readOnly: true },
    },
    {
      name: 'recipientCount',
      type: 'number',
      label: 'Destinataires',
      defaultValue: 0,
      min: 0,
      access: { create: serverWriteOnly, update: serverWriteOnly },
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'Nombre réel constaté à l’envoi, jamais une estimation.',
      },
    },
    {
      name: 'deliveryReport',
      type: 'group',
      label: 'Résultat d’envoi',
      access: { create: serverWriteOnly, update: serverWriteOnly },
      admin: {
        readOnly: true,
        description: 'Constat brut. Un échec est consigné tel quel, jamais masqué en succès.',
      },
      fields: [
        { name: 'delivered', type: 'number', label: 'Acceptés', defaultValue: 0 },
        { name: 'failed', type: 'number', label: 'Échecs', defaultValue: 0 },
        { name: 'lastError', type: 'text', label: 'Dernière erreur', maxLength: 300 },
      ],
    },
    {
      name: 'testSentTo',
      type: 'email',
      label: 'Dernier envoi de test',
      access: { create: serverWriteOnly, update: serverWriteOnly },
      admin: { readOnly: true },
    },
  ],
  hooks: {
    beforeChange: [
      ({ data, originalDoc }) => {
        const next = { ...data }
        const alreadySent = Boolean(originalDoc?.sentAt)

        if (alreadySent) {
          // Garde anti-double-envoi : le statut « envoyée » est terminal.
          if (next.status && next.status !== 'sent') {
            throw new Error(
              'Cette campagne a déjà été envoyée : son statut ne peut plus changer. ' +
                'Créer une nouvelle campagne pour un nouvel envoi.',
            )
          }

          // Contenu figé : l'historique doit refléter ce qui a été reçu.
          for (const field of ['subject', 'body', 'preheader', 'audience']) {
            if (field in next) {
              const before = JSON.stringify(originalDoc?.[field] ?? null)
              const after = JSON.stringify(next[field] ?? null)
              if (before !== after) {
                throw new Error(
                  'Cette campagne a déjà été envoyée : son contenu ne peut plus être modifié.',
                )
              }
            }
          }
        }

        return next
      },
    ],
  },
  timestamps: true,
}
