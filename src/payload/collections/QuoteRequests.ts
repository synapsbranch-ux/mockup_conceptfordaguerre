import type { CollectionConfig } from 'payload'

import { isCMSUser } from '../access'
import { resolveActor } from '../access/actor'
import { ownerOrStaffRead, serverWriteOnly, staffWriteOnly } from '../access/ownership'
import { QUOTE_STATUSES } from '@/lib/commerce/transitions'
import { canTransitionQuote } from '@/lib/commerce/transitions'
import type { QuoteStatus } from '@/lib/commerce/transitions'

/**
 * Demandes de devis.
 *
 * Cycle de vie : `draft` → `submitted` → `in_review` → `quoted` → `accepted` /
 * `declined` → `closed`. Les transitions autorisées sont décrites dans
 * `@/lib/commerce/transitions` et vérifiées ici par un hook : un statut
 * transmis par le navigateur ne suffit jamais à faire avancer une demande.
 *
 * Une demande peut naître **sans compte** (formulaire public) : `guestEmail`
 * est alors renseigné et `customer` reste vide. Elle est réclamable plus tard
 * par la personne qui prouve détenir cette adresse, via une connexion dont
 * l'adresse vérifiée correspond.
 */
const STATUS_OPTIONS = [
  { label: 'Brouillon', value: 'draft' },
  { label: 'Envoyée', value: 'submitted' },
  { label: 'En cours d’étude', value: 'in_review' },
  { label: 'Proposition envoyée', value: 'quoted' },
  { label: 'Acceptée', value: 'accepted' },
  { label: 'Refusée', value: 'declined' },
  { label: 'Close', value: 'closed' },
]

