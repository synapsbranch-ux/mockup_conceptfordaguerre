import type { CollectionConfig } from 'payload'

import { authenticated, authenticatedOrPublished } from '../access'
import { imageFields } from '../fields/media'
import { linkField } from '../fields/link'
import { slugField } from '../fields/slug'
import { revalidateAfterChange, revalidateAfterDelete } from '../hooks/revalidate'

/** Offre de services Datakle. */
export const Services: CollectionConfig = {
  slug: 'services',
  labels: { singular: 'Service', plural: 'Services' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'number', 'order', 'featured', '_status'],
    group: 'Contenu',
    description: 'Prestations affichées sur la page Services et en aperçu sur l’accueil.',
  },
  defaultSort: 'order',
  access: {
    read: authenticatedOrPublished,
    create: authenticated,
    update: authenticated,
    delete: authenticated,
  },
  versions: { drafts: { autosave: { interval: 800 } }, maxPerDoc: 20 },
  hooks: {
    afterChange: [revalidateAfterChange('services')],
    afterDelete: [revalidateAfterDelete('services')],
  },
  fields: [
    slugField('title'),
    {
      name: 'order',
      type: 'number',
      label: 'Ordre d’affichage',
      defaultValue: 100,
      admin: { position: 'sidebar' },
    },
    {
      name: 'featured',
      type: 'checkbox',
      label: 'Mettre à la une',
      defaultValue: false,
      admin: { position: 'sidebar' },
    },
    { name: 'title', type: 'text', label: 'Nom du service', required: true, maxLength: 120 },
    {
      name: 'number',
      type: 'text',
      label: 'Numéro affiché',
      maxLength: 4,
      admin: { description: 'Ex. « 01 ».' },
    },
    {
      name: 'summary',
      type: 'textarea',
      label: 'Description courte',
      required: true,
      maxLength: 500,
      admin: { description: 'Affichée dans l’aperçu de l’accueil et dans la fiche détaillée.' },
    },
    {
      name: 'description',
      type: 'textarea',
      label: 'Description complète',
      maxLength: 1200,
    },
    ...imageFields({ name: 'image', label: 'Icône ou image' }),
    {
      name: 'deliverables',
      type: 'array',
      label: 'Livrables',
      labels: { singular: 'Livrable', plural: 'Livrables' },
      fields: [{ name: 'label', type: 'text', label: 'Libellé', required: true, maxLength: 80 }],
    },
    {
      name: 'benefits',
      type: 'array',
      label: 'Bénéfices',
      labels: { singular: 'Bénéfice', plural: 'Bénéfices' },
      fields: [{ name: 'label', type: 'text', label: 'Libellé', required: true, maxLength: 140 }],
    },
    {
      name: 'technologies',
      type: 'array',
      label: 'Technologies',
      labels: { singular: 'Technologie', plural: 'Technologies' },
      fields: [{ name: 'label', type: 'text', label: 'Nom', required: true, maxLength: 60 }],
    },
    { name: 'showCta', type: 'checkbox', label: 'Afficher un appel à l’action', defaultValue: false },
    linkField({
      name: 'cta',
      label: 'Appel à l’action',
      condition: (_data, siblingData) => Boolean(siblingData?.showCta),
    }),
  ],
  timestamps: true,
}
