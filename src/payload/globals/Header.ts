import type { GlobalConfig } from 'payload'

import { anyone, authenticated } from '../access'
import { linkField } from '../fields/link'
import { revalidateGlobal } from '../hooks/revalidate'

/**
 * En-tête commun à toutes les pages.
 * Toute modification est répercutée immédiatement sur l'ensemble du site via
 * l'invalidation du tag `globals`.
 */
export const Header: GlobalConfig = {
  slug: 'header',
  label: 'En-tête du site',
  admin: {
    group: 'Configuration',
    description: 'Logo, navigation principale et bouton d’action. S’applique à toutes les pages.',
  },
  access: { read: anyone, update: authenticated },
  hooks: { afterChange: [revalidateGlobal('globals')] },
  fields: [
    {
      name: 'brand',
      type: 'group',
      label: 'Marque',
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'initials',
              type: 'text',
              label: 'Initiales',
              maxLength: 4,
              admin: { width: '25%', description: 'Pastille ronde. Ex. « JD ».' },
            },
            {
              name: 'lineOne',
              type: 'text',
              label: 'Première ligne',
              maxLength: 40,
              admin: { width: '37%' },
            },
            {
              name: 'lineTwo',
              type: 'text',
              label: 'Seconde ligne',
              maxLength: 40,
              admin: { width: '38%' },
            },
          ],
        },
        {
          name: 'ariaLabel',
          type: 'text',
          label: 'Intitulé accessible du logo',
          maxLength: 120,
          admin: { description: 'Lu par les lecteurs d’écran. Ex. « Jacques-Daguerre Valcy — accueil ».' },
        },
        {
          name: 'logo',
          type: 'upload',
          relationTo: 'media',
          label: 'Logo image (optionnel)',
          admin: { description: 'Si renseigné, remplace la pastille d’initiales.' },
        },
      ],
    },
    {
      name: 'navigation',
      type: 'array',
      label: 'Navigation principale',
      labels: { singular: 'Lien', plural: 'Liens' },
      admin: { description: 'Glisser-déposer pour réordonner les liens du menu.' },
      fields: [linkField({ name: 'link', label: 'Lien' })],
    },
    {
      name: 'cta',
      type: 'group',
      label: 'Bouton d’action',
      fields: [
        { name: 'enabled', type: 'checkbox', label: 'Afficher', defaultValue: true },
        linkField({
          name: 'link',
          label: 'Destination',
          condition: (_data, siblingData) => Boolean(siblingData?.enabled),
        }),
      ],
    },
    {
      name: 'mobile',
      type: 'group',
      label: 'Menu mobile',
      fields: [
        {
          name: 'toggleLabel',
          type: 'text',
          label: 'Intitulé accessible du bouton menu',
          maxLength: 80,
          admin: { description: 'Ex. « Ouvrir le menu ».' },
        },
        {
          name: 'closeLabel',
          type: 'text',
          label: 'Intitulé accessible à l’état ouvert',
          maxLength: 80,
        },
      ],
    },
    {
      name: 'skipLinkLabel',
      type: 'text',
      label: 'Libellé du lien d’évitement',
      maxLength: 60,
      admin: {
        description:
          'Premier lien de la page, visible au clavier uniquement. Ex. « Aller au contenu ».',
      },
    },
  ],
}
