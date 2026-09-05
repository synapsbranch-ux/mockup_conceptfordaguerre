import type { CollectionConfig } from 'payload'

import { authenticated, isCMSUser } from '../access'

/**
 * Exceptions de disponibilite : dates bloquees ou plages ajoutees.
 *
 * Une exception prime toujours sur la regle hebdomadaire correspondante.
 */
export const AvailabilityExceptions: CollectionConfig = {
  slug: 'availabilityExceptions',
  labels: { singular: 'Exception', plural: 'Exceptions de disponibilité' },
  admin: {
    useAsTitle: 'date',
    defaultColumns: ['host', 'date', 'kind', 'startTime', 'endTime'],
    group: 'Rendez-vous',
    description: 'Jours bloques ou plages exceptionnelles. Priment sur les regles hebdomadaires.',
  },
  defaultSort: 'date',
  access: {
    read: ({ req: { user } }) => isCMSUser(user),
    create: authenticated,
    update: authenticated,
    delete: authenticated,
  },
  indexes: [{ fields: ['host', 'date'] }],
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
      name: 'date',
      type: 'date',
      label: 'Date',
      required: true,
      index: true,
      admin: { date: { pickerAppearance: 'dayOnly' } },
    },
    {
      name: 'kind',
      type: 'select',
      label: 'Nature',
      required: true,
      defaultValue: 'blocked',
      options: [
        { label: 'Journée bloquée', value: 'blocked' },
        { label: 'Plage bloquée', value: 'blocked_range' },
        { label: 'Plage exceptionnelle ouverte', value: 'extra' },
      ],
    },
    {
      type: 'row',
      admin: { condition: (data) => data?.kind !== 'blocked' },
      fields: [
        { name: 'startTime', type: 'text', label: 'Début (HH:MM)', maxLength: 5 },
        { name: 'endTime', type: 'text', label: 'Fin (HH:MM)', maxLength: 5 },
      ],
    },
    {
      name: 'timezone',
      type: 'text',
      label: 'Fuseau horaire',
      required: true,
      defaultValue: 'America/Toronto',
      maxLength: 64,
    },
    { name: 'reason', type: 'text', label: 'Motif', maxLength: 200 },
  ],
  timestamps: true,
}
