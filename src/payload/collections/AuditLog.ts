import type { CollectionConfig } from 'payload'

import { authenticated, superAdminOnly } from '../access'

/**
 * Journal des actions sensibles.
 *
 * Registre en ajout seul : une entrée ne peut être ni modifiée ni supprimée
 * depuis l'interface, sans quoi il perdrait sa valeur probante. Seul un
 * super-administrateur le consulte.
 *
 * Les entrées ne contiennent jamais de secret, de mot de passe, d'adresse IP,
 * ni le corps d'un message : uniquement qui a fait quoi, sur quoi, et quand.
 */
export const AUDIT_ACTIONS = [
  { label: 'Rôle modifié', value: 'user.role_changed' },
  { label: 'Compte suspendu', value: 'user.suspended' },
  { label: 'Compte réactivé', value: 'user.reinstated' },
  { label: 'Publication communautaire bloquée', value: 'user.forum_banned' },
  { label: 'Publication communautaire rétablie', value: 'user.forum_unbanned' },
  { label: 'Commentaire modéré', value: 'comment.moderated' },
  { label: 'Commentaire supprimé', value: 'comment.deleted' },
  { label: 'Discussion modérée', value: 'forum.topic_moderated' },
  { label: 'Réponse de forum modérée', value: 'forum.reply_moderated' },
  { label: 'Signalement traité', value: 'forum.report_resolved' },
  { label: 'Document téléversé', value: 'document.uploaded' },
  { label: 'Document supprimé', value: 'document.deleted' },
  { label: 'Devis modifié', value: 'quote.updated' },
  { label: 'Proposition envoyée', value: 'proposal.sent' },
  { label: 'Facture émise', value: 'invoice.issued' },
  { label: 'Facture annulée', value: 'invoice.cancelled' },
  { label: 'Rendez-vous confirmé', value: 'appointment.confirmed' },
  { label: 'Rendez-vous annulé', value: 'appointment.cancelled' },
] as const

export const AuditLog: CollectionConfig = {
  slug: 'auditLog',
  labels: { singular: 'Entrée du journal', plural: 'Journal d’activité' },
  admin: {
    useAsTitle: 'action',
    defaultColumns: ['action', 'actor', 'targetLabel', 'createdAt'],
    group: 'Système',
    description:
      'Registre en ajout seul des actions sensibles. Consultable par les super-administrateurs.',
  },
  defaultSort: '-createdAt',
  access: {
    read: superAdminOnly,
    // Écrit exclusivement par `recordAudit()` avec `overrideAccess`.
    create: authenticated,
    // Registre immuable : aucune modification ni suppression, même pour un
    // super-administrateur.
    update: () => false,
    delete: () => false,
  },
  indexes: [{ fields: ['action', 'createdAt'] }, { fields: ['actor', 'createdAt'] }],
  fields: [
    {
      name: 'action',
      type: 'select',
      label: 'Action',
      required: true,
      index: true,
      options: [...AUDIT_ACTIONS],
    },
    {
      name: 'actor',
      type: 'relationship',
      relationTo: 'users',
      label: 'Auteur de l’action',
      index: true,
      admin: { description: 'Vide lorsque l’action provient d’un script serveur.' },
    },
    {
      name: 'actorEmail',
      type: 'text',
      label: 'Adresse de l’auteur',
      maxLength: 254,
      admin: {
        readOnly: true,
        description: 'Copiée au moment de l’action : l’entrée reste lisible si le compte est supprimé.',
      },
    },
    {
      name: 'targetCollection',
      type: 'text',
      label: 'Collection visée',
      maxLength: 60,
      admin: { readOnly: true },
    },
    {
      name: 'targetId',
      type: 'text',
      label: 'Identifiant visé',
      maxLength: 60,
      admin: { readOnly: true },
    },
    {
      name: 'targetLabel',
      type: 'text',
      label: 'Élément visé',
      maxLength: 240,
      admin: { readOnly: true, description: 'Libellé lisible, figé au moment de l’action.' },
    },
    {
      name: 'summary',
      type: 'textarea',
      label: 'Détail',
      maxLength: 600,
      admin: {
        readOnly: true,
        description: 'Ce qui a changé. Ne contient jamais de secret ni de contenu de message.',
      },
    },
  ],
  timestamps: true,
}
