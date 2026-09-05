import type { Field } from 'payload'

type ImageOptions = {
  name?: string
  label?: string
  required?: boolean
  description?: string
}

/**
 * Paire « média + texte alternatif contextuel ».
 *
 * Le texte alternatif est obligatoire au niveau de la collection Media : ce champ
 * additionnel permet seulement de le surcharger quand la même image sert dans
 * deux contextes différents. Le rendu retombe toujours sur `media.alt`, ce qui
 * garantit qu'aucune image ne sort sans alternative textuelle.
 */
export const imageFields = ({
  name = 'image',
  label = 'Image',
  required = false,
  description,
}: ImageOptions = {}): Field[] => [
  {
    name,
    type: 'upload',
    relationTo: 'media',
    label,
    required,
    admin: { description },
  },
  {
    name: `${name}Alt`,
    type: 'text',
    label: `${label} — texte alternatif contextuel`,
    maxLength: 250,
    admin: {
      description:
        'Facultatif. Laisser vide pour hériter du texte alternatif défini sur le média.',
      condition: (_data, siblingData) => Boolean(siblingData?.[name]),
    },
  },
]
