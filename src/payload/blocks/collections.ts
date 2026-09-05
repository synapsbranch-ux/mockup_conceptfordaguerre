import type { Block, Field } from 'payload'

import { blockBaseFields, variantField } from '../fields/blockBase'
import { sectionHeadingField } from '../fields/sectionHeading'

/**
 * Sélection automatique ou manuelle des documents affichés par une liste.
 * En mode automatique, l'ordre suit le champ `order` puis la date de publication.
 */
const selectionFields = (relationTo: string, label: string): Field[] => [
  {
    name: 'source',
    type: 'select',
    label: 'Sélection des éléments',
    defaultValue: 'auto',
    options: [
      { label: 'Automatique (par ordre d’affichage)', value: 'auto' },
      { label: 'Manuelle (choisir les éléments)', value: 'manual' },
    ],
  },
  {
    name: 'onlyFeatured',
    type: 'checkbox',
    label: 'Limiter aux éléments « à la une »',
    defaultValue: false,
    admin: { condition: (_d, s) => s?.source !== 'manual' },
  },
  {
    name: 'limit',
    type: 'number',
    label: 'Nombre maximum d’éléments',
    defaultValue: 3,
    min: 1,
    max: 24,
    admin: { condition: (_d, s) => s?.source !== 'manual' },
  },
  {
    name: 'items',
    type: 'relationship',
    relationTo: relationTo as 'projects',
    hasMany: true,
    label,
    admin: {
      condition: (_d, s) => s?.source === 'manual',
      description: 'Glisser-déposer pour définir l’ordre d’affichage.',
    },
  },
]

/** Grille de projets : mosaïque de la page d'accueil ou index complet. */
export const ProjectGridBlock: Block = {
  slug: 'projectGrid',
  interfaceName: 'ProjectGridBlock',
  labels: { singular: 'Grille de projets', plural: 'Grilles de projets' },
  fields: [
    ...blockBaseFields,
    variantField(
      [
        { label: 'Mosaïque (première carte agrandie)', value: 'feature' },
        { label: 'Index détaillé', value: 'index' },
      ],
      'feature',
    ),
    sectionHeadingField(),
    {
      name: 'itemLinkLabel',
      type: 'text',
      label: 'Libellé du lien de chaque projet',
      maxLength: 60,
      admin: {
        description: 'Affiché par la variante « index ». Ex. « Voir l’étude de cas ».',
        condition: (_d, s) => s?.variant === 'index',
      },
    },
    ...selectionFields('projects', 'Projets'),
  ],
}

/** Projet unique mis en avant. */
export const FeaturedProjectBlock: Block = {
  slug: 'featuredProject',
  interfaceName: 'FeaturedProjectBlock',
  labels: { singular: 'Projet à la une', plural: 'Projets à la une' },
  fields: [
    ...blockBaseFields,
    sectionHeadingField(),
    {
      name: 'project',
      type: 'relationship',
      relationTo: 'projects',
      label: 'Projet',
      required: true,
    },
  ],
}

/** Liste de services : lignes compactes ou fiches détaillées. */
export const ServiceListBlock: Block = {
  slug: 'serviceList',
  interfaceName: 'ServiceListBlock',
  labels: { singular: 'Liste de services', plural: 'Listes de services' },
  fields: [
    ...blockBaseFields,
    variantField(
      [
        { label: 'Lignes compactes (aperçu)', value: 'rows' },
        { label: 'Fiches détaillées avec livrables', value: 'detail' },
      ],
      'rows',
    ),
    sectionHeadingField(),
    ...selectionFields('services', 'Services'),
  ],
}

/** Liste d'articles : cartes en grille ou lignes éditoriales. */
export const ArticleListBlock: Block = {
  slug: 'articleList',
  interfaceName: 'ArticleListBlock',
  labels: { singular: 'Liste d’articles', plural: 'Listes d’articles' },
  fields: [
    ...blockBaseFields,
    variantField(
      [
        { label: 'Cartes en grille', value: 'cards' },
        { label: 'Lignes numérotées', value: 'rows' },
      ],
      'cards',
    ),
    sectionHeadingField(),
    {
      name: 'metaLabel',
      type: 'text',
      label: 'Mention à droite du surtitre',
      maxLength: 60,
      admin: { description: 'Affichée par la variante « lignes ». Ex. « 05 perspectives à venir ».' },
    },
    {
      name: 'excludeFeatured',
      type: 'checkbox',
      label: 'Exclure l’article déjà mis en avant sur cette page',
      defaultValue: false,
      admin: { description: 'Évite d’afficher deux fois le même article.' },
    },
    ...selectionFields('articles', 'Articles'),
  ],
}

/** Article unique mis en avant, en pleine largeur. */
export const FeaturedArticleBlock: Block = {
  slug: 'featuredArticle',
  interfaceName: 'FeaturedArticleBlock',
  labels: { singular: 'Article à la une', plural: 'Articles à la une' },
  fields: [
    ...blockBaseFields,
    {
      name: 'source',
      type: 'select',
      label: 'Sélection',
      defaultValue: 'auto',
      options: [
        { label: 'Automatique (article « à la une » le plus récent)', value: 'auto' },
        { label: 'Manuelle', value: 'manual' },
      ],
    },
    {
      name: 'article',
      type: 'relationship',
      relationTo: 'articles',
      label: 'Article',
      admin: { condition: (_d, s) => s?.source === 'manual' },
    },
    {
      name: 'badge',
      type: 'text',
      label: 'Mention accolée à la catégorie',
      maxLength: 60,
      admin: { description: 'Ex. « Article à la une ».' },
    },
    { name: 'linkLabel', type: 'text', label: 'Libellé du lien', maxLength: 60 },
  ],
}

/** Liste des engagements sociaux. */
export const CommitmentListBlock: Block = {
  slug: 'commitmentList',
  interfaceName: 'CommitmentListBlock',
  labels: { singular: 'Liste d’engagements', plural: 'Listes d’engagements' },
  fields: [...blockBaseFields, sectionHeadingField(), ...selectionFields('commitments', 'Engagements')],
}
