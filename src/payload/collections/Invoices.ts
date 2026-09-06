import type { CollectionConfig } from 'payload'

import { computeTotals } from '@/lib/commerce/money'
import { canTransitionInvoice, isInvoiceLocked } from '@/lib/commerce/transitions'
import type { InvoiceStatus } from '@/lib/commerce/transitions'

import { isCMSUser } from '../access'
import { resolveActor } from '../access/actor'
import { ownerOrStaffRead, serverWriteOnly, staffWriteOnly } from '../access/ownership'
import { lineItemsField, totalsFields } from '../fields/lineItems'

/**
 * Factures.
 *
 * Comme les propositions : totaux recalculés côté serveur, et document figé dès
 * qu'il quitte l'état brouillon. Une facture émise ne se réécrit pas — on
 * l'annule et on en émet une nouvelle, pour que l'historique comptable reste
 * fidèle.
 *
 * Le numéro est unique en base, via un index **partiel** posé par
 * `npm run db:ensure-indexes` : il n'est attribué qu'à l'émission, donc nul en
 * brouillon, et un index unique ordinaire ferait entrer en collision tous les
 * brouillons entre eux.
 *
 * Cette unicité est indispensable : l'instance MongoDB de production est
 * autonome, donc sans transactions. Deux émissions simultanées ne peuvent pas
 * être sérialisées ; c'est l'index qui tranche, et l'appelant réessaie avec le
 * numéro suivant.
 */
