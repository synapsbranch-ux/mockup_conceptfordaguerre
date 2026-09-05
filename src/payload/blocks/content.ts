import type { Block } from 'payload'

import { blockBaseFields, variantField } from '../fields/blockBase'
import { headlineField } from '../fields/headline'
import { imageFields } from '../fields/media'
import { linkField } from '../fields/link'

/** Corps de texte libre en Lexical. */
export const RichTextBlock: Block = {
  slug: 'richText',
  interfaceName: 'RichTextBlock',
  labels: { singular: 'Texte enrichi', plural: 'Textes enrichis' },
  fields: [
    ...blockBaseFields,
    variantField(
      [
        { label: 'Colonne étroite (lecture)', value: 'narrow' },
        { label: 'Pleine largeur', value: 'wide' },
      ],
      'narrow',
    ),
    { name: 'content', type: 'richText', label: 'Contenu', required: true },
  ],
}

/** Image seule, cadrée par la grille du site. */
export const ImageBlock: Block = {
  slug: 'image',
  interfaceName: 'ImageBlock',
  labels: { singular: 'Image', plural: 'Images' },
  fields: [
    ...blockBaseFields,
    variantField(
      [
        { label: 'Cadrée dans la grille', value: 'contained' },
        { label: 'Pleine largeur', value: 'full' },
      ],
      'contained',
    ),
    ...imageFields({ required: true }),
    { name: 'caption', type: 'text', label: 'Légende affichée', maxLength: 200 },
  ],
}

/**
 * Bloc image + texte, décliné selon les cinq traitements visuels déjà présents
 * dans la feuille de style (`.origin-split`, `.about-lead`, `.services-hero`,
 * `.vision-panel`, `.education-panel`).
 */
export const ImageTextBlock: Block = {
  slug: 'imageText',
  interfaceName: 'ImageTextBlock',
  labels: { singular: 'Image et texte', plural: 'Images et textes' },
  fields: [
    ...blockBaseFields,
    variantField(
      [
        { label: 'Bandeau scindé sombre (origine)', value: 'origin' },
        { label: 'Portrait et biographie', value: 'about-lead' },
        { label: 'Bandeau de mission', value: 'services-hero' },
        { label: 'Panneau vision (fond vert)', value: 'vision' },
        { label: 'Panneau transmission (fond vert)', value: 'education' },
      ],
      'origin',
    ),
    {
      name: 'imagePosition',
      type: 'select',
      label: 'Position de l’image',
      defaultValue: 'left',
      options: [
        { label: 'À gauche', value: 'left' },
        { label: 'À droite', value: 'right' },
      ],
    },
    ...imageFields({ required: true }),
    { name: 'eyebrow', type: 'text', label: 'Surtitre', maxLength: 60 },
    headlineField({ label: 'Titre', required: false }),
    {
      name: 'lead',
      type: 'textarea',
      label: 'Paragraphe d’accroche',
      maxLength: 500,
      admin: { description: 'Affiché en corps plus grand. Facultatif.' },
    },
    {
      name: 'paragraphs',
      type: 'array',
      label: 'Paragraphes',
      labels: { singular: 'Paragraphe', plural: 'Paragraphes' },
      fields: [{ name: 'text', type: 'textarea', label: 'Texte', required: true, maxLength: 900 }],
    },
    {
      name: 'note',
      type: 'group',
      label: 'Encart « à compléter »',
      admin: {
        description:
          'Affiché à l’intérieur de la colonne de texte, sous les paragraphes. Sert à signaler une information encore à valider.',
      },
      fields: [
        { name: 'enabled', type: 'checkbox', label: 'Afficher l’encart', defaultValue: false },
        {
          name: 'label',
          type: 'text',
          label: 'Étiquette',
          maxLength: 80,
          admin: { condition: (_d, s) => Boolean(s?.enabled) },
        },
        {
          name: 'text',
          type: 'textarea',
          label: 'Texte',
          maxLength: 700,
          admin: { condition: (_d, s) => Boolean(s?.enabled) },
        },
      ],
    },
    { name: 'showLink', type: 'checkbox', label: 'Afficher un bouton', defaultValue: false },
    linkField({
      name: 'link',
      label: 'Bouton',
      condition: (_data, siblingData) => Boolean(siblingData?.showLink),
    }),
  ],
}

/** Citation éditoriale, avec ou sans image d'accompagnement. */
export const QuoteBlock: Block = {
  slug: 'quote',
  interfaceName: 'QuoteBlock',
  labels: { singular: 'Citation', plural: 'Citations' },
  fields: [
    ...blockBaseFields,
    variantField(
      [
        { label: 'Image large + citation superposée', value: 'engagement' },
        { label: 'Citation seule', value: 'plain' },
      ],
      'engagement',
    ),
    ...imageFields({
      label: 'Image d’accompagnement',
      description: 'Requise pour la variante « image large ».',
    }),
    { name: 'label', type: 'text', label: 'Libellé au-dessus de la citation', maxLength: 60 },
    { name: 'quote', type: 'textarea', label: 'Citation', required: true, maxLength: 600 },
    { name: 'attribution', type: 'text', label: 'Attribution', maxLength: 120 },
  ],
}

/**
 * Encart « à confirmer ».
 *
 * Centralise dans le CMS toutes les mentions provisoires du prototype
 * (`.about-note`, `.prototype-note`, `.legal-warning`, `.article-draft-note`,
 * `.prototype-caption`) afin qu'aucune information manquante ne soit inventée
 * ni figée dans le code.
 */
export const NoticeNoteBlock: Block = {
  slug: 'noticeNote',
  interfaceName: 'NoticeNoteBlock',
  labels: { singular: 'Encart d’information', plural: 'Encarts d’information' },
  fields: [
    ...blockBaseFields,
    variantField(
      [
        { label: 'Encart « à compléter » (fond clair)', value: 'about-note' },
        { label: 'Note de bas de page', value: 'prototype-note' },
        { label: 'Avertissement juridique', value: 'legal-warning' },
        { label: 'Mention de brouillon', value: 'draft-note' },
        { label: 'Légende discrète', value: 'caption' },
      ],
      'prototype-note',
    ),
    {
      name: 'label',
      type: 'text',
      label: 'Étiquette',
      maxLength: 80,
      admin: { description: 'Affichée uniquement par la variante « à compléter ».' },
    },
    { name: 'text', type: 'textarea', label: 'Texte', required: true, maxLength: 700 },
  ],
}

/** Respiration verticale ou filet de séparation. */
export const SpacerBlock: Block = {
  slug: 'spacer',
  interfaceName: 'SpacerBlock',
  labels: { singular: 'Espacement', plural: 'Espacements' },
  fields: [
    ...blockBaseFields,
    variantField(
      [
        { label: 'Petit', value: 'small' },
        { label: 'Moyen', value: 'medium' },
        { label: 'Grand', value: 'large' },
      ],
      'medium',
    ),
    { name: 'divider', type: 'checkbox', label: 'Afficher un filet de séparation', defaultValue: false },
  ],
}
