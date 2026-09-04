export const images = {
  hero: '/images/daguerre/hero-executive.webp',
  portrait: '/images/daguerre/professional-portrait.webp',
  journey: '/images/daguerre/haiti-quebec-personal.webp',
  mba: '/images/daguerre/mba-achievement.webp',
  datakle: '/images/daguerre/datakle-hero.webp',
  agronomy: '/images/daguerre/agronomy-foundation.webp',
  economics: '/images/daguerre/economics-specialization.webp',
  evaluation: '/images/daguerre/monitoring-evaluation.webp',
  research: '/images/daguerre/rigorous-research.webp',
  strategy: '/images/daguerre/analytical-strategy.webp',
  efficiency: '/images/daguerre/efficiency-optimization.webp',
  decision: '/images/daguerre/decision-support-realtime.webp',
  powerbi: '/images/daguerre/powerbi-project.webp',
  automation: '/images/daguerre/access-excel-automation.webp',
  haitiImpact: '/images/daguerre/haiti-data-impact.webp',
  haitiData: '/images/daguerre/haiti-data.webp',
  education: '/images/daguerre/engagement-education.webp',
  professionalAnalyst: '/images/daguerre/professional-analyst.webp',
  datakleFounder: '/images/daguerre/datakle-founder.webp',
  colleaguesEvent: '/images/daguerre/colleagues-event.webp',
  universityGroup: '/images/daguerre/university-group.webp',
  fsaUlaval: '/images/daguerre/daguerre-fsa-ulaval.webp',
  universityCampus: '/images/daguerre/university-campus.webp',
  graduation: '/images/daguerre/graduation-portrait.webp',
  mbaDiploma: '/images/daguerre/mba-diploma.webp',
}

export const projects = [
  {
    slug: 'tableaux-de-bord-power-bi',
    number: '01',
    type: 'Visualisation décisionnelle',
    title: 'Tableaux de bord Power BI',
    summary:
      'Transformer des données dispersées en indicateurs lisibles pour accélérer les décisions opérationnelles.',
    image: images.powerbi,
    problem:
      'Les équipes doivent consulter plusieurs sources avant de comprendre leur performance et de repérer les écarts.',
    method:
      'Cadrage des indicateurs, nettoyage des données, modélisation, prototypage des vues et validation avec les utilisateurs.',
    result:
      'Une lecture commune de la performance, des analyses plus rapides et un suivi visuel des priorités.',
    technologies: ['Power BI', 'Power Query', 'DAX', 'Excel'],
    learning:
      'Un bon tableau de bord commence par une question de gestion claire, pas par un choix de graphique.',
  },
  {
    slug: 'automatisation-access-excel',
    number: '02',
    type: 'Automatisation',
    title: 'Automatisation Access vers Excel',
    summary:
      'Réduire les tâches répétitives grâce à un flux automatisé, contrôlable et documenté en VBA.',
    image: images.automation,
    problem:
      'Les extractions et consolidations manuelles mobilisent du temps et augmentent le risque d’erreur.',
    method:
      'Cartographie du processus, règles de validation, requêtes Access, automatisation VBA et journalisation des erreurs.',
    result:
      'Un processus reproductible, plus rapide et plus fiable pour produire les fichiers de suivi.',
    technologies: ['Microsoft Access', 'Excel', 'VBA', 'SQL'],
    learning:
      'L’automatisation est durable lorsqu’elle reste transparente pour les personnes qui l’utilisent.',
  },
  {
    slug: 'donnees-et-impact-haiti',
    number: '03',
    type: 'Recherche & impact',
    title: 'Données et impact pour Haïti',
    summary:
      'Explorer comment la donnée peut soutenir l’agriculture, les institutions et les communautés haïtiennes.',
    image: images.haitiImpact,
    problem:
      'Des décisions importantes sont prises sans accès simple à une information structurée, actuelle et compréhensible.',
    method:
      'Recherche, sélection d’indicateurs, analyse exploratoire et conception de systèmes d’aide à la décision adaptés au contexte.',
    result:
      'Un cadre de projet pour rendre les données plus accessibles et directement utiles aux acteurs locaux.',
    technologies: ['Recherche', 'Analyse de données', 'Cartographie', 'Visualisation'],
    learning:
      'L’utilité sociale de la donnée dépend autant de son accessibilité que de sa qualité.',
  },
  {
    slug: 'analyse-marketing-numerique',
    number: '04',
    type: 'Analytique marketing',
    title: 'Analyse marketing & communication numérique',
    summary:
      'Relier les signaux numériques aux objectifs d’affaires pour mieux cibler les actions de communication.',
    image: images.strategy,
    problem:
      'Les métriques de visibilité ne suffisent pas à expliquer la contribution réelle des actions marketing.',
    method:
      'Définition du parcours, segmentation des données, analyse des conversions et recommandations d’optimisation.',
    result:
      'Des indicateurs reliés aux objectifs et une feuille de route priorisée pour améliorer la performance.',
    technologies: ['Excel', 'Power BI', 'Web analytics', 'Stratégie'],
    learning:
      'Les métriques deviennent utiles lorsqu’elles conduisent à une décision précise.',
  },
  {
    slug: 'systeme-aide-decision',
    number: '05',
    type: 'Datakle',
    title: 'Système d’aide à la décision',
    summary:
      'Un concept Datakle pour fournir aux acteurs la bonne information, au bon moment, dans un format actionnable.',
    image: images.decision,
    problem:
      'Les analyses arrivent parfois trop tard ou dans des formats difficiles à utiliser dans le travail quotidien.',
    method:
      'Observation des usages, architecture de données, définition des alertes et prototype de tableau décisionnel.',
    result:
      'Une expérience orientée vers la décision en temps réel et l’amélioration continue.',
    technologies: ['Data design', 'Automatisation', 'Dashboard', 'Web'],
    learning:
      'Le système doit s’adapter aux acteurs, et non demander aux acteurs de s’adapter à la technologie.',
  },
]