export const Invoices: CollectionConfig = {
  slug: 'invoices',
  labels: { singular: 'Facture', plural: 'Factures' },
  admin: {
    useAsTitle: 'number',
    defaultColumns: ['number', 'customer', 'status', 'issueDate', 'dueDate'],
    group: 'Commercial',
    description:
      'Une facture émise ne peut plus être modifiée. L’annuler conserve l’historique.',
  },
  defaultSort: '-issueDate',
  access: {
    read: ownerOrStaffRead('customer'),
    create: ({ req: { user } }) => isCMSUser(user),
    update: ({ req: { user } }) => isCMSUser(user),
    // Une facture ne se supprime pas : elle s'annule.
    delete: () => false,
  },
  indexes: [
    { fields: ['customer', 'status', 'dueDate'] },
    { fields: ['status', 'dueDate'] },
  ],
  fields: [
    {
      name: 'number',
      type: 'text',
      label: 'Numéro',
      // Pas d'`unique` ici : le numero n'est attribue qu'a l'emission, donc
      // nul en brouillon, et un index unique ordinaire ferait entrer en
      // collision tous les brouillons entre eux. Unicite posee par un index
      // PARTIEL — voir `npm run db:ensure-indexes`.
      index: true,
      access: { create: serverWriteOnly, update: serverWriteOnly },
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'Attribué par le serveur à l’émission, séquentiel et unique.',
      },
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
        { label: 'Partiellement payée', value: 'partially_paid' },
        { label: 'Payée', value: 'paid' },
        { label: 'En retard', value: 'overdue' },
        { label: 'Annulée', value: 'cancelled' },
      ],
      access: { create: staffWriteOnly, update: staffWriteOnly },
      admin: { position: 'sidebar' },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'issueDate',
          type: 'date',
          label: 'Date d’émission',
          index: true,
          access: { create: staffWriteOnly, update: staffWriteOnly },
          admin: { date: { pickerAppearance: 'dayOnly' } },
        },
        {
          name: 'dueDate',
          type: 'date',
          label: 'Échéance',
          index: true,
          access: { create: staffWriteOnly, update: staffWriteOnly },
          admin: { date: { pickerAppearance: 'dayOnly' } },
        },
      ],
    },
    {
      name: 'billTo',
      type: 'group',
      label: 'Coordonnées de facturation',
      access: { create: staffWriteOnly, update: staffWriteOnly },
      admin: {
        description:
          'Figées à l’émission : la facture reste fidèle même si le profil du client change ensuite.',
      },
      fields: [
        { name: 'name', type: 'text', label: 'Nom ou raison sociale', maxLength: 200 },
        { name: 'email', type: 'email', label: 'Courriel' },
        { name: 'address', type: 'textarea', label: 'Adresse', maxLength: 400 },
        { name: 'taxId', type: 'text', label: 'Numéro fiscal', maxLength: 60 },
      ],
    },
    lineItemsField,
    ...totalsFields,
    {
      type: 'row',
      fields: [
        {
          name: 'depositPaid',
          type: 'number',
          label: 'Acompte déjà réglé (centimes)',
          defaultValue: 0,
          min: 0,
          access: { create: staffWriteOnly, update: staffWriteOnly },
        },
        {
          name: 'amountPaid',
          type: 'number',
          label: 'Total encaissé (centimes)',
          defaultValue: 0,
          min: 0,
          access: { create: serverWriteOnly, update: serverWriteOnly },
          admin: { readOnly: true, description: 'Somme des paiements enregistrés.' },
        },
      ],
    },
    {
      name: 'paymentTerms',
      type: 'textarea',
      label: 'Conditions et instructions de paiement',
      maxLength: 3000,
      access: { create: staffWriteOnly, update: staffWriteOnly },
    },
    {
      name: 'publicNotes',
      type: 'textarea',
      label: 'Notes au client',
      maxLength: 2000,
      access: { create: staffWriteOnly, update: staffWriteOnly },
      admin: { description: 'Visibles par le client sur la facture.' },
    },
    {
      name: 'internalNotes',
      type: 'textarea',
      label: 'Notes internes',
      maxLength: 3000,
      access: { create: staffWriteOnly, update: staffWriteOnly, read: staffWriteOnly },
      admin: { description: 'Strictement interne. Jamais imprimée ni exposée au client.' },
    },
    {
      name: 'links',
      type: 'group',
      label: 'Rattachements',
      access: { create: staffWriteOnly, update: staffWriteOnly },
      admin: { position: 'sidebar' },
      fields: [
        { name: 'proposal', type: 'relationship', relationTo: 'proposals', label: 'Proposition' },
        {
          name: 'project',
          type: 'relationship',
          relationTo: 'clientProjects',
          label: 'Projet',
        },
        {
          name: 'quoteRequest',
          type: 'relationship',
          relationTo: 'quoteRequests',
          label: 'Demande de devis',
        },
      ],
    },
    {
      name: 'cancelledAt',
      type: 'date',
      label: 'Annulée le',
      access: { create: serverWriteOnly, update: serverWriteOnly },
      admin: { position: 'sidebar', readOnly: true },
    },
  ],
  hooks: {
    beforeChange: [
      ({ data, originalDoc, req }) => {
        const next = { ...data }
        const previous = originalDoc?.status as InvoiceStatus | undefined

        // --- Immuabilité d'une facture émise ---------------------------------
        if (previous && isInvoiceLocked(previous)) {
          const locked = ['lines', 'discountKind', 'discountValue', 'currency', 'billTo', 'issueDate']
          for (const field of locked) {
            if (field in next) {
              const before = JSON.stringify(originalDoc?.[field] ?? null)
              const after = JSON.stringify(next[field] ?? null)
              if (before !== after) {
                throw new Error(
                  'Cette facture a été émise : son contenu ne peut plus être modifié. ' +
                    'L’annuler puis en émettre une nouvelle.',
                )
              }
            }
          }
        }

        // --- Garde de transition ----------------------------------------------
        if (previous && next.status && previous !== next.status) {
          const actor = resolveActor(req)
          if (!canTransitionInvoice(previous, next.status as InvoiceStatus, actor)) {
            throw new Error(
              `Transition refusée : « ${previous} » ne peut pas devenir « ${next.status} ».`,
            )
          }
          if (next.status === 'cancelled') next.cancelledAt = new Date().toISOString()
        }

        // --- Totaux : toujours recalculés depuis les lignes --------------------
        const lines = (next.lines ?? originalDoc?.lines ?? []) as Parameters<
          typeof computeTotals
        >[0]['lines']
        const computed = computeTotals({
          lines,
          discountKind: next.discountKind ?? originalDoc?.discountKind,
          discountValue: next.discountValue ?? originalDoc?.discountValue,
          depositPaid: next.depositPaid ?? originalDoc?.depositPaid,
          amountPaid: next.amountPaid ?? originalDoc?.amountPaid,
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
