import type { CollectionConfig } from 'payload'

import { computeTotals } from '@/lib/commerce/money'
import { canTransitionProposal, isProposalLocked } from '@/lib/commerce/transitions'
import type { ProposalStatus } from '@/lib/commerce/transitions'

import { isCMSUser } from '../access'
import { ownerOrStaffRead, serverWriteOnly, staffWriteOnly } from '../access/ownership'
import { lineItemsField, totalsFields } from '../fields/lineItems'

/**
 * Propositions commerciales.
 *
 * Deux règles structurantes, toutes deux imposées par le hook `beforeChange` :
 *
 *  1. **Totaux recalculés côté serveur.** Les montants stockés proviennent
 *     exclusivement de `computeTotals()`, appliqué aux lignes. Un total posté
 *     par le navigateur est écrasé sans être lu.
 *
 *  2. **Une proposition envoyée est immuable.** Dès `sent`, lignes, remise,
 *     devise et conditions sont figées. Sans cela, le document accepté par le
 *     client pourrait différer de ce qu'il a réellement accepté. Pour corriger
 *     une proposition envoyée, on en crée une nouvelle version.
 */
export const Proposals: CollectionConfig = {
  slug: 'proposals',
  labels: { singular: 'Proposition', plural: 'Propositions' },
  admin: {
    useAsTitle: 'reference',
    defaultColumns: ['reference', 'customer', 'status', 'version', 'sentAt'],
    group: 'Commercial',
    description:
      'Une proposition envoyée ne peut plus être modifiée. Créer une nouvelle version pour corriger.',
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
    { fields: ['quoteRequest', 'version'] },
    { fields: ['status', 'validUntil'] },
  ],
  fields: [
    {
      name: 'reference',
      type: 'text',
      label: 'Référence',
      unique: true,
      index: true,
      access: { create: serverWriteOnly, update: serverWriteOnly },
      admin: { position: 'sidebar', readOnly: true },
    },
    {
      name: 'quoteRequest',
      type: 'relationship',
      relationTo: 'quoteRequests',
      label: 'Demande d’origine',
      index: true,
      access: { create: staffWriteOnly, update: staffWriteOnly },
      admin: { position: 'sidebar' },
    },
    {
      name: 'customer',
      type: 'relationship',
      relationTo: 'users',
      label: 'Client',
      required: true,
      index: true,
      access: { create: staffWriteOnly, update: staffWriteOnly },
      admin: { position: 'sidebar' },
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
        { label: 'Envoyée', value: 'sent' },
        { label: 'Acceptée', value: 'accepted' },
        { label: 'Refusée', value: 'declined' },
        { label: 'Expirée', value: 'expired' },
      ],
      access: { create: staffWriteOnly, update: staffWriteOnly },
      admin: { position: 'sidebar' },
    },
    {
      name: 'version',
      type: 'number',
      label: 'Version',
      defaultValue: 1,
      min: 1,
      access: { create: staffWriteOnly, update: staffWriteOnly },
      admin: { position: 'sidebar', readOnly: true },
    },
    {
      name: 'title',
      type: 'text',
      label: 'Objet',
      required: true,
      maxLength: 200,
      access: { create: staffWriteOnly, update: staffWriteOnly },
    },
    {
      name: 'summary',
      type: 'textarea',
      label: 'Résumé',
      maxLength: 2000,
      access: { create: staffWriteOnly, update: staffWriteOnly },
    },
    lineItemsField,
    ...totalsFields,
    {
      type: 'row',
      fields: [
        {
          name: 'validUntil',
          type: 'date',
          label: 'Valable jusqu’au',
          access: { create: staffWriteOnly, update: staffWriteOnly },
          admin: { date: { pickerAppearance: 'dayOnly' } },
        },
        {
          name: 'sentAt',
          type: 'date',
          label: 'Envoyée le',
          access: { create: serverWriteOnly, update: serverWriteOnly },
          admin: { readOnly: true, date: { pickerAppearance: 'dayAndTime' } },
        },
      ],
    },
    {
      name: 'terms',
      type: 'textarea',
      label: 'Conditions',
      maxLength: 6000,
      access: { create: staffWriteOnly, update: staffWriteOnly },
    },
    {
      name: 'decision',
      type: 'group',
      label: 'Décision du client',
      admin: { readOnly: true },
      fields: [
        {
          name: 'decidedAt',
          type: 'date',
          label: 'Décidée le',
          access: { create: serverWriteOnly, update: serverWriteOnly },
        },
        {
          name: 'note',
          type: 'textarea',
          label: 'Commentaire du client',
          maxLength: 2000,
          access: { create: serverWriteOnly, update: serverWriteOnly },
        },
      ],
    },
    {
      name: 'convertedProject',
      type: 'relationship',
      relationTo: 'clientProjects',
      label: 'Projet issu de cette proposition',
      access: { create: serverWriteOnly, update: serverWriteOnly },
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'Renseigné à la conversion. Empêche toute seconde conversion.',
      },
    },
    {
      name: 'internalNotes',
      type: 'textarea',
      label: 'Notes internes',
      maxLength: 6000,
      access: { create: staffWriteOnly, update: staffWriteOnly, read: staffWriteOnly },
      admin: { description: 'Strictement interne. Jamais exposée au client.' },
    },
  ],
  hooks: {
    beforeChange: [
      ({ data, originalDoc, operation, req }) => {
        const next = { ...data }

        if (operation === 'create' && !next.reference) {
          const stamp = new Date()
          const random = Math.floor(Math.random() * 1_0000)
            .toString()
            .padStart(4, '0')
          next.reference = `PROP-${stamp.getFullYear()}${String(stamp.getMonth() + 1).padStart(2, '0')}-${random}`
        }

        const previous = originalDoc?.status as ProposalStatus | undefined
        // --- Immuabilité d'une proposition envoyée ---------------------------
        if (previous && isProposalLocked(previous)) {
          const locked = ['lines', 'discountKind', 'discountValue', 'currency', 'terms', 'title']
          for (const field of locked) {
            if (field in next) {
              const before = JSON.stringify(originalDoc?.[field] ?? null)
              const after = JSON.stringify(next[field] ?? null)
              if (before !== after) {
                throw new Error(
                  'Cette proposition a été envoyée : son contenu ne peut plus être modifié. ' +
                    'Créer une nouvelle version pour la corriger.',
                )
              }
            }
          }
        }

        // --- Garde de transition ---------------------------------------------
        if (previous && next.status && previous !== next.status) {
          const actor = isCMSUser(req.user) ? 'staff' : 'customer'
          if (!canTransitionProposal(previous, next.status as ProposalStatus, actor)) {
            throw new Error(
              `Transition refusée : « ${previous} » ne peut pas devenir « ${next.status} ».`,
            )
          }
          if (next.status === 'sent' && !originalDoc?.sentAt) {
            next.sentAt = new Date().toISOString()
          }
          if (next.status === 'accepted' || next.status === 'declined') {
            next.decision = {
              ...(next.decision ?? {}),
              decidedAt: new Date().toISOString(),
            }
          }
        }

        // --- Totaux : toujours recalculés depuis les lignes -------------------
        const lines = (next.lines ?? originalDoc?.lines ?? []) as Parameters<
          typeof computeTotals
        >[0]['lines']
        const computed = computeTotals({
          lines,
          discountKind: next.discountKind ?? originalDoc?.discountKind,
          discountValue: next.discountValue ?? originalDoc?.discountValue,
        })
        next.totals = {
          subtotal: computed.subtotal,
          discountAmount: computed.discountAmount,
          taxAmount: computed.taxAmount,
          total: computed.total,
          balanceDue: computed.balanceDue,
        }

        return next
      },
    ],
  },
  timestamps: true,
}
