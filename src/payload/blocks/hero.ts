import type { Block } from 'payload'

import { blockBaseFields } from '../fields/blockBase'
import { headlineField } from '../fields/headline'
import { imageFields } from '../fields/media'
import { linkField } from '../fields/link'

/** Bannière pleine hauteur de la page d'accueil (`.hero`). */
export const HeroBlock: Block = {
  slug: 'hero',
  interfaceName: 'HeroBlock',
  labels: { singular: 'Bannière d’accueil', plural: 'Bannières d’accueil' },
  imageAltText: 'Bannière pleine hauteur avec image de fond, titre et boutons.',
  fields: [
    ...blockBaseFields,
    {
      name: 'kicker',
      type: 'text',
      label: 'Accroche',
      maxLength: 90,
      admin: { description: 'Ligne courte au-dessus du titre. Ex. « Analyste de données · Québec / Haïti ».' },
    },
    headlineField({ label: 'Titre principal' }),
    {
      name: 'copy',
      type: 'textarea',
      label: 'Texte d’introduction',
      maxLength: 400,
    },
    ...imageFields({
      name: 'image',
      label: 'Image de fond',
      required: true,
      description: 'Format paysage large. Un calque sombre est appliqué automatiquement pour garantir la lisibilité du texte.',
    }),
    {
      name: 'buttons',
      type: 'array',
      label: 'Boutons',
      labels: { singular: 'Bouton', plural: 'Boutons' },
      maxRows: 2,
      fields: [
        linkField({ name: 'link', label: 'Destination' }),
        {
          type: 'row',
          fields: [
            {
              name: 'style',
              type: 'select',
              label: 'Style',
              defaultValue: 'accent',
              options: [
                { label: 'Accent (fond vert clair)', value: 'accent' },
                { label: 'Contour clair', value: 'ghost' },
                { label: 'Fond blanc', value: 'light' },
                { label: 'Fond sombre', value: 'dark' },
              ],
              admin: { width: '60%' },
            },
            {
              name: 'showArrow',
              type: 'checkbox',
              label: 'Afficher la flèche',
              defaultValue: true,
              admin: { width: '40%' },
            },
          ],
        },
      ],
    },
    {
      name: 'metric',
      type: 'group',
      label: 'Encart chiffré',
      admin: { description: 'Vignette décorative superposée à la bannière.' },
      fields: [
        { name: 'enabled', type: 'checkbox', label: 'Afficher l’encart', defaultValue: true },
        {
          name: 'label',
          type: 'text',
          label: 'Libellé',
          maxLength: 40,
          admin: { condition: (_d, s) => Boolean(s?.enabled) },
        },
        {
          name: 'value',
          type: 'text',
          label: 'Valeur mise en avant',
          maxLength: 16,
          admin: { condition: (_d, s) => Boolean(s?.enabled) },
        },
        {
          name: 'steps',
          type: 'array',
          label: 'Étapes affichées sous la courbe',
          labels: { singular: 'Étape', plural: 'Étapes' },
          maxRows: 4,
          admin: { condition: (_d, s) => Boolean(s?.enabled) },
          fields: [{ name: 'label', type: 'text', label: 'Libellé', required: true, maxLength: 24 }],
        },
        {
          name: 'ariaLabel',
          type: 'text',
          label: 'Description pour lecteurs d’écran',
          maxLength: 160,
          admin: {
            condition: (_d, s) => Boolean(s?.enabled) ,
            description: 'La courbe est décorative : cette description la rend compréhensible sans la voir.',
          },
        },
      ],
    },
    {
      name: 'scrollCue',
      type: 'group',
      label: 'Invitation à défiler',
      fields: [
        { name: 'enabled', type: 'checkbox', label: 'Afficher', defaultValue: true },
        {
          name: 'label',
          type: 'text',
          label: 'Libellé',
          maxLength: 30,
          admin: { condition: (_d, s) => Boolean(s?.enabled) },
        },
        {
          name: 'anchor',
          type: 'text',
          label: 'Ancre de destination',
          maxLength: 60,
          admin: {
            condition: (_d, s) => Boolean(s?.enabled),
            description: 'Identifiant de la section visée, sans le dièse. Ex. « approche ».',
          },
        },
      ],
    },
  ],
}

/** En-tête éditorial des pages intérieures (`.page-intro`). */
export const PageIntroBlock: Block = {
  slug: 'pageIntro',
  interfaceName: 'PageIntroBlock',
  labels: { singular: 'Introduction de page', plural: 'Introductions de page' },
  fields: [
    ...blockBaseFields,
    { name: 'eyebrow', type: 'text', label: 'Surtitre', maxLength: 60 },
    {
      name: 'number',
      type: 'text',
      label: 'Numéro de page',
      maxLength: 4,
      admin: { description: 'Repère décoratif affiché à côté de la description. Ex. « 01 ».' },
    },
    headlineField({ label: 'Titre de page' }),
    { name: 'description', type: 'textarea', label: 'Description', maxLength: 500 },
  ],
}

/** Manifeste typographique de la page d'accueil (`.statement`). */
export const StatementBlock: Block = {
  slug: 'statement',
  interfaceName: 'StatementBlock',
  labels: { singular: 'Déclaration', plural: 'Déclarations' },
  fields: [
    ...blockBaseFields,
    {
      name: 'anchor',
      type: 'text',
      label: 'Ancre',
      maxLength: 60,
      admin: { description: 'Permet de cibler cette section depuis un lien. Ex. « approche ».' },
    },
    { name: 'eyebrow', type: 'text', label: 'Surtitre', maxLength: 60 },
    headlineField({ name: 'statement', label: 'Déclaration', maxRows: 10 }),
    {
      name: 'signature',
      type: 'text',
      label: 'Signature',
      maxLength: 8,
      admin: { description: 'Initiales affichées en grand. Ex. « JDV ».' },
    },
  ],
}
