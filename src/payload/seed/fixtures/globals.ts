/**
 * Contenu des trois globals, transcrit depuis `src/components/Layout.js`.
 *
 * Les URLs de réseaux sociaux restent volontairement vides : elles n'existent
 * nulle part dans le prototype (le pied de page affichait « à confirmer »).
 * Elles ne sont pas inventées ; le CMS conserve et affiche cette mention.
 */
import { seg } from './helpers'

/** Ordre de navigation d'origine, réutilisé par l'en-tête et le pied de page. */
export const navigationSlugs = [
  { label: 'Accueil', page: 'home' },
  { label: 'À propos', page: 'about' },
  { label: 'Réalisations', page: 'projects' },
  { label: 'Services', page: 'services' },
  { label: 'Blog', page: 'blog' },
  { label: 'Engagement', page: 'engagement' },
  { label: 'Contact', page: 'contact' },
]

/**
 * Les cinq reseaux affiches par le prototype. Les adresses ne sont pas
 * documentees dans le depot : elles restent vides et le site affiche la mention
 * « a confirmer », plutot que d'inventer une URL. Renseigner l'adresse dans le
 * CMS fait disparaitre la mention et active le lien.
 */
export const socialNetworks = [
  { network: 'linkedin' as const, label: 'LinkedIn', url: '', pendingLabel: 'à confirmer', showInHeader: true },
  { network: 'github' as const, label: 'GitHub', url: '', pendingLabel: 'à confirmer', showInHeader: true },
  { network: 'medium' as const, label: 'Medium', url: '', pendingLabel: 'à confirmer', showInHeader: true },
  { network: 'youtube' as const, label: 'YouTube', url: '', pendingLabel: 'à confirmer', showInHeader: true },
  { network: 'instagram' as const, label: 'Instagram', url: '', pendingLabel: 'à confirmer', showInHeader: true },
]

export const siteSettingsFixture = {
  siteName: 'Jacques-Daguerre Valcy',
  brandName: 'Datakle',
  brandInitials: 'JD',
  tagline: 'Data · Stratégie · Impact',
  copyright: '© 2026 Jacques-Daguerre Valcy',
  email: 'jdvalcy02@gmail.com',
  location: 'Québec / Haïti',
  availability: 'Disponible pour de nouvelles collaborations',
  appointmentUrl: '',
  appointmentPending: 'Lien Calendly à confirmer',
  defaultSeoTitle: 'Jacques-Daguerre Valcy | Stratège analytique',
  defaultSeoDescription:
    'Analyste de données et stratège analytique : je transforme les données en décisions utiles.',
  titleTemplate: '%s | Jacques-Daguerre Valcy',
  defaultSeoImageKey: 'hero',
  analytics: { provider: 'none' as const },
  allowIndexing: true,
  // Mots-cles et donnees structurees derives du contenu deja present sur le
  // site (titres, mission Datakle, services, technologies des projets).
  // Aucune information nouvelle n'est introduite.
  keywords: [
    'analyse de données',
    'stratège analytique',
    'Power BI',
    'visualisation de données',
    'automatisation',
    'aide à la décision',
    'Datakle',
    'Québec',
    'Haïti',
  ],
  structuredData: {
    personName: 'Jacques-Daguerre Valcy',
    jobTitle: 'Stratège analytique',
    description:
      'Analyste de données et stratège analytique : je transforme les données en décisions utiles.',
    portraitKey: 'portrait',
    organizationName: 'Datakle',
    organizationDescription:
      'Rendre l’analytique accessible et actionnable afin d’améliorer la décision, la performance et l’impact des organisations.',
    areaServed: ['Québec', 'Haïti'],
    knowsAbout: [
      'Analyse de données',
      'Visualisation',
      'Automatisation',
      'Solutions Web & data',
      'Power BI',
      'Microsoft Access',
      'Excel',
      'VBA',
      'SQL',
      'Suivi-évaluation',
    ],
  },
  notFound: {
    eyebrow: 'Erreur 404',
    title: [
      seg('Cette page n’existe'),
      seg('plus ou pas encore.', { em: true, br: true }),
    ],
    number: '404',
    description:
      'Le lien suivi ne correspond à aucune page publiée. Revenir à l’accueil ou consulter les réalisations.',
    ctaEyebrow: 'Continuer',
    ctaTitle: 'Reprendre la navigation.',
    ctaLabel: 'Retour à l’accueil',
  },
  labels: {
    projectBack: '\u2190 Toutes les r\u00e9alisations',
    projectTechnologies: 'Technologies',
    projectContext: 'Contexte & probl\u00e8me',
    projectMethod: 'M\u00e9thodologie',
    projectResult: 'R\u00e9sultats',
    projectLearning: 'Ce que j\u2019ai appris',
    projectNext: 'Projet suivant',
    articleBack: '\u2190 Retour au blog',
  },
}

export const headerFixture = {
  brand: {
    initials: 'JD',
    lineOne: 'Jacques-Daguerre',
    lineTwo: 'Valcy',
    ariaLabel: 'Jacques-Daguerre Valcy — accueil',
  },
  cta: { enabled: true, label: 'Espace', page: 'space' },
  mobile: { toggleLabel: 'Ouvrir le menu', closeLabel: 'Fermer le menu' },
  skipLinkLabel: 'Aller au contenu',
}

export const footerFixture = {
  visuals: [
    { mediaKey: 'professionalAnalyst', caption: 'Analyser avec rigueur' },
    { mediaKey: 'datakleFounder', caption: 'Construire avec impact' },
  ],
  visualMessage: {
    kicker: 'DATAKLE / 2026',
    lines: [seg('Clarifier.'), seg('Décider.', { em: true, br: true }), seg('Agir.', { br: true })],
  },
  newsletterEyebrow: 'Restons connectés',
  newsletterTitle: [
    seg('Des idées utiles,'),
    seg('directement dans votre boîte.', { em: true, br: true }),
  ],
  newsletterFieldLabel: 'Adresse courriel',
  newsletterPlaceholder: 'votre@courriel.com',
  newsletterButton: 'S’inscrire',
  newsletterConsent:
    'En vous inscrivant, vous acceptez la politique de confidentialité. Désabonnement en tout temps.',
  newsletterMessages: {
    success: 'Merci — votre inscription est enregistrée.',
    alreadySubscribed: 'Cette adresse est déjà inscrite.',
    error: 'L’inscription n’a pas pu être enregistrée. Réessayer dans un instant.',
    rateLimited: 'Trop de tentatives. Patienter quelques minutes avant de réessayer.',
  },
  columns: [
    {
      title: 'Explorer',
      kind: 'links' as const,
      // Reprend la navigation d'origine sans « Accueil », comme dans le prototype.
      pages: navigationSlugs.slice(1),
    },
    { title: 'Réseaux', kind: 'socials' as const, pages: [] },
    {
      title: 'Contact',
      kind: 'links' as const,
      pages: [
        { label: 'jdvalcy02@gmail.com', page: null, url: 'mailto:jdvalcy02@gmail.com' },
        { label: 'Informations légales', page: 'legal' },
      ],
    },
  ],
  copyright: '© 2026 Jacques-Daguerre Valcy',
  signature: 'Data · Stratégie · Impact',
}
