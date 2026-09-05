import type { CollectionConfig } from 'payload'

import { authenticated, isCMSUser } from '../access'
import { slugField } from '../fields/slug'

/**
 * Types de rencontres proposés à la réservation.
 *
 * La durée et le temps tampon sont exprimés en minutes et servent au calcul des
 * créneaux, effectué exclusivement côté serveur.
 */
export const MeetingTypes: CollectionConfig = {
  slug: 'meetingTypes',
  labels: { singular: 'Type de rencontre', plural: 'Types de rencontres' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'durationMinutes', 'bufferMinutes', 'active', 'order'],
    group: 'Rendez-vous',
    description: 'Formats de rencontre proposés. Désactiver retire le format sans perdre l’historique.',
  },
  defaultSort: 'order',
  access: {
    read: ({ req: { user } }) => {
      if (isCMSUser(user)) return true
      return { active: { equals: true } }
    },
    create: authenticated,
    update: authenticated,
    delete: authenticated,
  },
  indexes: [{ fields: ['active', 'order'] }],
  fields: [
    slugField('title'),
    { name: 'title', type: 'text', label: 'Intitulé', required: true, maxLength: 120 },
    {
      name: 'description',
      type: 'textarea',
      label: 'Description',
      maxLength: 1000,
      admin: { description: 'Affichée au client au moment de choisir un format.' },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'durationMinutes',
          type: 'number',
          label: 'Durée (minutes)',
          required: true,
          defaultValue: 30,
          min: 5,
          max: 480,
        },
        {
          name: 'bufferMinutes',
          type: 'number',
          label: 'Tampon après (minutes)',
          defaultValue: 15,
          min: 0,
          max: 240,
          admin: { description: 'Temps réservé après la rencontre, non proposé à la réservation.' },
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'minimumNoticeHours',
          type: 'number',
          label: 'Préavis minimal (heures)',
          defaultValue: 24,
          min: 0,
          admin: { description: 'Aucun créneau n’est proposé en deçà de ce délai.' },
        },
        {
          name: 'horizonDays',
          type: 'number',
          label: 'Horizon de réservation (jours)',
          defaultValue: 60,
          min: 1,
          max: 365,
        },
      ],
    },
    {
      name: 'host',
      type: 'relationship',
      relationTo: 'users',
      label: 'Hôte',
      required: true,
      index: true,
      admin: {
        position: 'sidebar',
        description: 'Personne dont les disponibilités et le calendrier sont consultés.',
      },
    },
    {
      name: 'locationKind',
      type: 'select',
      label: 'Modalité',
      defaultValue: 'video',
      options: [
        { label: 'Visioconférence', value: 'video' },
        { label: 'Téléphone', value: 'phone' },
        { label: 'Sur place', value: 'in_person' },
      ],
    },
    {
      name: 'requiresConfirmation',
      type: 'checkbox',
      label: 'Confirmation manuelle requise',
      defaultValue: true,
      admin: {
        position: 'sidebar',
        description:
          'Coché, la réservation arrive en « demandée » et attend une confirmation.',
      },
    },
    {
      name: 'active',
      type: 'checkbox',
      label: 'Proposé à la réservation',
      defaultValue: true,
      index: true,
      admin: { position: 'sidebar' },
    },
    {
      name: 'order',
      type: 'number',
      label: 'Ordre',
      defaultValue: 100,
      admin: { position: 'sidebar' },
    },
  ],
  timestamps: true,
}
