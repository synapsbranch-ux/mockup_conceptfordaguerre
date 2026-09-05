import type { CollectionConfig } from 'payload'

import { authenticated, authenticatedOrPublished } from '../access'
import { articleBlocks } from '../blocks'
import { imageFields } from '../fields/media'
import { seoField } from '../fields/seo'
import { slugField } from '../fields/slug'
import { revalidateAfterChange, revalidateAfterDelete } from '../hooks/revalidate'
import { generatePreviewURL } from '../utils/preview'

/** Articles du blog, publiés sous `/blog/[slug]`. */
export const Articles: CollectionConfig = {
  slug: 'articles',
  labels: { singular: 'Article', plural: 'Articles' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'category', 'order', 'featured', '_status', 'publishedAt'],
    group: 'Contenu',
    description: 'Billets du blog. Un brouillon reste invisible pour les visiteurs jusqu’à sa publication.',
    preview: (doc) => generatePreviewURL('articles', doc?.slug as string | undefined),
  },
  defaultSort: 'order',
  access: {
    read: authenticatedOrPublished,
    create: authenticated,
    update: authenticated,
    delete: authenticated,
  },
  versions: {
    drafts: { autosave: { interval: 800 }, schedulePublish: true },
    maxPerDoc: 30,
  },
  hooks: {
    afterChange: [revalidateAfterChange('articles')],
    afterDelete: [revalidateAfterDelete('articles')],
  },
  fields: [
    slugField('title'),
    {
      name: 'order',
      type: 'number',
      label: 'Ordre d’affichage',
      defaultValue: 100,
      admin: { position: 'sidebar', description: 'Les valeurs les plus faibles apparaissent en premier.' },
    },
    {
      name: 'featured',
      type: 'checkbox',
      label: 'Mettre à la une',
      defaultValue: false,
      admin: { position: 'sidebar' },
    },
    {
      name: 'author',
      type: 'relationship',
      relationTo: 'users',
      label: 'Auteur',
      admin: { position: 'sidebar' },
    },
    {
      name: 'publishedAt',
      type: 'date',
      label: 'Date de publication',
      admin: {
        position: 'sidebar',
        date: { pickerAppearance: 'dayAndTime', displayFormat: 'd MMM yyyy, HH:mm' },
      },
      hooks: {
        beforeChange: [
          ({ siblingData, value }) => {
            if (siblingData?._status === 'published' && !value) return new Date().toISOString()
            return value
          },
        ],
      },
    },
    {
      name: 'publishedLabel',
      type: 'text',
      label: 'Date affichée',
      maxLength: 40,
      admin: {
        position: 'sidebar',
        description:
          'Remplace la date formatée dans les listes. Utile tant qu’un article n’a pas de date ferme. Ex. « À paraître ».',
      },
    },
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Présentation',
          fields: [
            { name: 'title', type: 'text', label: 'Titre', required: true, maxLength: 180 },
            {
              name: 'category',
              type: 'text',
              label: 'Catégorie',
              required: true,
              maxLength: 60,
              admin: { description: 'Ex. « Impact », « Parcours », « Automatisation ».' },
            },
            {
              name: 'tags',
              type: 'array',
              label: 'Étiquettes',
              labels: { singular: 'Étiquette', plural: 'Étiquettes' },
              fields: [{ name: 'label', type: 'text', label: 'Étiquette', required: true, maxLength: 40 }],
            },
            {
              name: 'excerpt',
              type: 'textarea',
              label: 'Extrait',
              required: true,
              maxLength: 500,
              admin: { description: 'Affiché dans les listes et utilisé par défaut comme description SEO.' },
            },
            ...imageFields({ name: 'hero', label: 'Image d’en-tête', required: true }),
            {
              name: 'readingTime',
              type: 'text',
              label: 'Temps de lecture',
              maxLength: 20,
              admin: { description: 'Ex. « 6 min ». Laisser vide pour un calcul automatique depuis le corps.' },
            },
          ],
        },
        {
          label: 'Corps de l’article',
          fields: [
            {
              name: 'lead',
              type: 'textarea',
              label: 'Chapeau',
              maxLength: 600,
              admin: { description: 'Paragraphe d’ouverture affiché en corps plus grand.' },
            },
            { name: 'body', type: 'richText', label: 'Contenu' },
            {
              name: 'blocks',
              type: 'blocks',
              label: 'Sections complémentaires',
              labels: { singular: 'Section', plural: 'Sections' },
              blocks: articleBlocks,
              admin: { description: 'Sections ajoutées à la suite du corps de l’article.' },
            },
          ],
        },
        {
          label: 'Liens et SEO',
          fields: [
            {
              name: 'relatedArticles',
              type: 'relationship',
              relationTo: 'articles',
              hasMany: true,
              label: 'Articles liés',
              filterOptions: ({ id }) => (id ? { id: { not_equals: id } } : true),
            },
            seoField,
          ],
        },
      ],
    },
  ],
  timestamps: true,
}
