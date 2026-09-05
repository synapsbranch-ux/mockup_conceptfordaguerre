import type { Field } from 'payload'

/**
 * Groupe SEO commun à toutes les entités indexables.
 * Chaque champ est facultatif : le rendu retombe sur le titre / l'extrait du
 * document, puis sur les réglages globaux du site.
 */
export const seoField: Field = {
  name: 'seo',
  type: 'group',
  label: 'Référencement (SEO)',
  admin: {
    description:
      'Laisser vide pour reprendre automatiquement le titre et la description du document.',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      label: 'Titre SEO',
      maxLength: 70,
      admin: { description: '50 à 60 caractères recommandés. Repli : le titre du document.' },
    },
    {
      name: 'description',
      type: 'textarea',
      label: 'Description SEO',
      maxLength: 180,
      admin: {
        description: '120 à 160 caractères recommandés. Repli : le résumé ou l’extrait du document.',
      },
    },
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
      label: 'Image de partage social',
      admin: {
        description:
          'Utilisée par Open Graph et Twitter. Format paysage 1200 × 630 px recommandé. Repli : l’image par défaut du site.',
      },
    },
    {
      name: 'noIndex',
      type: 'checkbox',
      label: 'Empêcher l’indexation par les moteurs de recherche',
      defaultValue: false,
    },
  ],
}
