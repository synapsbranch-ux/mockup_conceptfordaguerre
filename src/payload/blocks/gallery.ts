import type { Block } from 'payload'

import { blockBaseFields, variantField } from '../fields/blockBase'
import { headlineField } from '../fields/headline'
import { imageFields } from '../fields/media'
import { sectionHeadingField } from '../fields/sectionHeading'

/**
 * Mosaïque éditoriale de quatre images (`.home-gallery-grid`).
 * Les tailles disponibles reproduisent exactement la grille existante :
 * une image haute, deux carrées, une large.
 */
export const GalleryFourBlock: Block = {
  slug: 'galleryFour',
  interfaceName: 'GalleryFourBlock',
  labels: { singular: 'Mosaïque de quatre images', plural: 'Mosaïques de quatre images' },
  fields: [
    ...blockBaseFields,
    sectionHeadingField(),
    {
      name: 'items',
      type: 'array',
      label: 'Images',
      labels: { singular: 'Image', plural: 'Images' },
      minRows: 4,
      maxRows: 4,
      admin: { description: 'Exactement quatre images, dans l’ordre d’affichage de la mosaïque.' },
      fields: [
        ...imageFields({ required: true }),
        {
          type: 'row',
          fields: [
            { name: 'number', type: 'text', label: 'Numéro', maxLength: 4, admin: { width: '30%' } },
            { name: 'caption', type: 'text', label: 'Légende', maxLength: 120, admin: { width: '70%' } },
          ],
        },
        {
          name: 'size',
          type: 'select',
          label: 'Format dans la mosaïque',
          defaultValue: 'normal',
          options: [
            { label: 'Haute (colonne de gauche)', value: 'tall' },
            { label: 'Carrée', value: 'normal' },
            { label: 'Large (pleine rangée)', value: 'wide' },
          ],
        },
      ],
    },
  ],
}

/** Galerie générique, en grille libre ou en diptyque de jalons. */
export const GalleryBlock: Block = {
  slug: 'gallery',
  interfaceName: 'GalleryBlock',
  labels: { singular: 'Galerie', plural: 'Galeries' },
  fields: [
    ...blockBaseFields,
    variantField(
      [
        { label: 'Diptyque de jalons', value: 'milestones' },
        { label: 'Grille régulière', value: 'grid' },
      ],
      'milestones',
    ),
    {
      name: 'items',
      type: 'array',
      label: 'Images',
      labels: { singular: 'Image', plural: 'Images' },
      minRows: 1,
      fields: [
        ...imageFields({ required: true }),
        { name: 'caption', type: 'text', label: 'Légende', maxLength: 220 },
      ],
    },
  ],
}

/** Indicateurs chiffrés. */
export const MetricsBlock: Block = {
  slug: 'metrics',
  interfaceName: 'MetricsBlock',
  labels: { singular: 'Indicateurs', plural: 'Indicateurs' },
  fields: [
    ...blockBaseFields,
    sectionHeadingField(),
    {
      name: 'items',
      type: 'array',
      label: 'Indicateurs',
      labels: { singular: 'Indicateur', plural: 'Indicateurs' },
      minRows: 1,
      maxRows: 6,
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'value', type: 'text', label: 'Valeur', required: true, maxLength: 16, admin: { width: '30%' } },
            { name: 'label', type: 'text', label: 'Libellé', required: true, maxLength: 80, admin: { width: '70%' } },
          ],
        },
        { name: 'description', type: 'textarea', label: 'Précision', maxLength: 240 },
      ],
    },
  ],
}

/** Fil du parcours (`.journey-list`) : étapes numérotées avec vignette. */
export const TimelineBlock: Block = {
  slug: 'timeline',
  interfaceName: 'TimelineBlock',
  labels: { singular: 'Parcours chronologique', plural: 'Parcours chronologiques' },
  fields: [
    ...blockBaseFields,
    { name: 'eyebrow', type: 'text', label: 'Surtitre', maxLength: 60 },
    headlineField({ label: 'Titre', required: false }),
    {
      name: 'items',
      type: 'array',
      label: 'Étapes',
      labels: { singular: 'Étape', plural: 'Étapes' },
      minRows: 1,
      admin: { description: 'La numérotation est générée automatiquement selon l’ordre.' },
      fields: [
        { name: 'title', type: 'text', label: 'Titre de l’étape', required: true, maxLength: 120 },
        { name: 'text', type: 'textarea', label: 'Description', required: true, maxLength: 600 },
        ...imageFields({ label: 'Vignette', required: true }),
      ],
    },
  ],
}

/** Liste de valeurs : pastilles dans une colonne, ou bandeau défilant. */
export const ValuesListBlock: Block = {
  slug: 'valuesList',
  interfaceName: 'ValuesListBlock',
  labels: { singular: 'Liste de valeurs', plural: 'Listes de valeurs' },
  fields: [
    ...blockBaseFields,
    variantField(
      [
        { label: 'Colonne avec texte d’accompagnement', value: 'about-grid' },
        { label: 'Bandeau défilant', value: 'marquee' },
        { label: 'Pastilles seules', value: 'stack' },
      ],
      'about-grid',
    ),
    {
      name: 'eyebrow',
      type: 'text',
      label: 'Surtitre',
      maxLength: 60,
      admin: { condition: (_d, s) => s?.variant !== 'marquee' },
    },
    headlineField({ label: 'Titre', required: false }),
    {
      name: 'paragraphs',
      type: 'array',
      label: 'Paragraphes d’accompagnement',
      labels: { singular: 'Paragraphe', plural: 'Paragraphes' },
      admin: { condition: (_d, s) => s?.variant === 'about-grid' },
      fields: [{ name: 'text', type: 'textarea', label: 'Texte', required: true, maxLength: 900 }],
    },
    {
      name: 'values',
      type: 'array',
      label: 'Valeurs',
      labels: { singular: 'Valeur', plural: 'Valeurs' },
      minRows: 1,
      fields: [{ name: 'label', type: 'text', label: 'Libellé', required: true, maxLength: 60 }],
    },
    {
      name: 'ariaLabel',
      type: 'text',
      label: 'Description pour lecteurs d’écran',
      maxLength: 80,
      admin: { condition: (_d, s) => s?.variant === 'marquee' },
    },
  ],
}