export const QuoteRequests: CollectionConfig = {
  slug: 'quoteRequests',
  labels: { singular: 'Demande de devis', plural: 'Demandes de devis' },
  admin: {
    useAsTitle: 'reference',
    defaultColumns: ['reference', 'customer', 'service', 'status', 'priority', 'createdAt'],
    group: 'Commercial',
    description: 'Demandes reçues, de leur brouillon à leur clôture.',
  },
  defaultSort: '-createdAt',
  access: {
    read: ownerOrStaffRead('customer'),
    create: ({ req: { user } }) => isCMSUser(user),
    update: ({ req: { user } }) => isCMSUser(user),
    delete: ({ req: { user } }) => isCMSUser(user),
  },
  indexes: [
    { fields: ['customer', 'status', 'createdAt'] },
    { fields: ['status', 'priority', 'createdAt'] },
    { fields: ['guestEmail', 'claimedAt'] },
  ],
  fields: [
    {
      name: 'reference',
      type: 'text',
      label: 'Référence',
      unique: true,
      index: true,
      access: { create: serverWriteOnly, update: serverWriteOnly },
      admin: { position: 'sidebar', readOnly: true, description: 'Attribuée par le serveur.' },
    },
    {
      name: 'customer',
      type: 'relationship',
      relationTo: 'users',
      label: 'Client',
      index: true,
      access: { create: serverWriteOnly, update: staffWriteOnly },
      admin: { position: 'sidebar', description: 'Vide tant qu’une demande invité n’est pas réclamée.' },
    },
    {
      name: 'guestEmail',
      type: 'email',
      label: 'Adresse (demande sans compte)',
      index: true,
      access: { create: serverWriteOnly, update: staffWriteOnly },
      admin: { position: 'sidebar' },
    },
    {
      name: 'guestName',
      type: 'text',
      label: 'Nom (demande sans compte)',
      maxLength: 160,
      access: { create: serverWriteOnly, update: staffWriteOnly },
      admin: { position: 'sidebar' },
    },
    {
      /**
       * Cle d'idempotence fournie par le navigateur.
       *
       * Empeche qu'un double clic ou un renvoi reseau cree deux demandes
       * identiques. Unique par client, pas globalement : deux personnes
       * peuvent legitimement generer la meme cle.
       */
      name: 'idempotencyKey',
      type: 'text',
      label: 'Cle d’idempotence',
      maxLength: 64,
      index: true,
      access: { create: serverWriteOnly, update: serverWriteOnly, read: staffWriteOnly },
      admin: { position: 'sidebar', readOnly: true },
    },
    {
      name: 'claimedAt',
      type: 'date',
      label: 'Réclamée le',
      access: { create: serverWriteOnly, update: serverWriteOnly },
      admin: { position: 'sidebar', readOnly: true },
    },
    {
      name: 'status',
      type: 'select',
      label: 'Statut',
      required: true,
      defaultValue: 'draft',
      index: true,
      options: STATUS_OPTIONS,
      // Le statut n'est jamais écrit directement par un client : les routes
      // d'API appellent `canTransitionQuote` avant d'appliquer un changement.
      access: { create: staffWriteOnly, update: staffWriteOnly },
      admin: { position: 'sidebar' },
    },
    {
      name: 'priority',
      type: 'select',
      label: 'Priorité',
      defaultValue: 'normal',
      options: [
        { label: 'Basse', value: 'low' },
        { label: 'Normale', value: 'normal' },
        { label: 'Haute', value: 'high' },
      ],
      access: { create: staffWriteOnly, update: staffWriteOnly },
      admin: { position: 'sidebar' },
    },
    {
      name: 'assignee',
      type: 'relationship',
      relationTo: 'users',
      label: 'Responsable',
      access: { create: staffWriteOnly, update: staffWriteOnly },
      admin: { position: 'sidebar' },
    },
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Demande',
          fields: [
            {
              name: 'service',
              type: 'relationship',
              relationTo: 'services',
              label: 'Service souhaité',
              index: true,
            },
            {
              name: 'objectives',
              type: 'textarea',
              label: 'Objectifs et besoins',
              required: true,
              maxLength: 6000,
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'budgetRange',
                  type: 'select',
                  label: 'Budget estimé',
                  options: [
                    { label: 'Moins de 2 000 $', value: 'under_2k' },
                    { label: '2 000 à 5 000 $', value: '2k_5k' },
                    { label: '5 000 à 15 000 $', value: '5k_15k' },
                    { label: 'Plus de 15 000 $', value: 'over_15k' },
                    { label: 'À déterminer', value: 'unknown' },
                  ],
                },
                {
                  name: 'desiredStart',
                  type: 'date',
                  label: 'Début souhaité',
                  admin: { date: { pickerAppearance: 'dayOnly' } },
                },
                {
                  name: 'desiredDeadline',
                  type: 'date',
                  label: 'Échéance souhaitée',
                  admin: { date: { pickerAppearance: 'dayOnly' } },
                },
              ],
            },
            {
              name: 'attachments',
              type: 'relationship',
              relationTo: 'documents',
              hasMany: true,
              label: 'Pièces jointes',
            },
            {
              name: 'submittedAt',
              type: 'date',
              label: 'Envoyée le',
              access: { create: serverWriteOnly, update: serverWriteOnly },
              admin: { readOnly: true, date: { pickerAppearance: 'dayAndTime' } },
            },
          ],
        },
        {
          label: 'Suivi interne',
          // Onglet entier réservé au personnel : jamais sérialisé pour un client.
          admin: { condition: (_data, _sibling, { user }) => isCMSUser(user) },
          fields: [
            {
              name: 'internalNotes',
              type: 'textarea',
              label: 'Notes internes',
              maxLength: 8000,
              access: { create: staffWriteOnly, update: staffWriteOnly, read: staffWriteOnly },
              admin: {
                description:
                  'Strictement interne. N’apparaît jamais dans l’espace client ni dans les conversations.',
              },
            },
            {
              name: 'timeline',
              type: 'array',
              label: 'Chronologie',
              labels: { singular: 'Étape', plural: 'Étapes' },
              access: { create: serverWriteOnly, update: serverWriteOnly },
              admin: { readOnly: true, description: 'Journal des changements de statut.' },
              fields: [
                { name: 'status', type: 'text', label: 'Statut' },
                { name: 'at', type: 'date', label: 'Le' },
                { name: 'by', type: 'text', label: 'Par' },
              ],
            },
          ],
        },
      ],
    },
  ],
  hooks: {
    beforeChange: [
      ({ data, originalDoc, operation, req }) => {
        const next = { ...data }

        // Référence lisible, attribuée une seule fois.
        if (operation === 'create' && !next.reference) {
          const stamp = new Date()
          const random = Math.floor(Math.random() * 1_0000)
            .toString()
            .padStart(4, '0')
          next.reference = `DEV-${stamp.getFullYear()}${String(stamp.getMonth() + 1).padStart(2, '0')}-${random}`
        }

        // Garde de transition : refuse tout changement de statut non prévu,
        // même si l'appelant a contourné les routes d'API.
        const previous = originalDoc?.status as QuoteStatus | undefined
        const requested = next.status as QuoteStatus | undefined
        if (previous && requested && previous !== requested) {
          const actor = resolveActor(req)
          if (!canTransitionQuote(previous, requested, actor)) {
            throw new Error(
              `Transition de statut refusée : « ${previous} » ne peut pas devenir « ${requested} ».`,
            )
          }
          next.timeline = [
            ...(Array.isArray(originalDoc?.timeline) ? originalDoc.timeline : []),
            { status: requested, at: new Date().toISOString(), by: actor },
          ]
        }

        // Horodate le premier envoi.
        if (requested === 'submitted' && !originalDoc?.submittedAt) {
          next.submittedAt = new Date().toISOString()
        }

        return next
      },
    ],
  },
  timestamps: true,
}

export { QUOTE_STATUSES }
