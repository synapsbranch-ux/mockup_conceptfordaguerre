/**
 * Manifeste des 25 images d'origine (`public/images/daguerre`).
 *
 * `key` reprend la clé utilisée par l'ancien `src/data/site.js`, ce qui permet
 * aux fixtures de contenu de référencer une image sans connaître son nom de
 * fichier ni son identifiant MongoDB.
 *
 * Textes alternatifs :
 *  — repris tels quels lorsqu'un `alt=` existait déjà dans le JSX ;
 *  — rédigés d'après l'image elle-même pour les 11 visuels qui n'en avaient
 *    aucun (les composants les rendaient avec `alt=""`).
 * Le champ `credit` reste vide : l'origine des visuels n'est pas documentée
 * dans le dépôt et n'est pas inventée ici.
 */

export type MediaCategory =
  | 'portrait'
  | 'parcours'
  | 'projet'
  | 'datakle'
  | 'engagement'
  | 'illustration'
  | 'autre'

export type MediaFixture = {
  key: string
  filename: string
  title: string
  alt: string
  category: MediaCategory
  /** `true` si le texte alternatif existait déjà dans le code d'origine. */
  altFromSource: boolean
}

export const mediaFixtures: MediaFixture[] = [
  {
    key: 'hero',
    filename: 'hero-executive.webp',
    title: 'Portrait exécutif — bannière d’accueil',
    alt: 'Jacques-Daguerre Valcy en complet gris et cravate sombre, debout dans un hall aux murs bleu nuit et beige',
    category: 'portrait',
    altFromSource: false,
  },
  {
    key: 'portrait',
    filename: 'professional-portrait.webp',
    title: 'Portrait professionnel',
    alt: 'Portrait professionnel de Jacques-Daguerre Valcy',
    category: 'portrait',
    altFromSource: true,
  },
  {
    key: 'journey',
    filename: 'haiti-quebec-personal.webp',
    title: 'Parcours Haïti — Québec',
    alt: 'Parcours personnel entre Haïti et le Québec',
    category: 'parcours',
    altFromSource: true,
  },
  {
    key: 'mba',
    filename: 'mba-achievement.webp',
    title: 'Diplomation MBA',
    alt: 'Jacques-Daguerre Valcy en toge de graduation avec étole rouge et or, tenant un diplôme roulé',
    category: 'parcours',
    altFromSource: false,
  },
  {
    key: 'datakle',
    filename: 'datakle-hero.webp',
    title: 'Univers visuel Datakle',
    alt: 'Univers visuel de Datakle',
    category: 'datakle',
    altFromSource: true,
  },
  {
    key: 'agronomy',
    filename: 'agronomy-foundation.webp',
    title: 'Fondations agronomiques',
    alt: 'Composition circulaire mêlant champs cultivés, coupe de sol, racines de plante et une personne prenant des notes face à un paysage agricole',
    category: 'parcours',
    altFromSource: false,
  },
  {
    key: 'economics',
    filename: 'economics-specialization.webp',
    title: 'Spécialisation en économie',
    alt: 'Réseau de vignettes rondes reliées par des flèches — marché, usine, institution publique, bureau, ferme et pièces de monnaie — au-dessus d’un globe terrestre',
    category: 'parcours',
    altFromSource: false,
  },
  {
    key: 'evaluation',
    filename: 'monitoring-evaluation.webp',
    title: 'Suivi et évaluation',
    alt: 'Suite de disques reliés illustrant les étapes d’un cycle de projet : notes, structuration, engrenages, répartition, analyse à la loupe, puis cible atteinte',
    category: 'parcours',
    altFromSource: false,
  },
  {
    key: 'research',
    filename: 'rigorous-research.webp',
    title: 'Recherche rigoureuse',
    alt: 'Table de travail vue de haut : carnets manuscrits, cartes, graphiques imprimés et loupe posés côte à côte',
    category: 'parcours',
    altFromSource: false,
  },
  {
    key: 'strategy',
    filename: 'analytical-strategy.webp',
    title: 'Stratégie analytique',
    alt: 'Rubans de données désordonnés traversant plusieurs plaques de verre et convergeant vers un disque clair unique',
    category: 'projet',
    altFromSource: false,
  },
  {
    key: 'efficiency',
    filename: 'efficiency-optimization.webp',
    title: 'Efficacité et optimisation',
    alt: 'Enchevêtrement de fils et de formes grises à gauche, se résolvant à droite en une ligne unique menant à un graphique en barres ascendant',
    category: 'illustration',
    altFromSource: false,
  },
  {
    key: 'decision',
    filename: 'decision-support-realtime.webp',
    title: 'Aide à la décision en temps réel',
    alt: 'Personne attablée devant un écran mural où des sources de terrain convergent vers un réseau central, puis se transforment en indicateurs synthétiques',
    category: 'projet',
    altFromSource: false,
  },
  {
    key: 'powerbi',
    filename: 'powerbi-project.webp',
    title: 'Projet Power BI',
    alt: 'Pile de documents papier se dissolvant en particules qui se recomposent à droite en tableaux de bord : carte du monde, graphiques en barres, courbe et diagramme circulaire',
    category: 'projet',
    altFromSource: false,
  },
  {
    key: 'automation',
    filename: 'access-excel-automation.webp',
    title: 'Automatisation Access vers Excel',
    alt: 'Base de données reliée par des fils de cuivre à des étapes de tri successives, aboutissant à des tableaux de suivi imprimés',
    category: 'projet',
    altFromSource: false,
  },
  {
    key: 'haitiImpact',
    filename: 'haiti-data-impact.webp',
    title: 'Données et impact pour Haïti',
    alt: 'Vision data et développement pour Haïti',
    category: 'engagement',
    altFromSource: true,
  },
  {
    key: 'haitiData',
    filename: 'haiti-data.webp',
    title: 'La donnée au service d’Haïti',
    alt: 'La donnée comme outil de transformation sociale en Haïti',
    category: 'engagement',
    altFromSource: true,
  },
  {
    key: 'education',
    filename: 'engagement-education.webp',
    title: 'Éducation et mentorat',
    alt: 'Éducation et mentorat autour des données',
    category: 'engagement',
    altFromSource: true,
  },
  {
    key: 'professionalAnalyst',
    filename: 'professional-analyst.webp',
    title: 'Analyste de données',
    alt: 'Jacques-Daguerre Valcy, analyste de données',
    category: 'portrait',
    altFromSource: true,
  },
  {
    key: 'datakleFounder',
    filename: 'datakle-founder.webp',
    title: 'Fondateur de Datakle',
    alt: 'Jacques-Daguerre Valcy, fondateur de Datakle',
    category: 'datakle',
    altFromSource: true,
  },
  {
    key: 'colleaguesEvent',
    filename: 'colleagues-event.webp',
    title: 'Rencontre professionnelle',
    alt: 'Rencontre professionnelle avec des collègues',
    category: 'parcours',
    altFromSource: true,
  },
  {
    key: 'universityGroup',
    filename: 'university-group.webp',
    title: 'Groupe universitaire',
    alt: 'Jacques-Daguerre Valcy avec un groupe universitaire',
    category: 'parcours',
    altFromSource: true,
  },
  {
    key: 'fsaUlaval',
    filename: 'daguerre-fsa-ulaval.webp',
    title: 'Faculté des sciences de l’agriculture et de l’alimentation',
    alt: 'Jacques-Daguerre Valcy à la Faculté des sciences de l’agriculture et de l’alimentation',
    category: 'parcours',
    altFromSource: true,
  },
  {
    key: 'universityCampus',
    filename: 'university-campus.webp',
    title: 'Campus universitaire',
    alt: 'Campus universitaire associé au parcours de Jacques-Daguerre Valcy',
    category: 'parcours',
    altFromSource: true,
  },
  {
    key: 'graduation',
    filename: 'graduation-portrait.webp',
    title: 'Portrait de graduation',
    alt: 'Portrait de graduation de Jacques-Daguerre Valcy',
    category: 'parcours',
    altFromSource: true,
  },
  {
    key: 'mbaDiploma',
    filename: 'mba-diploma.webp',
    title: 'Diplôme de MBA',
    alt: 'Diplôme de MBA de Jacques-Daguerre Valcy',
    category: 'parcours',
    altFromSource: true,
  },
]

/** Index par clé, pour les fixtures de contenu. */
export const mediaByKey = Object.fromEntries(
  mediaFixtures.map((fixture) => [fixture.key, fixture]),
) as Record<string, MediaFixture>
