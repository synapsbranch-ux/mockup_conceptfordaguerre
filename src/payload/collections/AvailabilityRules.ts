import type { CollectionConfig } from 'payload'

import { authenticated, isCMSUser } from '../access'

/**
 * Regles de disponibilite hebdomadaires.
 *
 * Une regle decrit une plage recurrente pour un jour de la semaine, exprimee
 * dans le fuseau de l'hote. Le calcul des creneaux les combine avec les
 * exceptions et les rendez-vous deja pris.
 */
export const AvailabilityRules: CollectionConfig = {
  slug: 'availabilityRules',
  labels: { singular: 'Plage de disponibilité', plural: 'Disponibilités hebdomadaires' },
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['host', 'weekday', 'startTime', 'endTime', 'active'],
    group: 'Rendez-vous',
    description: 'Plages recurrentes, exprimees dans le fuseau de l’hote.',
  },
  access: {
    read: ({ req: { user } }) => isCMSUser(user),
    create: authenticated,
    update: authenticated,
    delete: authenticated,
  },
  indexes: [{ fields: ['host', 'weekday', 'active'] }],
  fields: [
    {
      name: 'host',
      type: 'relationship',
      relationTo: 'users',
      label: 'Hôte',
      required: true,
      index: true,
    },
    {
      name: 'weekday',
      type: 'select',
      label: 'Jour',
      required: true,
      index: true,
      options: [
        { label: 'Lundi', value: '1' },
        { label: 'Mardi', value: '2' },
        { label: 'Mercredi', value: '3' },
        { label: 'Jeudi', value: '4' },
        { label: 'Vendredi', value: '5' },
        { label: 'Samedi', value: '6' },
        { label: 'Dimanche', value: '0' },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'startTime',
          type: 'text',
          label: 'Début (HH:MM)',
          required: true,
          defaultValue: '09:00',
          validate: (value: string | null | undefined) =>
            /^([01]\d|2[0-3]):[0-5]\d$/.test(value ?? '') || 'Format attendu : HH:MM, ex. 09:00.',
        },
        {
          name: 'endTime',
          type: 'text',
          label: 'Fin (HH:MM)',
          required: true,
          defaultValue: '17:00',
          validate: (value: string | null | undefined) =>
            /^([01]\d|2[0-3]):[0-5]\d$/.test(value ?? '') || 'Format attendu : HH:MM, ex. 17:00.',
        },
      ],
    },
    {
      name: 'timezone',
      type: 'text',
      label: 'Fuseau horaire',
      required: true,
      defaultValue: 'America/Toronto',
      maxLength: 64,
      admin: { description: 'Identifiant IANA. Les heures ci-dessus s’y rapportent.' },
    },
    {
      name: 'active',
      type: 'checkbox',
      label: 'Active',
      defaultValue: true,
      index: true,
    },
  ],
  timestamps: true,
}
