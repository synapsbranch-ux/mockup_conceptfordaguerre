import { APIError, type CollectionConfig } from 'payload'

import { anyone, authenticated } from '../access'
import { findMediaReferences } from '../utils/mediaReferences'

/**
 * Bibliothèque de médias.
 *
 * Les binaires ne sont jamais stockés dans le document : ils partent vers
 * GridFS ou S3 selon `MEDIA_STORAGE_DRIVER`. MongoDB ne conserve ici que les
 * métadonnées et les relations.
 */
export const Media: CollectionConfig = {
  slug: 'media',
  labels: { singular: 'Média', plural: 'Médias' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'alt', 'category', 'filename', 'updatedAt'],
    group: 'Bibliothèque',
    description:
      'Toutes les images du site. Le texte alternatif est obligatoire : il est lu par les lecteurs d’écran et affiché si l’image ne charge pas.',
  },
  access: {
    read: anyone,
    create: authenticated,
    update: authenticated,
    delete: authenticated,
  },
  upload: {
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/avif'],
    focalPoint: true,
    adminThumbnail: 'thumbnail',
    // Toutes les déclinaisons sont converties en WebP : un seul format à servir,
    // largement supporté, et cohérent avec les 25 images déjà optimisées.
    formatOptions: { format: 'webp', options: { quality: 82 } },
    imageSizes: [
      {
        name: 'thumbnail',
        width: 320,
        withoutEnlargement: true,
        formatOptions: { format: 'webp', options: { quality: 78 } },
      },
      {
        name: 'card',
        width: 768,
        withoutEnlargement: true,
        formatOptions: { format: 'webp', options: { quality: 80 } },
      },
      {
        name: 'content',
        width: 1200,
        withoutEnlargement: true,
        formatOptions: { format: 'webp', options: { quality: 82 } },
      },
      {
        name: 'hero',
        width: 1920,
        withoutEnlargement: true,
        formatOptions: { format: 'webp', options: { quality: 82 } },
      },
    ],
  },
  hooks: {
    beforeDelete: [
      async ({ req, id }) => {
        const references = await findMediaReferences(req.payload, String(id))
        const published = references.filter((reference) => reference.isPublished)
        if (published.length === 0) return

        const list = published.map((reference) => `• ${reference.label}`).join('\n')
        throw new APIError(
          `Ce média est utilisé par du contenu publié et ne peut pas être supprimé :\n${list}\n\n` +
            'Retirer l’image de ces contenus (ou les dépublier) avant de supprimer le média.',
          400,
          undefined,
          true,
        )
      },
    ],
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      label: 'Titre',
      required: true,
      maxLength: 160,
      admin: { description: 'Nom lisible du média dans la bibliothèque. N’apparaît pas sur le site.' },
    },
    {
      name: 'alt',
      type: 'text',
      label: 'Texte alternatif',
      required: true,
      maxLength: 250,
      admin: {
        description:
          'Décrire ce que montre l’image, en une phrase. Obligatoire pour l’accessibilité et le référencement.',
      },
      validate: (value: string | null | undefined) => {
        if (!value || value.trim().length < 5) {
          return 'Le texte alternatif doit faire au moins 5 caractères et décrire l’image.'
        }
        return true
      },
    },
    {
      name: 'caption',
      type: 'textarea',
      label: 'Légende',
      maxLength: 400,
      admin: { description: 'Affichée sous l’image lorsque le bloc le prévoit.' },
    },
    {
      name: 'credit',
      type: 'text',
      label: 'Crédit / photographe',
      maxLength: 160,
    },
    {
      name: 'category',
      type: 'select',
      label: 'Catégorie',
      defaultValue: 'autre',
      options: [
        { label: 'Portrait', value: 'portrait' },
        { label: 'Parcours et formation', value: 'parcours' },
        { label: 'Projet', value: 'projet' },
        { label: 'Datakle', value: 'datakle' },
        { label: 'Haïti et engagement', value: 'engagement' },
        { label: 'Illustration', value: 'illustration' },
        { label: 'Autre', value: 'autre' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'tags',
      type: 'array',
      label: 'Étiquettes',
      labels: { singular: 'Étiquette', plural: 'Étiquettes' },
      admin: { position: 'sidebar', description: 'Facilite la recherche dans la bibliothèque.' },
      fields: [{ name: 'label', type: 'text', label: 'Étiquette', required: true, maxLength: 40 }],
    },
    {
      name: 'notes',
      type: 'textarea',
      label: 'Notes internes',
      maxLength: 800,
      admin: {
        description: 'Visible uniquement dans le CMS. Jamais publié.',
      },
    },
  ],
  timestamps: true,
}
