/**
 * Engagements sociaux, transcrits depuis le tableau `commitments` figé dans
 * l'ancien `src/pages/engagement.js`.
 */

export type CommitmentFixture = {
  slug: string
  number: string
  title: string
  category: 'developpement' | 'education' | 'democratisation' | 'communaute' | 'valeurs' | 'innovation'
  summary: string
  order: number
}

export const commitmentFixtures: CommitmentFixture[] = [
  {
    slug: 'developpement-haiti',
    number: '01',
    title: 'Développement d’Haïti',
    category: 'developpement',
    summary:
      'Contribuer à la valorisation des données dans les institutions, l’agriculture et les initiatives qui façonnent l’avenir du pays.',
    order: 10,
  },
  {
    slug: 'education-mentorat',
    number: '02',
    title: 'Éducation & mentorat',
    category: 'education',
    summary:
      'Encourager les jeunes à découvrir la data, soutenir la formation continue et transmettre avec la générosité reçue de mentors comme Yvan Blaise.',
    order: 20,
  },
  {
    slug: 'democratisation-donnee',
    number: '03',
    title: 'Démocratisation de la donnée',
    category: 'democratisation',
    summary:
      'Vulgariser l’analytique grâce à des articles, visualisations et outils qui rendent la connaissance accessible au plus grand nombre.',
    order: 30,
  },
  {
    slug: 'initiatives-communautaires',
    number: '04',
    title: 'Initiatives communautaires',
    category: 'communaute',
    summary:
      'Collaborer avec des écoles, associations et organisations autour de projets bénévoles et d’actions locales à impact.',
    order: 40,
  },
]

/** Valeurs affichées en bandeau sur la page Engagement et en pastilles sur À propos. */
export const valueLabels = [
  'Rigueur',
  'Impact social',
  'Éducation',
  'Transparence',
  'Innovation responsable',
  'Solidarité',
]

/** Variante utilisée par la page À propos (« Impact » au lieu d’« Impact social »). */
export const aboutValueLabels = [
  'Rigueur',
  'Impact',
  'Éducation',
  'Transparence',
  'Innovation responsable',
  'Solidarité',
]
