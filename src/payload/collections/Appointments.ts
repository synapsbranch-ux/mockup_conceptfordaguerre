import type { CollectionConfig } from 'payload'

import {
  ACTIVE_APPOINTMENT_STATUSES,
  canTransitionAppointment,
} from '@/lib/commerce/transitions'
import type { AppointmentStatus } from '@/lib/commerce/transitions'

import { isCMSUser } from '../access'
import { ownerOrStaffRead, serverWriteOnly, staffWriteOnly } from '../access/ownership'

/**
 * Rendez-vous.
 *
 * ## Dates
 * `startAt` et `endAt` sont stockés en **UTC**, sans exception. Le fuseau du
 * client est conservé à part (`customerTimezone`) et ne sert qu'à l'affichage.
 * Stocker une heure locale rendrait tout calcul faux au changement d'heure.
 *
 * ## Double réservation
 * Empêchée par un **index unique en base** sur `slotKey`, et non par une
 * vérification applicative. C'est essentiel ici : l'instance MongoDB de
 * production est autonome, sans replica set, donc sans transactions. Deux
 * réservations simultanées du même créneau ne peuvent pas être sérialisées par
 * une transaction — sans index unique, les deux passeraient.
 *
 * `slotKey` vaut `<hôte>|<début UTC>` tant que le rendez-vous occupe le
 * créneau (`requested` ou `confirmed`), et repasse à `null` dès qu'il est
 * annulé, terminé ou marqué absent.
 *
 * L'index est **partiel** — `partialFilterExpression: { slotKey: { $type:
 * 'string' } }` — et non simplement unique : MongoDB traite l'absence de
 * valeur comme une valeur, si bien qu'un index unique ordinaire ferait entrer
 * en collision tous les rendez-vous annulés entre eux. En n'indexant que les
 * documents dont `slotKey` est une chaîne, un créneau libéré redevient
 * réservable tandis que deux réservations actives concurrentes s'excluent.
 *
 * La configuration Payload ne sait pas exprimer un filtre partiel : l'index est
 * posé par `npm run appointments:ensure-index`.
 */
