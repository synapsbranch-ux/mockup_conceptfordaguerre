/**
 * Les neuf pages du site, transcrites depuis les composants du prototype.
 *
 * Chaque bloc reprend au mot près le contenu affiché aujourd'hui : titres,
 * paragraphes, libellés de boutons, légendes et mentions « à confirmer ».
 * Rien n'est ajouté ni reformulé.
 */
import { aboutValueLabels, valueLabels } from './commitments'
import {
  customLink,
  lexicalParagraphs,
  media,
  pageLink,
  seg,
  type SeedBlock,
} from './helpers'
import { legacyJourney } from './legacy-site'

export type PageFixture = {
  slug: string
  name: string
  title: string
  template:
    | 'standard'
    | 'home'
    | 'about'
    | 'projects-landing'
    | 'services-landing'
    | 'blog-landing'
    | 'contact'
    | 'social'
    | 'legal'
    | 'user-space'
  darkHeader?: boolean
  seo?: { title?: string; description?: string; imageKey?: string; noIndex?: boolean }
  layout: SeedBlock[]
}

export const pageFixtures: PageFixture[] = [
  // ── Accueil ───────────────────────────────────────────────────────────────
  {
    slug: 'home',
    name: 'Accueil',
    title: 'Jacques-Daguerre Valcy | Stratège analytique',
    template: 'home',
    darkHeader: true,
    seo: {
      title: 'Jacques-Daguerre Valcy | Stratège analytique',
      description:
        'Analyste de données et stratège analytique : je transforme les données en décisions utiles.',
      imageKey: 'hero',
    },
    layout: [
      {
        blockType: 'hero',
        blockName: 'Bannière',
        visible: true,
        kicker: 'Analyste de données · Québec / Haïti',
        title: [
          seg('Transformer les'),
          seg('données en', { br: true }),
          seg('décisions utiles.', { em: true }),
        ],
        copy: 'Je suis Jacques-Daguerre Valcy, stratège analytique. Je relie recherche, technologie et vision d’affaires pour créer des solutions qui font avancer.',
        image: media('hero'),
        buttons: [
          { link: pageLink('Voir mes réalisations', 'projects'), style: 'accent', showArrow: true },
          { link: pageLink('Découvrir mon parcours', 'about'), style: 'ghost', showArrow: false },
        ],
        metric: {
          enabled: true,
          label: 'Impact mesurable',
          value: '+34%',
          steps: [{ label: 'Clarté' }, { label: 'Stratégie' }, { label: 'Action' }],
          ariaLabel: 'Courbe ascendante illustrant une amélioration',
        },
        scrollCue: { enabled: true, label: 'Défiler', anchor: 'approche' },
      },
      {
        blockType: 'statement',
        blockName: 'Mon approche',
        visible: true,
        anchor: 'approche',
        eyebrow: 'Mon approche',
        statement: [
          seg('La donnée n’a de valeur que lorsqu’elle permet'),
          seg('d’agir.', { em: true }),
          seg(
            'Je transforme la complexité en une direction claire, adaptée aux personnes qui décident.',
          ),
        ],
        signature: 'JDV',
      },
      {
        blockType: 'projectGrid',
        blockName: 'Réalisations choisies',
        visible: true,
        variant: 'feature',
        heading: {
          eyebrow: 'Sélection',
          title: 'Réalisations choisies',
          showAction: true,
          action: pageLink('Tous les projets', 'projects'),
        },
        source: 'auto',
        onlyFeatured: false,
        limit: 3,
      },
      {
        blockType: 'serviceList',
        blockName: 'Aperçu des services',
        visible: true,
        variant: 'rows',
        heading: {
          eyebrow: 'Datakle',
          title: 'De la question à la solution',
          showAction: true,
          action: pageLink('Découvrir les services', 'services'),
        },
        source: 'auto',
        onlyFeatured: false,
        limit: 4,
      },
      {
        blockType: 'imageText',
        blockName: 'D’Haïti au Québec',
        visible: true,
        variant: 'origin',
        imagePosition: 'left',
        image: media('journey'),
        imageAlt: 'Parcours personnel entre Haïti et le Québec',
        eyebrow: 'Un parcours, deux territoires',
        title: [
          seg('D’Haïti au Québec,'),
          seg('une même volonté d’impact.', { em: true, br: true }),
        ],
        paragraphs: [
          {
            text: 'Mon parcours réunit agronomie, économie, gestion de projet et analytique d’affaires. Cette diversité me permet de regarder un problème sous plusieurs angles avant de proposer une solution.',
          },
        ],
        showLink: true,
        link: pageLink('Lire mon histoire', 'about'),
      },
      {
        blockType: 'galleryFour',
        blockName: 'Parcours en images',
        visible: true,
        heading: {
          eyebrow: 'Parcours en images',
          title: 'Des racines, des rencontres, une trajectoire',
          showAction: false,
        },
        items: [
          {
            image: media('fsaUlaval'),
            imageAlt:
              'Jacques-Daguerre Valcy à la Faculté des sciences de l’agriculture et de l’alimentation',
            number: '01',
            caption: 'Formation & recherche',
            size: 'tall',
          },
          {
            image: media('graduation'),
            imageAlt: 'Portrait de graduation de Jacques-Daguerre Valcy',
            number: '02',
            caption: 'Persévérance académique',
            size: 'normal',
          },
          {
            image: media('universityGroup'),
            imageAlt: 'Jacques-Daguerre Valcy avec un groupe universitaire',
            number: '03',
            caption: 'Intelligence collective',
            size: 'normal',
          },
          {
            image: media('colleaguesEvent'),
            imageAlt: 'Rencontre professionnelle avec des collègues',
            number: '04',
            caption: 'Collaboration & communauté',
            size: 'wide',
          },
        ],
      },
      {
        blockType: 'articleList',
        blockName: 'Notes & perspectives',
        visible: true,
        variant: 'cards',
        heading: {
          eyebrow: 'Notes & perspectives',
          title: 'Penser la donnée autrement',
          showAction: true,
          action: pageLink('Voir le blog', 'blog'),
        },
        source: 'auto',
        onlyFeatured: false,
        excludeFeatured: false,
        limit: 3,
      },
      {
        blockType: 'cta',
        blockName: 'Appel final',
        visible: true,
        variant: 'band',
        eyebrow: 'Une question à explorer ?',
        title: [seg('Faisons parler'), seg('vos données.', { em: true, br: true })],
        link: pageLink('', 'contact'),
        ariaLabel: 'Me contacter',
      },
    ],
  },

  // ── À propos ──────────────────────────────────────────────────────────────
  {
    slug: 'about',
    name: 'À propos',
    title: 'À propos | Jacques-Daguerre Valcy',
    template: 'about',
    seo: {
      title: 'À propos | Jacques-Daguerre Valcy',
      description:
        'Ingénieur-agronome de formation, analyste par expertise et stratège par conviction : agronomie, économie, gestion de projet et analytique d’affaires.',
      imageKey: 'portrait',
    },
    layout: [
      {
        blockType: 'pageIntro',
        blockName: 'Introduction',
        visible: true,
        eyebrow: 'À propos',
        number: '01',
        title: [
          seg('Comprendre les systèmes.'),
          seg('Faire avancer les décisions.', { em: true, br: true }),
        ],
        description:
          'Ingénieur-agronome de formation, analyste par expertise et stratège par conviction. Mon parcours suit un même fil : rendre la complexité utile.',
      },
      {
        blockType: 'imageText',
        blockName: 'Portrait et biographie',
        visible: true,
        variant: 'about-lead',
        imagePosition: 'left',
        image: media('portrait'),
        imageAlt: 'Portrait professionnel de Jacques-Daguerre Valcy',
        eyebrow: 'Biographie',
        lead: 'Je crois à une analytique qui ne s’arrête pas aux constats. Une analytique qui aide les organisations à comprendre, choisir et agir avec plus de confiance.',
        paragraphs: [
          {
            text: 'Ma formation d’ingénieur-agronome m’a appris à observer les systèmes dans leur ensemble. Ma spécialisation en économie m’a donné les outils pour comprendre les mécanismes de décision. La gestion de projet, le suivi-évaluation et la recherche ont ensuite structuré ma façon de travailler.',
          },
          {
            text: 'Aujourd’hui, l’analyse de données est au cœur de mon expertise. Je m’intéresse particulièrement aux systèmes d’aide à la décision qui rendent l’information disponible au bon moment et sous une forme réellement adaptée aux acteurs.',
          },
        ],
        note: {
          enabled: true,
          label: 'À compléter avec le client',
          text: 'Note exacte du MBA, titre et réalisations chez Desjardins, dates du parcours et courte mention du mentor Yvan Blaise.',
        },
        showLink: false,
      },
      {
        blockType: 'timeline',
        blockName: 'Le fil du parcours',
        visible: true,
        eyebrow: 'Le fil du parcours',
        title: [
          seg('De la terre aux données,'),
          seg('de l’analyse à l’action.', { em: true, br: true }),
        ],
        items: legacyJourney.map((step) => ({
          title: step.title,
          text: step.text,
          image: media(step.mediaKey),
        })),
      },
      {
        blockType: 'valuesList',
        blockName: 'Aujourd’hui',
        visible: true,
        variant: 'about-grid',
        eyebrow: 'Aujourd’hui',
        title: [seg('Analytique d’affaires,'), seg('stratégie et Datakle.', { br: true })],
        paragraphs: [
          {
            text: 'J’ai complété une formation de deuxième cycle en suivi-évaluation et un MBA spécialisé en analytique d’affaires. Ces expériences ont renforcé ma capacité à relier les données aux objectifs, aux processus et aux réalités humaines.',
          },
          {
            text: 'La création de Datakle traduit cette ambition : offrir des services d’analyse, de visualisation, d’automatisation et de solutions Web/data qui créent un impact concret.',
          },
        ],
        values: aboutValueLabels.map((label) => ({ label })),
      },
      {
        blockType: 'gallery',
        blockName: 'Jalons',
        visible: true,
        variant: 'milestones',
        items: [
          {
            image: media('universityCampus'),
            imageAlt: 'Campus universitaire associé au parcours de Jacques-Daguerre Valcy',
            caption: 'Un parcours construit entre apprentissage, recherche et expérience.',
          },
          {
            image: media('mbaDiploma'),
            imageAlt: 'Diplôme de MBA de Jacques-Daguerre Valcy',
            caption: 'MBA spécialisé en analytique d’affaires — détails à confirmer.',
          },
        ],
      },
    ],
  },

  // ── Réalisations ──────────────────────────────────────────────────────────
  {
    slug: 'projects',
    name: 'Réalisations',
    title: 'Réalisations | Jacques-Daguerre Valcy',
    template: 'projects-landing',
    seo: {
      title: 'Réalisations | Jacques-Daguerre Valcy',
      description:
        'Projets en visualisation décisionnelle, automatisation Access/Excel, recherche et stratégie analytique, dont des travaux data pour Haïti.',
      imageKey: 'powerbi',
    },
    layout: [
      {
        blockType: 'pageIntro',
        blockName: 'Introduction',
        visible: true,
        eyebrow: 'Réalisations',
        number: '02',
        title: [seg('Des analyses qui'), seg('deviennent des actions.', { em: true, br: true })],
        description:
          'Une sélection de projets en visualisation, automatisation, recherche et stratégie analytique. Les résultats chiffrés seront ajoutés après validation du client.',
      },
      {
        blockType: 'projectGrid',
        blockName: 'Index des projets',
        visible: true,
        variant: 'index',
        heading: { showAction: false },
        itemLinkLabel: 'Voir l’étude de cas',
        source: 'auto',
        onlyFeatured: false,
        limit: 24,
      },
    ],
  },

  // ── Services ──────────────────────────────────────────────────────────────
  {
    slug: 'services',
    name: 'Services Datakle',
    title: 'Services Datakle | Jacques-Daguerre Valcy',
    template: 'services-landing',
    seo: {
      title: 'Services Datakle | Jacques-Daguerre Valcy',
      description:
        'Datakle accompagne les organisations qui veulent mieux comprendre leurs données, automatiser leurs opérations et construire des outils utiles.',
      imageKey: 'datakle',
    },
    layout: [
      {
        blockType: 'pageIntro',
        blockName: 'Introduction',
        visible: true,
        eyebrow: 'Datakle',
        number: '03',
        title: [seg('La donnée comme'), seg('levier de progrès.', { em: true, br: true })],
        description:
          'Datakle accompagne les organisations qui souhaitent mieux comprendre leurs données, automatiser leurs opérations et construire des outils utiles.',
      },
      {
        blockType: 'imageText',
        blockName: 'Mission',
        visible: true,
        variant: 'services-hero',
        imagePosition: 'left',
        image: media('datakle'),
        imageAlt: 'Univers visuel de Datakle',
        eyebrow: 'Mission',
        paragraphs: [
          {
            text: 'Rendre l’analytique accessible et actionnable afin d’améliorer la décision, la performance et l’impact des organisations.',
          },
        ],
        showLink: false,
      },
      {
        blockType: 'serviceList',
        blockName: 'Détail des services',
        visible: true,
        variant: 'detail',
        heading: { showAction: false },
        source: 'auto',
        onlyFeatured: false,
        limit: 24,
      },
      {
        blockType: 'imageText',
        blockName: 'Vision',
        visible: true,
        variant: 'vision',
        imagePosition: 'right',
        image: media('haitiImpact'),
        imageAlt: 'Vision data et développement pour Haïti',
        eyebrow: 'Vision',
        title: [
          seg('Créer des solutions utiles ici,'),
          seg('contribuer au progrès en Haïti.', { em: true, br: true }),
        ],
        paragraphs: [
          {
            text: 'Datakle veut rapprocher expertise analytique, innovation responsable et besoins réels. La vision est de contribuer à des institutions et communautés mieux outillées pour décider.',
          },
        ],
        showLink: false,
      },
      {
        blockType: 'cta',
        blockName: 'Collaboration',
        visible: true,
        variant: 'collab',
        eyebrow: 'Collaboration',
        title: [
          seg('Développeurs, organisations'),
          seg('et partenaires : construisons ensemble.', { br: true }),
        ],
        link: pageLink('Démarrer une conversation', 'contact'),
      },
      {
        blockType: 'noticeNote',
        blockName: 'Mention administrative',
        visible: true,
        variant: 'prototype-note',
        text: 'Raison sociale officielle et détails administratifs de Datakle à confirmer avant la mise en production.',
      },
    ],
  },

  // ── Blog ──────────────────────────────────────────────────────────────────
  {
    slug: 'blog',
    name: 'Blog',
    title: 'Blog | Jacques-Daguerre Valcy',
    template: 'blog-landing',
    seo: {
      title: 'Blog | Jacques-Daguerre Valcy',
      description:
        'Analytique, automatisation, entrepreneuriat et impact social : des réflexions pour rendre la donnée plus humaine et plus utile.',
      imageKey: 'haitiData',
    },
    layout: [
      {
        blockType: 'pageIntro',
        blockName: 'Introduction',
        visible: true,
        eyebrow: 'Blog',
        number: '04',
        title: [seg('Des idées pour'), seg('mieux décider.', { em: true, br: true })],
        description:
          'Analytique, automatisation, entrepreneuriat et impact social — des réflexions pour rendre la donnée plus humaine et plus utile.',
      },
      {
        blockType: 'featuredArticle',
        blockName: 'Article à la une',
        visible: true,
        source: 'auto',
        badge: 'Article à la une',
        linkLabel: 'Lire l’article',
      },
      {
        blockType: 'articleList',
        blockName: 'Tous les articles',
        visible: true,
        variant: 'rows',
        heading: { eyebrow: 'Tous les articles', showAction: false },
        metaLabel: '05 perspectives à venir',
        excludeFeatured: true,
        source: 'auto',
        onlyFeatured: false,
        limit: 24,
      },
    ],
  },

  // ── Contact ───────────────────────────────────────────────────────────────
  {
    slug: 'contact',
    name: 'Contact',
    title: 'Contact | Jacques-Daguerre Valcy',
    template: 'contact',
    seo: {
      title: 'Contact | Jacques-Daguerre Valcy',
      description:
        'Un projet de visualisation, d’automatisation ou une question data à clarifier ? Décrivez le contexte, nous partirons du besoin réel.',
      imageKey: 'professionalAnalyst',
    },
    layout: [
      {
        blockType: 'pageIntro',
        blockName: 'Introduction',
        visible: true,
        eyebrow: 'Contact',
        number: '06',
        title: [seg('Parlons de votre'), seg('prochaine décision.', { em: true, br: true })],
        description:
          'Un projet de visualisation, d’automatisation ou une question data à clarifier ? Décrivez le contexte, nous partirons du besoin réel.',
      },
      {
        blockType: 'contactInfo',
        blockName: 'Coordonnées',
        visible: true,
        items: [
          { label: 'Courriel', kind: 'email', value: 'jdvalcy02@gmail.com' },
          { label: 'Rendez-vous', kind: 'text', value: 'Lien Calendly à confirmer' },
        ],
        // La rubrique « Réseaux » n'est plus un texte figé : elle reprend les
        // réseaux définis dans les réglages du site, icônes comprises.
        socials: { enabled: true, label: 'Réseaux', hidePending: false },
        availability: { enabled: true, text: 'Disponible pour de nouvelles collaborations' },
      },
      {
        blockType: 'contactForm',
        blockName: 'Formulaire',
        visible: true,
        labels: {
          name: 'Votre nom',
          namePlaceholder: 'Nom complet',
          email: 'Votre courriel',
          emailPlaceholder: 'vous@entreprise.com',
          organisation: 'Organisation',
          organisationPlaceholder: 'Nom de l’organisation',
          subject: 'Sujet',
          subjectPlaceholder: 'Choisir un sujet',
          message: 'Parlez-moi du projet',
          messagePlaceholder: 'Contexte, besoin, échéancier…',
          consent:
            'J’accepte que mes informations soient utilisées pour répondre à cette demande.',
          submit: 'Envoyer la demande',
        },
        subjects: [
          { label: 'Analyse de données' },
          { label: 'Tableau de bord' },
          { label: 'Automatisation' },
          { label: 'Solution Web & data' },
          { label: 'Collaboration Datakle' },
          { label: 'Autre' },
        ],
        messages: {
          success: 'Message envoyé. Merci — une réponse suivra dès que possible.',
          error: 'L’envoi a échoué. Réessayer dans un instant, ou écrire directement à jdvalcy02@gmail.com.',
          rateLimited: 'Trop de tentatives. Patienter quelques minutes avant de réessayer.',
        },
      },
    ],
  },

  // ── Engagement social ─────────────────────────────────────────────────────
  {
    slug: 'engagement',
    name: 'Engagement social',
    title: 'Engagement social | Jacques-Daguerre Valcy',
    template: 'social',
    seo: {
      title: 'Engagement social | Jacques-Daguerre Valcy',
      description:
        'La donnée au service de l’éducation, des communautés et d’un développement plus juste, particulièrement en Haïti.',
      imageKey: 'haitiData',
    },
    layout: [
      {
        blockType: 'pageIntro',
        blockName: 'Introduction',
        visible: true,
        eyebrow: 'Engagement social',
        number: '05',
        title: [
          seg('La connaissance au service'),
          seg('de la transformation sociale.', { em: true, br: true }),
        ],
        description:
          'Je crois que la donnée peut soutenir l’éducation, renforcer les communautés et contribuer à un développement plus juste, particulièrement en Haïti.',
      },
      {
        blockType: 'quote',
        blockName: 'Mon pourquoi',
        visible: true,
        variant: 'engagement',
        image: media('haitiData'),
        imageAlt: 'La donnée comme outil de transformation sociale en Haïti',
        label: 'Mon pourquoi',
        quote:
          '« Rendre la connaissance accessible pour que davantage de personnes puissent participer aux décisions qui les concernent. »',
      },
      {
        blockType: 'commitmentList',
        blockName: 'Engagements',
        visible: true,
        heading: { showAction: false },
        source: 'auto',
        onlyFeatured: false,
        limit: 12,
      },
      {
        blockType: 'imageText',
        blockName: 'Transmettre',
        visible: true,
        variant: 'education',
        imagePosition: 'left',
        image: media('education'),
        imageAlt: 'Éducation et mentorat autour des données',
        eyebrow: 'Transmettre',
        title: [
          seg('La donnée devient puissante'),
          seg('quand elle se partage.', { em: true, br: true }),
        ],
        paragraphs: [
          {
            text: 'Ateliers, contenus pédagogiques, mentorat et collaborations : cette section accueillera les initiatives réalisées et celles à venir.',
          },
        ],
        showLink: false,
      },
      {
        blockType: 'valuesList',
        blockName: 'Valeurs',
        visible: true,
        variant: 'marquee',
        values: valueLabels.map((label) => ({ label })),
        ariaLabel: 'Valeurs',
      },
    ],
  },

  // ── Informations légales ──────────────────────────────────────────────────
  {
    slug: 'legal',
    name: 'Informations légales',
    title: 'Informations légales | Jacques-Daguerre Valcy',
    template: 'legal',
    seo: {
      title: 'Informations légales | Jacques-Daguerre Valcy',
      description:
        'Conditions d’utilisation, politique de confidentialité et traitement des données des formulaires et de l’infolettre.',
    },
    layout: [
      {
        blockType: 'pageIntro',
        blockName: 'Introduction',
        visible: true,
        eyebrow: 'Informations légales',
        number: '07',
        title: [seg('Transparence,'), seg('respect et confiance.', { em: true, br: true })],
        description:
          'Cette page regroupe les conditions d’utilisation et la politique de confidentialité. Le texte constitue un prototype à faire valider avant publication.',
      },
      {
        blockType: 'legalContent',
        blockName: 'Contenu juridique',
        visible: true,
        warning: {
          enabled: true,
          text: 'Version de travail — à réviser selon la juridiction, les outils réellement utilisés et l’identité légale du responsable.',
        },
        tocLabel: 'Sommaire juridique',
        sections: [
          {
            number: '01',
            anchor: 'conditions',
            title: 'Conditions d’utilisation',
            content: lexicalParagraphs(
              'Le contenu de ce site est fourni à titre informatif. Sauf indication contraire, les textes, visuels et éléments de marque appartiennent à leur titulaire et ne peuvent être reproduits sans autorisation.',
              'Les informations publiées ne constituent pas un avis professionnel adapté à une situation particulière.',
            ),
          },
          {
            number: '02',
            anchor: 'confidentialite',
            title: 'Politique de confidentialité',
            content: lexicalParagraphs(
              'Le site vise à recueillir uniquement les renseignements nécessaires pour répondre aux demandes, gérer les abonnements et offrir les fonctionnalités choisies par l’utilisateur.',
              'Les fournisseurs techniques, durées de conservation et mesures de protection seront précisés avant la mise en production.',
            ),
          },
          {
            number: '03',
            anchor: 'donnees',
            title: 'Données, formulaire et newsletter',
            content: lexicalParagraphs(
              'Le formulaire de contact peut recueillir le nom, le courriel, l’organisation, le sujet et le message. La newsletter recueille l’adresse courriel et la preuve du consentement.',
              'Aucune inscription ne doit être ajoutée à une liste marketing sans consentement explicite. Chaque message de newsletter offrira une option de désabonnement.',
            ),
          },
          {
            number: '04',
            anchor: 'droits',
            title: 'Consentement et droits',
            content: lexicalParagraphs(
              'Les utilisateurs pourront retirer leur consentement, demander l’accès ou la correction de leurs renseignements et demander leur suppression lorsque la loi le permet.',
            ),
          },
          {
            number: '05',
            anchor: 'contact-legal',
            title: 'Responsable et contact',
            content: lexicalParagraphs(
              'L’identité officielle du responsable de la protection des renseignements et l’adresse de contact doivent être confirmées. Pour le prototype : jdvalcy02@gmail.com.',
            ),
          },
        ],
      },
    ],
  },

  // ── Espace utilisateur ────────────────────────────────────────────────────
  {
    slug: 'space',
    name: 'Espace utilisateur',
    title: 'Espace utilisateur | Jacques-Daguerre Valcy',
    template: 'user-space',
    seo: {
      title: 'Espace utilisateur | Jacques-Daguerre Valcy',
      description:
        'Espace personnel pour retrouver vos articles enregistrés et gérer votre abonnement à l’infolettre.',
      // Maquette sans contenu indexable : exclue des moteurs de recherche.
      noIndex: true,
    },
    layout: [
      {
        blockType: 'authPrototype',
        blockName: 'Maquette d’espace utilisateur',
        visible: true,
        eyebrow: 'Espace utilisateur',
        title: [seg('Votre veille data,'), seg('au même endroit.', { em: true, br: true })],
        description:
          'Enregistrez vos articles, accédez aux contenus réservés et gérez votre abonnement à la newsletter.',
        benefits: [
          { label: '01 · Articles favoris' },
          { label: '02 · Contenus réservés' },
          { label: '03 · Préférences newsletter' },
        ],
        tabs: { login: 'Connexion', register: 'Créer un compte' },
        fields: {
          name: 'Nom',
          namePlaceholder: 'Votre nom',
          email: 'Courriel',
          emailPlaceholder: 'vous@courriel.com',
          password: 'Mot de passe',
          passwordPlaceholder: '••••••••',
          consent: 'J’accepte les conditions et la politique de confidentialité.',
        },
        buttons: { login: 'Se connecter', register: 'Créer mon compte' },
        caption: 'Interface de démonstration — authentification à connecter.',
      },
    ],
  },
]

/** Référence conservée pour le lien courriel du pied de page. */
export const contactEmailLink = customLink('jdvalcy02@gmail.com', 'mailto:jdvalcy02@gmail.com')
