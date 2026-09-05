import type { Field } from 'payload'

type HeadlineOptions = {
  name?: string
  label?: string
  required?: boolean
  maxRows?: number
  description?: string
}

/**
 * Titre composé de segments typés.
 *
 * Le design existant compose ses titres avec des `<br/>` et des `<em>` posés au
 * milieu d'une phrase — par exemple `données en <em>décisions utiles.</em>`.
 * Un simple booléen par ligne ne suffit donc pas : chaque enregistrement est un
 * segment portant deux drapeaux indépendants (emphase, retour à la ligne).
 *
 * Le rendu joint les segments d'une même ligne par une espace simple : les
 * éditeurs n'ont jamais à saisir d'espace de bord, de `<br/>` ni de balise.
 */
export const headlineField = ({
  name = 'title',
  label = 'Titre',
  required = true,
  maxRows = 8,
  description,
}: HeadlineOptions = {}): Field => ({
  name,
  type: 'array',
  label,
  labels: { singular: 'Segment', plural: 'Segments' },
  required,
  minRows: required ? 1 : 0,
  maxRows,
  admin: {
    description:
      description ??
      'Le titre est découpé en segments. Les segments d’une même ligne sont assemblés automatiquement avec une espace.',
    initCollapsed: false,
    components: {
      RowLabel: '@/payload/components/HeadlineRowLabel#HeadlineRowLabel',
    },
  },
  fields: [
    {
      name: 'text',
      type: 'text',
      label: 'Texte',
      required: true,
      maxLength: 160,
    },
    {
      type: 'row',
      fields: [
        {
          name: 'emphasized',
          type: 'checkbox',
          label: 'Mise en avant (serif italique)',
          defaultValue: false,
          admin: { width: '50%' },
        },
        {
          name: 'newLine',
          type: 'checkbox',
          label: 'Commencer sur une nouvelle ligne',
          defaultValue: false,
          admin: {
            width: '50%',
            description: 'Sans effet sur le premier segment.',
          },
        },
      ],
    },
  ],
})