export const Appointments: CollectionConfig = {
  slug: 'appointments',
  labels: { singular: 'Rendez-vous', plural: 'Rendez-vous' },
  admin: {
    useAsTitle: 'reference',
    defaultColumns: ['reference', 'customer', 'meetingType', 'startAt', 'status'],
    group: 'Rendez-vous',
    description: 'Toutes les dates sont stockées en UTC et affichées au fuseau de chacun.',
  },
  defaultSort: '-startAt',
  access: {
    read: ownerOrStaffRead('customer'),
    create: ({ req: { user } }) => isCMSUser(user),
    update: ({ req: { user } }) => isCMSUser(user),
    delete: () => false,
  },
  indexes: [
    { fields: ['customer', 'startAt'] },
    { fields: ['host', 'startAt'] },
    { fields: ['status', 'startAt'] },
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
      /**
       * Clé d'occupation du créneau. Unique parmi les rendez-vous actifs.
       * Écrite uniquement par le hook ci-dessous : jamais depuis une requête.
       */
      name: 'slotKey',
      type: 'text',
      label: 'Clé de créneau',
      // Volontairement PAS `unique: true` ici : un index unique ordinaire
      // considere l'absence de valeur comme une valeur, et deux rendez-vous
      // annules (slotKey nul) entreraient en collision. L'unicite est posee
      // par un index PARTIEL, restreint aux documents ou slotKey est une
      // chaine — voir `npm run appointments:ensure-index`.
      index: true,
      access: { create: serverWriteOnly, update: serverWriteOnly, read: staffWriteOnly },
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'Garantit qu’un créneau n’est pris qu’une fois. Retirée à l’annulation.',
      },
    },
    {
      name: 'customer',
      type: 'relationship',
      relationTo: 'users',
      label: 'Client',
      index: true,
      access: { create: serverWriteOnly, update: staffWriteOnly },
      admin: { position: 'sidebar' },
    },
    {
      name: 'guestEmail',
      type: 'email',
      label: 'Adresse (réservation sans compte)',
      index: true,
      access: { create: serverWriteOnly, update: staffWriteOnly },
      admin: { position: 'sidebar' },
    },
    {
      name: 'guestName',
      type: 'text',
      label: 'Nom (réservation sans compte)',
      maxLength: 160,
      access: { create: serverWriteOnly, update: staffWriteOnly },
      admin: { position: 'sidebar' },
    },
    {
      name: 'host',
      type: 'relationship',
      relationTo: 'users',
      label: 'Hôte',
      required: true,
      index: true,
      access: { create: serverWriteOnly, update: staffWriteOnly },
      admin: { position: 'sidebar' },
    },
    {
      name: 'meetingType',
      type: 'relationship',
      relationTo: 'meetingTypes',
      label: 'Type de rencontre',
      required: true,
      index: true,
      access: { create: serverWriteOnly, update: staffWriteOnly },
    },
    {
      name: 'status',
      type: 'select',
      label: 'Statut',
      required: true,
      defaultValue: 'requested',
      index: true,
      options: [
        { label: 'Demandé', value: 'requested' },
        { label: 'Confirmé', value: 'confirmed' },
        { label: 'Terminé', value: 'completed' },
        { label: 'Annulé', value: 'cancelled' },
        { label: 'Absence', value: 'no_show' },
      ],
      access: { create: staffWriteOnly, update: staffWriteOnly },
      admin: { position: 'sidebar' },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'startAt',
          type: 'date',
          label: 'Début (UTC)',
          required: true,
          index: true,
          access: { create: serverWriteOnly, update: staffWriteOnly },
          admin: { date: { pickerAppearance: 'dayAndTime' } },
        },
        {
          name: 'endAt',
          type: 'date',
          label: 'Fin (UTC)',
          required: true,
          access: { create: serverWriteOnly, update: staffWriteOnly },
          admin: { date: { pickerAppearance: 'dayAndTime' } },
        },
      ],
    },
    {
      name: 'customerTimezone',
      type: 'text',
      label: 'Fuseau du client',
      required: true,
      defaultValue: 'America/Toronto',
      maxLength: 64,
      access: { create: serverWriteOnly, update: staffWriteOnly },
      admin: { description: 'Sert uniquement à l’affichage : la donnée reste en UTC.' },
    },
    {
      name: 'objective',
      type: 'textarea',
      label: 'Objectif de la rencontre',
      required: true,
      maxLength: 2000,
    },
    {
      name: 'meetingUrl',
      type: 'text',
      label: 'Lien de visioconférence',
      maxLength: 500,
      access: { create: staffWriteOnly, update: staffWriteOnly },
      validate: (value: string | null | undefined) => {
        if (!value) return true
        if (!/^https:\/\//i.test(value)) return 'Le lien doit commencer par https://.'
        return true
      },
    },
    {
      name: 'links',
      type: 'group',
      label: 'Rattachements',
      access: { create: staffWriteOnly, update: staffWriteOnly },
      fields: [
        {
          name: 'quoteRequest',
          type: 'relationship',
          relationTo: 'quoteRequests',
          label: 'Demande de devis',
        },
        { name: 'project', type: 'relationship', relationTo: 'clientProjects', label: 'Projet' },
        { name: 'invoice', type: 'relationship', relationTo: 'invoices', label: 'Facture' },
      ],
    },
    {
      name: 'rescheduledFrom',
      type: 'date',
      label: 'Précédemment prévu le',
      access: { create: serverWriteOnly, update: serverWriteOnly },
      admin: { readOnly: true },
    },
    {
      name: 'cancellationReason',
      type: 'textarea',
      label: 'Motif d’annulation',
      maxLength: 1000,
    },
    {
      name: 'notificationState',
      type: 'group',
      label: 'Notifications',
      access: { create: serverWriteOnly, update: serverWriteOnly },
      admin: {
        readOnly: true,
        description:
          'Reflète l’envoi réel des courriels. Un échec est consigné tel quel, jamais masqué en succès.',
      },
      fields: [
        { name: 'lastAttemptAt', type: 'date', label: 'Dernière tentative' },
        {
          name: 'lastResult',
          type: 'select',
          label: 'Résultat',
          options: [
            { label: 'Envoyé', value: 'sent' },
            { label: 'Échec', value: 'failed' },
            { label: 'Non configuré', value: 'not_configured' },
          ],
        },
        { name: 'lastError', type: 'text', label: 'Détail', maxLength: 300 },
      ],
    },
    {
      name: 'internalNotes',
      type: 'textarea',
      label: 'Notes internes',
      maxLength: 4000,
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
          next.reference = `RDV-${stamp.getFullYear()}${String(stamp.getMonth() + 1).padStart(2, '0')}-${random}`
        }

        // --- Garde de transition ----------------------------------------------
        const previous = originalDoc?.status as AppointmentStatus | undefined
        if (previous && next.status && previous !== next.status) {
          const actor = isCMSUser(req.user) ? 'staff' : 'customer'
          if (!canTransitionAppointment(previous, next.status as AppointmentStatus, actor)) {
            throw new Error(
              `Transition refusée : « ${previous} » ne peut pas devenir « ${next.status} ».`,
            )
          }
        }

        // --- Clé d'occupation du créneau ---------------------------------------
        const status = (next.status ?? previous ?? 'requested') as AppointmentStatus
        const host = next.host ?? originalDoc?.host
        const startAt = next.startAt ?? originalDoc?.startAt

        if (ACTIVE_APPOINTMENT_STATUSES.includes(status) && host && startAt) {
          const hostId = typeof host === 'object' ? (host as { id: string }).id : host
          next.slotKey = `${String(hostId)}|${new Date(startAt as string).toISOString()}`
        } else {
          // Retirer la clé libère le créneau. `null` plutôt que `undefined` :
          // Payload doit effacer la valeur en base, et l'index sparse ignore
          // les documents dont le champ est absent ou nul.
          next.slotKey = null
        }

        return next
      },
    ],
  },
  timestamps: true,
}
