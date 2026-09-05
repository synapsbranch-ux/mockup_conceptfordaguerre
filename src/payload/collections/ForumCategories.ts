import type { CollectionConfig } from 'payload'

import { authenticated, isCMSUser } from '../access'
import { slugField } from '../fields/slug'
import { revalidateAfterChange, revalidateAfterDelete } from '../hooks/revalidate'

/**
 * Catégories du forum.
 *
 * Administrées par le personnel uniquement. Une catégorie archivée disparaît du
 * fil public sans que ses discussions soient perdues : l'archivage est
 * réversible, la suppression ne l'est pas.
 */
export const ForumCategories: CollectionConfig = {
  slug: 'forumCategories',
  labels: { singular: 'Catégorie du forum', plural: 'Catégories du forum' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'order', 'archived', 'updatedAt'],
    group: 'Communauté',
    description: 'Rubriques du forum public. L’ordre détermine leur affichage.',
  },
  defaultSort: 'order',
  access: {
    /** Lecture publique, hors catégories archivées. */
    read: ({ req: { user } }) => {
      if (isCMSUser(user)) return true
      return { archived: { not_equals: true } }
    },
    create: authenticated,
    update: authenticated,
    delete: authenticated,
  },
  hooks: {
    afterChange: [revalidateAfterChange('forum')],
    afterDelete: [revalidateAfterDelete('forum')],
  },
  indexes: [{ fields: ['archived', 'order'] }],
  fields: [
    slugField('title'),
    {
      name: 'title',
      type: 'text',
      label: 'Nom',
      required: true,
      maxLength: 80,
    },
    {
      name: 'description',
      type: 'textarea',
      label: 'Description',
      maxLength: 300,
      admin: { description: 'Affichée sous le nom, dans le fil et en tête de la catégorie.' },
    },
    {
      name: 'order',
      type: 'number',
      label: 'Ordre d’affichage',
      defaultValue: 100,
      index: true,
      admin: {
        position: 'sidebar',
        description: 'Les valeurs les plus faibles apparaissent en premier.',
      },
    },
    {
      name: 'color',
      type: 'select',
      label: 'Teinte',
      defaultValue: 'green',
      options: [
        { label: 'Vert', value: 'green' },
        { label: 'Acide', value: 'acid' },
        { label: 'Terre', value: 'earth' },
        { label: 'Ardoise', value: 'slate' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'archived',
      type: 'checkbox',
      label: 'Archivée',
      defaultValue: false,
      index: true,
      admin: {
        position: 'sidebar',
        description: 'Retire la catégorie du fil public sans supprimer ses discussions.',
      },
    },
  ],
  timestamps: true,
}
