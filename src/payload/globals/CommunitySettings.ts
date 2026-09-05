import type { GlobalConfig } from 'payload'

import { anyone, authenticated } from '../access'
import { revalidateGlobal } from '../hooks/revalidate'

/**
 * Réglages du forum et des commentaires.
 *
 * Tout ce qui est éditorial vit ici plutôt que dans un composant React : titres,
 * descriptions, règles, textes d'invitation. Un changement de formulation ne
 * doit jamais exiger un déploiement.
 */
export const CommunitySettings: GlobalConfig = {
  slug: 'communitySettings',
  label: 'Forum et commentaires',
  admin: {
    group: 'Réglages',
    description: 'Présentation du forum, règles de participation et modération des commentaires.',
  },
  access: {
    // Lecture publique : le fil du forum s'appuie dessus pour son en-tête.
    read: anyone,
    update: authenticated,
  },
  hooks: { afterChange: [revalidateGlobal('communitySettings')] },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Forum',
          fields: [
            {
              name: 'forumEnabled',
              type: 'checkbox',
              label: 'Forum ouvert',
              defaultValue: true,
              admin: {
                description:
                  'Décocher masque le forum du site public et ferme la publication, sans rien supprimer.',
              },
            },
            {
              name: 'forumTitle',
              type: 'text',
              label: 'Titre du forum',
              defaultValue: 'Forum',
              maxLength: 120,
            },
            {
              name: 'forumDescription',
              type: 'textarea',
              label: 'Description',
              maxLength: 600,
              admin: { description: 'Affichée en tête du fil et utilisée comme description SEO.' },
            },
            {
              name: 'forumRules',
              type: 'textarea',
              label: 'Règles de participation',
              maxLength: 4000,
              admin: {
                description:
                  'Affichées sur la page du forum et rappelées au moment de publier. Texte brut.',
              },
            },
            {
              name: 'forumJoinCta',
              type: 'text',
              label: 'Appel à rejoindre la communauté',
              defaultValue: 'Connectez-vous pour participer à la discussion.',
              maxLength: 200,
            },
            {
              name: 'forumEmptyState',
              type: 'text',
              label: 'Message quand le fil est vide',
              defaultValue: 'Aucune discussion pour le moment.',
              maxLength: 200,
            },
          ],
        },
        {
          label: 'Page d’accueil',
          fields: [
            {
              name: 'homepageEnabled',
              type: 'checkbox',
              label: 'Afficher une section forum sur la page d’accueil',
              defaultValue: false,
            },
            {
              name: 'homepageTitle',
              type: 'text',
              label: 'Titre de la section',
              defaultValue: 'Discussions récentes',
              maxLength: 120,
              admin: { condition: (_, sibling) => sibling?.homepageEnabled === true },
            },
            {
              name: 'homepageIntro',
              type: 'textarea',
              label: 'Introduction',
              maxLength: 400,
              admin: { condition: (_, sibling) => sibling?.homepageEnabled === true },
            },
            {
              name: 'homepageCount',
              type: 'number',
              label: 'Nombre de discussions affichées',
              defaultValue: 3,
              min: 1,
              max: 10,
              admin: { condition: (_, sibling) => sibling?.homepageEnabled === true },
            },
          ],
        },
        {
          label: 'Commentaires',
          fields: [
            {
              name: 'commentsEnabledByDefault',
              type: 'checkbox',
              label: 'Commentaires ouverts par défaut sur les nouveaux articles',
              defaultValue: true,
            },
            {
              name: 'commentsModeration',
              type: 'select',
              label: 'Mode de modération',
              required: true,
              defaultValue: 'direct',
              options: [
                { label: 'Publication immédiate', value: 'direct' },
                { label: 'Prémodération', value: 'premoderated' },
              ],
              admin: {
                description:
                  'Réglage global. Chaque article peut le surcharger dans son propre panneau.',
              },
            },
            {
              name: 'commentsIntro',
              type: 'text',
              label: 'Titre de la section commentaires',
              defaultValue: 'Commentaires',
              maxLength: 120,
            },
            {
              name: 'commentsSignedOutCta',
              type: 'text',
              label: 'Invitation affichée aux visiteurs non connectés',
              defaultValue: 'Connectez-vous pour laisser un commentaire.',
              maxLength: 200,
            },
            {
              name: 'commentsEmptyState',
              type: 'text',
              label: 'Message quand il n’y a aucun commentaire',
              defaultValue: 'Aucun commentaire pour le moment.',
              maxLength: 200,
            },
          ],
        },
      ],
    },
  ],
}