export const articles = [
  {
    slug: 'comment-la-data-peut-aider-haiti',
    category: 'Impact',
    title: 'Comment la data peut aider Haïti',
    excerpt:
      'De l’agriculture aux politiques publiques, une donnée accessible peut améliorer la qualité et la rapidité des décisions.',
    image: images.haitiData,
    date: 'À paraître',
    read: '6 min',
  },
  {
    slug: 'mon-parcours-mba',
    category: 'Parcours',
    title: 'Mon parcours MBA en analytique d’affaires',
    excerpt:
      'Les apprentissages qui ont renforcé ma manière de relier analyse, stratégie et impact organisationnel.',
    image: images.mba,
    date: 'À paraître',
    read: '5 min',
  },
  {
    slug: 'fonder-datakle',
    category: 'Entrepreneuriat',
    title: 'Ce que j’ai appris en fondant Datakle',
    excerpt:
      'Créer une entreprise data, c’est d’abord clarifier les problèmes que l’on souhaite résoudre et pour qui.',
    image: images.datakle,
    date: 'À paraître',
    read: '7 min',
  },
  {
    slug: 'visualisation-outil-decision',
    category: 'Visualisation',
    title: 'La visualisation comme outil de décision',
    excerpt:
      'Un graphique réussi ne montre pas simplement des chiffres : il rend le prochain choix plus évident.',
    image: images.powerbi,
    date: 'À paraître',
    read: '4 min',
  },
  {
    slug: 'projets-vba-simplement',
    category: 'Automatisation',
    title: 'Mes projets VBA expliqués simplement',
    excerpt:
      'Comment automatiser des opérations répétitives sans transformer le fichier en boîte noire.',
    image: images.automation,
    date: 'À paraître',
    read: '6 min',
  },
]

export const journey = [
  {
    title: 'Diplôme d’ingénieur-agronome',
    text: 'Une formation multidisciplinaire pour comprendre les systèmes complexes, les dynamiques économiques et résoudre les problèmes avec une rigueur scientifique.',
    image: images.agronomy,
  },
  {
    title: 'Spécialisation en économie',
    text: 'Une compréhension approfondie des mécanismes qui influencent les décisions, les marchés, les politiques publiques et les leviers de performance.',
    image: images.economics,
  },
  {
    title: 'Gestion de projet & suivi-évaluation',
    text: 'Une orientation vers la planification, le pilotage et l’amélioration continue, renforcée par un DESS en suivi-évaluation.',
    image: images.evaluation,
  },
  {
    title: 'Recherche & analyse de données',
    text: 'Poser les bonnes questions, explorer les données avec méthode et transformer l’information en analyses fiables, claires et actionnables.',
    image: images.research,
  },
  {
    title: 'Stratégie analytique',
    text: 'Utiliser la donnée pour orienter les décisions, optimiser les processus et soutenir la vision des organisations.',
    image: images.strategy,
  },
  {
    title: 'Efficacité & impact',
    text: 'Simplifier, automatiser, clarifier et créer un impact concret, mesurable et durable.',
    image: images.efficiency,
  },
]

export const services = [
  {
    number: '01',
    title: 'Analyse de données',
    text: 'Explorer, structurer et interpréter vos données afin de faire ressortir les tendances et les décisions prioritaires.',
    deliverables: ['Diagnostic', 'Indicateurs', 'Recommandations'],
  },
  {
    number: '02',
    title: 'Visualisation',
    text: 'Créer des tableaux de bord clairs et adaptés aux personnes qui doivent suivre, expliquer et agir.',
    deliverables: ['Power BI', 'Rapports', 'Data storytelling'],
  },
  {
    number: '03',
    title: 'Automatisation',
    text: 'Réduire les tâches répétitives et fiabiliser les processus avec des solutions simples, documentées et maintenables.',
    deliverables: ['Excel & VBA', 'Access', 'Flux de travail'],
  },
  {
    number: '04',
    title: 'Solutions Web & data',
    text: 'Concevoir des outils numériques qui rendent l’information accessible et soutiennent les décisions en temps réel.',
    deliverables: ['Prototype', 'Portail data', 'Aide à la décision'],
  },
]
