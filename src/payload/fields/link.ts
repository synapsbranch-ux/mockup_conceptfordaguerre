import type { Field } from 'payload'

/**
 * Valide une destination : soit une URL absolue http(s), soit un chemin interne
 * commençant par « / », soit une ancre. Toute autre saisie (javascript:, data:…)
 * est refusée — les éditeurs ne peuvent donc pas injecter de code exécutable.
 */
export const validateHref = (value: string | null | undefined): true | string => {
  if (!value || value.trim() === '') return 'La destination est obligatoire.'
  const trimmed = value.trim()
  if (trimmed.startsWith('/') || trimmed.startsWith('#')) return true
  if (trimmed.startsWith('mailto:') && trimmed.includes('@')) return true
  if (trimmed.startsWith('tel:')) return true
  try {
    const url = new URL(trimmed)
    if (url.protocol === 'http:' || url.protocol === 'https:') return true
    return 'Seules les URLs http(s), mailto: et tel: sont acceptées.'
  } catch {
    return 'Destination invalide. Utiliser un chemin interne (/contact), une ancre (#section) ou une URL complète.'
  }
}

type LinkOptions = {
  name?: string
  label?: string
  /**
   * Rend le libellé visible obligatoire. À désactiver pour les liens rendus
   * sous forme d'icône seule, dont l'intitulé accessible est porté par un
   * champ `ariaLabel` voisin (le bandeau à flèche circulaire, par exemple).
   */
  requireLabel?: boolean
  /** Rend le groupe entier conditionnel à une case à cocher parente. */
  condition?: (data: unknown, siblingData: Record<string, unknown>) => boolean
}

/**
 * Lien éditorial : soit une page du site (relation typée, donc jamais cassée),
 * soit une destination libre validée.
 */
export const linkField = ({
  name = 'link',
  label = 'Lien',
  requireLabel = true,
  condition,
}: LinkOptions = {}): Field => ({
  name,
  type: 'group',
  label,
  admin: { condition },
  fields: [
    {
      name: 'label',
      type: 'text',
      label: 'Libellé du bouton',
      required: requireLabel,
      maxLength: 80,
    },
    {
      name: 'type',
      type: 'select',
      label: 'Type de destination',
      defaultValue: 'page',
      options: [
        { label: 'Page du site', value: 'page' },
        { label: 'Adresse personnalisée', value: 'custom' },
      ],
    },
    {
      name: 'page',
      type: 'relationship',
      relationTo: 'pages',
      label: 'Page de destination',
      validate: (
        value: unknown,
        { siblingData }: { siblingData: Record<string, unknown> },
      ): true | string => {
        if (siblingData?.type === 'custom') return true
        return value ? true : 'Choisir une page de destination.'
      },
      admin: {
        condition: (_data, siblingData) => siblingData?.type !== 'custom',
        description: 'La destination suit automatiquement le slug de la page choisie.',
      },
    },
    {
      name: 'url',
      type: 'text',
      label: 'Adresse',
      validate: (value: string | null | undefined, { siblingData }: { siblingData: Record<string, unknown> }) => {
        if (siblingData?.type !== 'custom') return true
        return validateHref(value)
      },
      admin: {
        condition: (_data, siblingData) => siblingData?.type === 'custom',
        description: 'Chemin interne (/contact), ancre (#approche) ou URL complète (https://…).',
      },
    },
    {
      name: 'newTab',
      type: 'checkbox',
      label: 'Ouvrir dans un nouvel onglet',
      defaultValue: false,
    },
  ],
})
