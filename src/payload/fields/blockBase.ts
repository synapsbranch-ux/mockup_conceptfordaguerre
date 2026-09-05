import type { Field } from 'payload'

/**
 * Champs présents sur chaque bloc de mise en page.
 *
 * - `blockName` (fourni nativement par Payload) sert d'étiquette interne.
 * - `visible` permet de masquer une section sans la supprimer : exigence
 *   explicite du cahier des charges (« Hide or display individual sections »).
 */
export const blockBaseFields: Field[] = [
  {
    name: 'visible',
    type: 'checkbox',
    label: 'Section visible sur le site',
    defaultValue: true,
    admin: {
      description: 'Décocher masque la section sans la supprimer ni perdre son contenu.',
    },
  },
]

/**
 * Construit un champ `variant` à partir d'une liste fermée.
 * Les variantes correspondent à des traitements visuels déjà présents dans la
 * feuille de style : les éditeurs choisissent parmi des options, jamais du CSS.
 */
export const variantField = (
  options: { label: string; value: string }[],
  defaultValue?: string,
): Field => ({
  name: 'variant',
  type: 'select',
  label: 'Variante d’affichage',
  defaultValue: defaultValue ?? options[0]?.value,
  options,
  admin: { description: 'Traitement visuel appliqué à la section.' },
})
