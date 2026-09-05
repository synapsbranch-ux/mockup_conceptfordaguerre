import type { CollectionConfig } from 'payload'

import { authenticated, authenticatedOrPublished } from '../access'
import { imageFields } from '../fields/media'
import { linkField } from '../fields/link'
import { slugField } from '../fields/slug'
import { revalidateAfterChange, revalidateAfterDelete } from '../hooks/revalidate'

/** Engagements sociaux présentés sur la page Engagement. */
export const Commitments: CollectionConfig = {
  slug: 'commitments',
  labels: { singular: 'Engagement', plural: 'Engagements' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'number', 'category', 'order', '_status'],
    group: 'Contenu',
    description: 'Causes et initiatives portées, affichées sur la page Engagement social.',
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
    afterChange: [revalidateAfterChange('commitments')],
    afterDelete: [revalidateAfterDelete('commitments')],
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
    { name: 'title', type: 'text', label: 'Titre', required: true, maxLength: 140 },
    { name: 'number', type: 'text', label: 'Numéro affiché', maxLength: 4 },
    {
      name: 'category',
      type: 'select',
      label: 'Catégorie',
      defaultValue: 'developpement',
      options: [
        { label: 'Développement d’Haïti', value: 'developpement' },
        { label: 'Éducation et mentorat', value: 'education' },
        { label: 'Démocratisation de la donnée', value: 'democratisation' },
        { label: 'Initiatives communautaires', value: 'communaute' },
        { label: 'Valeurs humaines', value: 'valeurs' },
        { label: 'Innovation responsable', value: 'innovation' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'summary',
      type: 'textarea',
      label: 'Résumé',
      required: true,
      maxLength: 600,
    },
    { name: 'content', type: 'richText', label: 'Contenu détaillé' },
    ...imageFields({ name: 'image', label: 'Image' }),
    { name: 'showCta', type: 'checkbox', label: 'Afficher un appel à l’action', defaultValue: false },
    linkField({
      name: 'cta',
      label: 'Appel à l’action',
      condition: (_data, siblingData) => Boolean(siblingData?.showCta),
    }),
  ],
  timestamps: true,
}
