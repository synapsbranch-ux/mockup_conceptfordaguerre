import type { CollectionConfig, Where } from 'payload'

import { isCMSUser } from '../access'
import { serverWriteOnly, staffWriteOnly } from '../access/ownership'

/**
 * Commentaires publics des articles.
 *
 * Règles structurantes :
 *
 *  - `author`, `article` et `status` sont en écriture serveur uniquement. Le
 *    navigateur ne peut donc ni usurper un auteur, ni rattacher un commentaire
 *    à un autre article, ni publier directement en contournant la
 *    prémodération. Ces valeurs viennent de la session et de l'URL.
 *  - Un seul niveau de réponse : `parent` doit désigner un commentaire racine,
 *    contrainte vérifiée par un hook serveur.
 *  - Le corps est stocké en texte brut et rendu en nœuds React. Aucun HTML
 *    n'est interprété, ce qui ferme le XSS stocké.
 */
export const COMMENT_STATUSES = [
  { label: 'Publié', value: 'published' },
  { label: 'En attente de modération', value: 'pending' },
  { label: 'Masqué', value: 'hidden' },
  { label: 'Indésirable', value: 'spam' },
] as const

export const ArticleComments: CollectionConfig = {
  slug: 'articleComments',
  labels: { singular: 'Commentaire', plural: 'Commentaires d’articles' },
  admin: {
    useAsTitle: 'excerpt',
    defaultColumns: ['excerpt', 'author', 'article', 'status', 'reportCount', 'createdAt'],
    group: 'Communauté',
    description:
      'Commentaires laissés sous les articles publics. Modérables sans supprimer le contenu.',
  },
  defaultSort: '-createdAt',
  access: {
    /**
     * Lecture publique restreinte aux commentaires publiés.
     * La clause est appliquée à la requête MongoDB : un commentaire masqué ou
     * en attente reste inatteignable, même par son identifiant.
     */
    read: ({ req: { user } }) => {
      if (isCMSUser(user)) return true
      if (user) {
        // Une personne connectée voit en plus ses propres commentaires,
        // y compris ceux en attente de modération.
        const clause: Where = {
          or: [{ status: { equals: 'published' } }, { author: { equals: user.id } }],
        }
        return clause
      }
      return { status: { equals: 'published' } }
    },
    // La création passe par la route d'API, qui applique limitation de débit,
    // assainissement et vérification du droit de publier.
    create: ({ req: { user } }) => isCMSUser(user),
    update: ({ req: { user } }) => isCMSUser(user),
    delete: ({ req: { user } }) => isCMSUser(user),
  },
  indexes: [
    // Fil d'un article : filtré par statut, trié par date.
    { fields: ['article', 'status', 'createdAt'] },
    // Fil « mes commentaires ».
    { fields: ['author', 'createdAt'] },
    // File de modération, priorisée par nombre de signalements.
    { fields: ['status', 'reportCount'] },
    // Réponses d'un commentaire racine.
    { fields: ['parent', 'status'] },
  ],
  fields: [
    {
      name: 'article',
      type: 'relationship',
      relationTo: 'articles',
      label: 'Article',
      required: true,
      index: true,
      access: { create: serverWriteOnly, update: serverWriteOnly },
    },
    {
      name: 'author',
      type: 'relationship',
      relationTo: 'users',
      label: 'Auteur',
      required: true,
      index: true,
      access: { create: serverWriteOnly, update: serverWriteOnly },
    },
    {
      name: 'parent',
      type: 'relationship',
      relationTo: 'articleComments',
      label: 'Réponse à',
      index: true,
      access: { create: serverWriteOnly, update: serverWriteOnly },
      admin: { description: 'Un seul niveau de réponse est autorisé.' },
    },
    {
      name: 'body',
      type: 'textarea',
      label: 'Message',
      required: true,
      maxLength: 4000,
      admin: {
        description: 'Texte brut. Aucun HTML n’est interprété au rendu.',
      },
    },
    {
      name: 'excerpt',
      type: 'text',
      label: 'Aperçu',
      maxLength: 120,
      admin: {
        readOnly: true,
        description: 'Généré depuis le message, pour les listes de modération.',
      },
    },
    {
      name: 'status',
      type: 'select',
      label: 'Statut',
      required: true,
      defaultValue: 'published',
      index: true,
      options: [...COMMENT_STATUSES],
      access: { create: staffWriteOnly, update: staffWriteOnly },
    },
    {
      name: 'editedAt',
      type: 'date',
      label: 'Modifié le',
      admin: {
        readOnly: true,
        date: { pickerAppearance: 'dayAndTime' },
        description: 'Renseigné à la première modification. Affiche la mention « modifié ».',
      },
    },
    {
      name: 'reportCount',
      type: 'number',
      label: 'Signalements',
      defaultValue: 0,
      min: 0,
      index: true,
      access: { create: serverWriteOnly, update: staffWriteOnly },
    },
    {
      name: 'moderatedBy',
      type: 'relationship',
      relationTo: 'users',
      label: 'Modéré par',
      access: { create: staffWriteOnly, update: staffWriteOnly },
      admin: { readOnly: true },
    },
  ],
  hooks: {
    beforeChange: [
      ({ data }) => {
        // Aperçu recalculé à chaque écriture, sur une seule ligne.
        if (typeof data.body === 'string') {
          const flat = data.body.replace(/\s+/g, ' ').trim()
          return { ...data, excerpt: flat.slice(0, 117) + (flat.length > 117 ? '…' : '') }
        }
        return data
      },
    ],
  },
  timestamps: true,
}
