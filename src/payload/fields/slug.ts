import type { Field } from 'payload'

/**
 * Normalise une chaîne en slug URL : accents retirés, apostrophes converties,
 * ponctuation remplacée par des tirets.
 * Exporté pour être réutilisé par les scripts de migration.
 */
export const formatSlug = (input: string): string =>
  input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u2019'`]/g, ' ')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

/**
 * Champ slug unique et indexé, généré automatiquement depuis un champ source
 * mais toujours modifiable manuellement (exigence : préserver les URLs existantes).
 */
export const slugField = (source = 'title'): Field => ({
  name: 'slug',
  type: 'text',
  label: 'Slug (URL)',
  required: true,
  unique: true,
  index: true,
  admin: {
    position: 'sidebar',
    description:
      'Identifiant utilisé dans l’URL publique. Généré depuis le titre s’il est laissé vide. Modifier un slug déjà en ligne casse les liens existants.',
  },
  hooks: {
    beforeValidate: [
      ({ value, data }) => {
        if (typeof value === 'string' && value.trim() !== '') return formatSlug(value)
        const fallback = (data as Record<string, unknown> | undefined)?.[source]
        if (typeof fallback === 'string' && fallback.trim() !== '') return formatSlug(fallback)
        return value
      },
    ],
  },
  validate: (value: string | null | undefined) => {
    if (!value || value.trim() === '') return 'Le slug est obligatoire.'
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)) {
      return 'Le slug ne peut contenir que des lettres minuscules non accentuées, des chiffres et des tirets.'
    }
    if (value.length > 120) return 'Le slug ne peut pas dépasser 120 caractères.'
    return true
  },
})
