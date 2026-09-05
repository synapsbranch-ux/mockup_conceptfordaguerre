import type { CollectionConfig } from 'payload'

import { authenticated, authenticatedOrPublished } from '../access'
import { layoutBlocks } from '../blocks'
import { seoField } from '../fields/seo'
import { slugField } from '../fields/slug'
import { revalidateAfterChange, revalidateAfterDelete } from '../hooks/revalidate'
import { generatePreviewURL } from '../utils/preview'

/**
 * Pages du site, composées de blocs réordonnables.
 *
 * Le champ `template` ne change pas la mise en page — celle-ci vient
 * uniquement des blocs — mais sert de repère éditorial et permet au frontend
 * de retrouver une page structurante (accueil, contact…) sans dépendre du slug.
 */
export const Pages: CollectionConfig = {
  slug: 'pages',
  labels: { singular: 'Page', plural: 'Pages' },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'slug', 'template', '_status', 'updatedAt'],
    group: 'Contenu',
    description:
      'Chaque page est une suite de sections que l’on peut ajouter, réordonner par glisser-déposer, masquer ou supprimer.',
    preview: (doc) => generatePreviewURL('pages', doc?.slug as string | undefined),
    livePreview: {
      url: ({ data }) => generatePreviewURL('pages', data?.slug as string | undefined) ?? '',
    },
  },
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
    afterChange: [revalidateAfterChange('pages')],
    afterDelete: [revalidateAfterDelete('pages')],
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      label: 'Nom interne',
      required: true,
      maxLength: 120,
      admin: {
        description: 'Sert uniquement à repérer la page dans le CMS. N’apparaît pas sur le site.',
      },
    },
    slugField('name'),
    {
      name: 'template',
      type: 'select',
      label: 'Gabarit',
      required: true,
      defaultValue: 'standard',
      options: [
        { label: 'Page standard', value: 'standard' },
        { label: 'Accueil', value: 'home' },
        { label: 'À propos', value: 'about' },
        { label: 'Réalisations (index)', value: 'projects-landing' },
        { label: 'Services', value: 'services-landing' },
        { label: 'Blog (index)', value: 'blog-landing' },
        { label: 'Contact', value: 'contact' },
        { label: 'Engagement social', value: 'social' },
        { label: 'Informations légales', value: 'legal' },
        { label: 'Espace utilisateur', value: 'user-space' },
      ],
      admin: {
        position: 'sidebar',
        description: 'Repère éditorial. La mise en page réelle vient des sections ci-contre.',
      },
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
      name: 'darkHeader',
      type: 'checkbox',
      label: 'En-tête transparent sur fond sombre',
      defaultValue: false,
      admin: {
        position: 'sidebar',
        description:
          'À activer pour les pages dont la première section est une bannière pleine hauteur.',
      },
    },
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Contenu',
          description: 'Titre public et sections composant la page.',
          fields: [
            {
              name: 'title',
              type: 'text',
              label: 'Titre public',
              required: true,
              maxLength: 160,
              admin: {
                description:
                  'Utilisé pour l’onglet du navigateur et le référencement, pas nécessairement affiché tel quel.',
              },
            },
            {
              name: 'layout',
              type: 'blocks',
              label: 'Sections',
              labels: { singular: 'Section', plural: 'Sections' },
              blocks: layoutBlocks,
              admin: {
                description:
                  'Glisser-déposer pour réordonner. Décocher « Section visible » masque une section sans la perdre.',
              },
            },
          ],
        },
        {
          label: 'Référencement',
          fields: [seoField],
        },
      ],
    },
  ],
  timestamps: true,
}
