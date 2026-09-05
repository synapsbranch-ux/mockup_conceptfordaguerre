import type { CollectionConfig } from 'payload'

import { authenticated, authenticatedOrPublished } from '../access'
import { imageFields } from '../fields/media'
import { seoField } from '../fields/seo'
import { slugField } from '../fields/slug'
import { revalidateAfterChange, revalidateAfterDelete } from '../hooks/revalidate'
import { generatePreviewURL } from '../utils/preview'

/** Études de cas publiées sous `/projects/[slug]`. */
export const Projects: CollectionConfig = {
  slug: 'projects',
  labels: { singular: 'Projet', plural: 'Projets' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'type', 'order', 'featured', '_status', 'updatedAt'],
    group: 'Contenu',
    description: 'Réalisations présentées dans l’index et sur une fiche détaillée.',
    preview: (doc) => generatePreviewURL('projects', doc?.slug as string | undefined),
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
    afterChange: [revalidateAfterChange('projects')],
    afterDelete: [revalidateAfterDelete('projects')],
  },
  fields: [
    slugField('title'),
    {
      name: 'order',
      type: 'number',
      label: 'Ordre d’affichage',
      defaultValue: 100,
      admin: {
        position: 'sidebar',
        description: 'Les valeurs les plus faibles apparaissent en premier.',
      },
    },
    {
      name: 'featured',
      type: 'checkbox',
      label: 'Mettre à la une',
      defaultValue: false,
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
      type: 'tabs',
      tabs: [
        {
          label: 'Présentation',
          fields: [
            { name: 'title', type: 'text', label: 'Titre', required: true, maxLength: 160 },
            {
              name: 'number',
              type: 'text',
              label: 'Numéro affiché',
              maxLength: 4,
              admin: { description: 'Repère décoratif dans l’index. Ex. « 01 ».' },
            },
            {
              name: 'type',
              type: 'text',
              label: 'Type de projet',
              maxLength: 80,
              admin: { description: 'Ex. « Visualisation décisionnelle », « Automatisation ».' },
            },
            {
              name: 'summary',
              type: 'textarea',
              label: 'Résumé court',
              required: true,
              maxLength: 400,
              admin: { description: 'Affiché dans les cartes et l’index.' },
            },
            {
              name: 'introduction',
              type: 'textarea',
              label: 'Introduction complète',
              maxLength: 900,
              admin: { description: 'Facultatif. Complète le résumé en haut de la fiche.' },
            },
            ...imageFields({ name: 'cover', label: 'Image de couverture', required: true }),
            {
              name: 'client',
              type: 'text',
              label: 'Client ou organisation',
              maxLength: 160,
              admin: { description: 'À renseigner uniquement si l’information est publiable.' },
            },
            {
              name: 'projectDate',
              type: 'date',
              label: 'Date du projet',
              admin: { date: { pickerAppearance: 'monthOnly', displayFormat: 'MMMM yyyy' } },
            },
          ],
        },
        {
          label: 'Étude de cas',
          description: 'Les quatre sections numérotées de la fiche détaillée.',
          fields: [
            { name: 'context', type: 'textarea', label: 'Contexte', maxLength: 1200 },
            {
              name: 'problem',
              type: 'textarea',
              label: 'Problème',
              required: true,
              maxLength: 1200,
            },
            {
              name: 'method',
              type: 'textarea',
              label: 'Méthodologie',
              required: true,
              maxLength: 1200,
            },
            {
              name: 'result',
              type: 'textarea',
              label: 'Résultats',
              required: true,
              maxLength: 1200,
            },
            {
              name: 'resultNote',
              type: 'text',
              label: 'Mention sous les résultats',
              maxLength: 200,
              admin: {
                description:
                  'Ex. « Résultats chiffrés à confirmer avant publication ». Laisser vide pour ne rien afficher.',
              },
            },
            {
              name: 'learning',
              type: 'textarea',
              label: 'Ce que j’ai appris',
              required: true,
              maxLength: 1200,
            },
            {
              name: 'technologies',
              type: 'array',
              label: 'Technologies',
              labels: { singular: 'Technologie', plural: 'Technologies' },
              fields: [{ name: 'label', type: 'text', label: 'Nom', required: true, maxLength: 60 }],
            },
            {
              name: 'gallery',
              type: 'array',
              label: 'Galerie',
              labels: { singular: 'Image', plural: 'Images' },
              fields: [
                ...imageFields({ required: true }),
                { name: 'caption', type: 'text', label: 'Légende', maxLength: 220 },
              ],
            },
          ],
        },
        {
          label: 'Liens et SEO',
          fields: [
            {
              name: 'relatedProjects',
              type: 'relationship',
              relationTo: 'projects',
              hasMany: true,
              label: 'Projets liés',
              filterOptions: ({ id }) => (id ? { id: { not_equals: id } } : true),
              admin: { description: 'Laisser vide pour enchaîner automatiquement sur le projet suivant.' },
            },
            seoField,
          ],
        },
      ],
    },
  ],
  timestamps: true,
}
