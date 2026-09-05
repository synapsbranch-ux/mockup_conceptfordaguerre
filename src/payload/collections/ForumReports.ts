import type { CollectionConfig } from 'payload'

import { authenticated, isCMSUser } from '../access'
import { serverWriteOnly, staffWriteOnly } from '../access/ownership'

/**
 * Signalements de contenu inapproprié — discussions, réponses et commentaires
 * d'articles.
 *
 * Un signalement n'est **jamais** lisible par son auteur une fois déposé :
 * seule l'équipe de modération y accède. Cela évite de transformer la file de
 * signalements en canal de pression entre personnes.
 *
 * L'unicité (auteur, cible) empêche le harcèlement par signalements répétés.
 */
export const REPORT_REASONS = [
  { label: 'Contenu offensant', value: 'offensive' },
  { label: 'Indésirable ou publicité', value: 'spam' },
  { label: 'Hors sujet', value: 'off_topic' },
  { label: 'Données personnelles', value: 'personal_data' },
  { label: 'Autre', value: 'other' },
] as const

export const REPORT_STATUSES = [
  { label: 'À examiner', value: 'open' },
  { label: 'Retenu', value: 'upheld' },
  { label: 'Écarté', value: 'dismissed' },
] as const

export const ForumReports: CollectionConfig = {
  slug: 'forumReports',
  labels: { singular: 'Signalement', plural: 'Signalements' },
  admin: {
    useAsTitle: 'targetExcerpt',
    defaultColumns: ['targetExcerpt', 'targetType', 'reason', 'status', 'createdAt'],
    group: 'Communauté',
    description: 'File de modération. Chaque signalement traité est journalisé.',
  },
  defaultSort: '-createdAt',
  access: {
    // Strictement réservé au personnel, y compris à l'auteur du signalement.
    read: ({ req: { user } }) => isCMSUser(user),
    create: authenticated,
    update: ({ req: { user } }) => isCMSUser(user),
    delete: ({ req: { user } }) => isCMSUser(user),
  },
  indexes: [
    { fields: ['status', 'createdAt'] },
    { fields: ['targetType', 'targetId'] },
    // Un seul signalement par personne et par cible.
    { fields: ['reporter', 'targetType', 'targetId'], unique: true },
  ],
  fields: [
    {
      name: 'reporter',
      type: 'relationship',
      relationTo: 'users',
      label: 'Signalé par',
      required: true,
      index: true,
      access: { create: serverWriteOnly, update: serverWriteOnly },
    },
    {
      name: 'targetType',
      type: 'select',
      label: 'Type de contenu',
      required: true,
      options: [
        { label: 'Discussion', value: 'topic' },
        { label: 'Réponse', value: 'reply' },
        { label: 'Commentaire d’article', value: 'comment' },
      ],
      access: { create: serverWriteOnly, update: serverWriteOnly },
    },
    {
      name: 'targetId',
      type: 'text',
      label: 'Identifiant du contenu',
      required: true,
      maxLength: 60,
      access: { create: serverWriteOnly, update: serverWriteOnly },
    },
    {
      name: 'targetExcerpt',
      type: 'text',
      label: 'Extrait signalé',
      maxLength: 200,
      access: { create: serverWriteOnly, update: serverWriteOnly },
      admin: {
        readOnly: true,
        description: 'Copié au moment du signalement : reste lisible même si le contenu est modifié.',
      },
    },
    {
      name: 'reason',
      type: 'select',
      label: 'Motif',
      required: true,
      options: [...REPORT_REASONS],
    },
    {
      name: 'detail',
      type: 'textarea',
      label: 'Précisions',
      maxLength: 1000,
    },
    {
      name: 'status',
      type: 'select',
      label: 'Suite donnée',
      required: true,
      defaultValue: 'open',
      index: true,
      options: [...REPORT_STATUSES],
      access: { create: staffWriteOnly, update: staffWriteOnly },
    },
    {
      name: 'resolvedBy',
      type: 'relationship',
      relationTo: 'users',
      label: 'Traité par',
      access: { create: staffWriteOnly, update: staffWriteOnly },
      admin: { readOnly: true },
    },
    {
      name: 'moderatorNote',
      type: 'textarea',
      label: 'Note de modération',
      maxLength: 1000,
      access: { create: staffWriteOnly, update: staffWriteOnly, read: staffWriteOnly },
      admin: { description: 'Interne. Jamais exposée à la personne signalée ni à l’auteur.' },
    },
  ],
  timestamps: true,
}
