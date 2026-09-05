import type { Field } from 'payload'

import { linkField } from './link'

/**
 * En-tête de section réutilisable, correspondant au composant `SectionTitle`
 * du design existant : surtitre, titre et lien d'action optionnel.
 */
export const sectionHeadingField = (): Field => ({
  name: 'heading',
  type: 'group',
  label: 'En-tête de section',
  fields: [
    {
      name: 'eyebrow',
      type: 'text',
      label: 'Surtitre',
      maxLength: 60,
      admin: { description: 'Court libellé en capitales au-dessus du titre. Ex. « Sélection ».' },
    },
    {
      name: 'title',
      type: 'text',
      label: 'Titre de section',
      maxLength: 120,
    },
    {
      name: 'showAction',
      type: 'checkbox',
      label: 'Afficher un lien d’action',
      defaultValue: false,
    },
    linkField({
      name: 'action',
      label: 'Lien d’action',
      condition: (_data, siblingData) => Boolean(siblingData?.showAction),
    }),
  ],
})
