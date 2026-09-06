/**
 * Bilinguisme français / anglais.
 *
 * Le français est la langue de référence et vit **sans préfixe** : `/blog`,
 * `/forum`, `/projects/[slug]`. C'est un choix délibéré — toutes les URLs
 * publiques existantes restent inchangées, sans redirection ni perte de
 * référencement.
 *
 * L'anglais vit sous `/en/…`. Il est **optionnel** : un contenu non traduit
 * retombe sur le français plutôt que d'afficher une page vide, conformément au
 * repli configuré côté Payload.
 *
 * Module pur : aucune dépendance serveur, donc utilisable des deux côtés et
 * directement testable.
 */

export const LOCALES = ['fr', 'en'] as const

export type Locale = (typeof LOCALES)[number]

export const DEFAULT_LOCALE: Locale = 'fr'

/** Préfixe d'URL d'une locale. Le français n'en a pas. */
export const localePrefix = (locale: Locale): string => (locale === DEFAULT_LOCALE ? '' : `/${locale}`)

const LOCALE_SET: ReadonlySet<string> = new Set(LOCALES)

/** Normalise une valeur de locale. Toute valeur inconnue retombe sur le français. */
export const normalizeLocale = (value: unknown): Locale => {
  if (typeof value !== 'string') return DEFAULT_LOCALE
  const trimmed = value.trim().toLowerCase()
  return LOCALE_SET.has(trimmed) ? (trimmed as Locale) : DEFAULT_LOCALE
}

/**
 * Déduit la locale d'un chemin.
 * `/en/blog` → `en`, `/blog` → `fr`.
 */
export const localeFromPath = (pathname: string): Locale => {
  const segments = pathname.split('/').filter(Boolean)
  return segments[0] === 'en' ? 'en' : DEFAULT_LOCALE
}

/**
 * Retire le préfixe de locale d'un chemin.
 * `/en/blog/mon-article` → `/blog/mon-article`.
 */
export const stripLocale = (pathname: string): string => {
  if (pathname === '/en') return '/'
  if (pathname.startsWith('/en/')) return pathname.slice(3)
  return pathname
}

/**
 * Construit le chemin d'une page dans une locale donnée.
 * `localizedPath('/blog', 'en')` → `/en/blog`.
 */
export const localizedPath = (path: string, locale: Locale): string => {
  const clean = stripLocale(path.startsWith('/') ? path : `/${path}`)
  if (locale === DEFAULT_LOCALE) return clean
  return clean === '/' ? '/en' : `/en${clean}`
}

/**
 * Alternatives `hreflang` d'une page, pour les métadonnées.
 *
 * Chaque version est **canonique d'elle-même**, et les deux se déclarent
 * mutuellement par `hreflang`. C'est la règle : faire pointer la canonique de
 * la version anglaise vers la française reviendrait à demander aux moteurs de
 * ne pas indexer l'anglais — exactement l'inverse du but recherché.
 *
 * `x-default` désigne le français, servi aux visiteurs dont la langue n'est
 * couverte par aucune version.
 */
export const alternatesFor = (
  path: string,
  serverURL: string,
  locale: Locale = DEFAULT_LOCALE,
): { canonical: string; languages: Record<string, string> } => {
  const clean = stripLocale(path.startsWith('/') ? path : `/${path}`)
  const fr = `${serverURL}${clean === '/' ? '' : clean}`
  const en = `${serverURL}/en${clean === '/' ? '' : clean}`

  return {
    canonical: locale === 'en' ? en : fr,
    languages: { fr, en, 'x-default': fr },
  }
}

// --- Libellés d'interface -----------------------------------------------------

/**
 * Chaînes de l'ossature du site.
 *
 * Seuls les libellés **structurels** vivent ici — navigation, boutons, états
 * vides génériques. Tout ce qui est éditorial (titres de section, textes
 * d'accueil, règles du forum) reste administrable dans le CMS : une
 * reformulation ne doit jamais demander un déploiement.
 */
type Dictionary = {
  skipToContent: string
  languageLabel: string
  switchToFrench: string
  switchToEnglish: string
  readMore: string
  backToList: string
  publishedOn: string
  readingTime: string
  signIn: string
  signUp: string
  clientArea: string
  requestQuote: string
  bookMeeting: string
  contactUs: string
  resources: string
  forum: string
  blog: string
  search: string
  noResults: string
  loading: string
  errorTitle: string
  errorBody: string
  retry: string
  translationNotice: string
}

const FR: Dictionary = {
  skipToContent: 'Aller au contenu',
  languageLabel: 'Langue',
  switchToFrench: 'Français',
  switchToEnglish: 'English',
  readMore: 'Lire la suite',
  backToList: 'Retour à la liste',
  publishedOn: 'Publié le',
  readingTime: 'de lecture',
  signIn: 'Se connecter',
  signUp: 'Créer un compte',
  clientArea: 'Espace client',
  requestQuote: 'Demander un devis',
  bookMeeting: 'Réserver une rencontre',
  contactUs: 'Nous écrire',
  resources: 'Ressources',
  forum: 'Forum',
  blog: 'Blog',
  search: 'Rechercher',
  noResults: 'Aucun résultat.',
  loading: 'Chargement…',
  errorTitle: 'Une erreur est survenue',
  errorBody: 'Cette page n’a pas pu être affichée. Réessayez dans un instant.',
  retry: 'Réessayer',
  translationNotice: '',
}

const EN: Dictionary = {
  skipToContent: 'Skip to content',
  languageLabel: 'Language',
  switchToFrench: 'Français',
  switchToEnglish: 'English',
  readMore: 'Read more',
  backToList: 'Back to list',
  publishedOn: 'Published on',
  readingTime: 'read',
  signIn: 'Sign in',
  signUp: 'Create an account',
  clientArea: 'Client area',
  requestQuote: 'Request a quote',
  bookMeeting: 'Book a meeting',
  contactUs: 'Contact us',
  resources: 'Resources',
  forum: 'Forum',
  blog: 'Blog',
  search: 'Search',
  noResults: 'No results.',
  loading: 'Loading…',
  errorTitle: 'Something went wrong',
  errorBody: 'This page could not be displayed. Please try again shortly.',
  retry: 'Try again',
  // Affiché lorsqu'un contenu n'existe qu'en français : mieux vaut le dire que
  // laisser croire à une traduction absente par oubli.
  translationNotice: 'This content is only available in French.',
}

const DICTIONARIES: Record<Locale, Dictionary> = { fr: FR, en: EN }

export const dictionary = (locale: Locale): Dictionary => DICTIONARIES[locale] ?? FR

/** Étiquette de langue pour l'attribut `lang` du document. */
export const htmlLang = (locale: Locale): string => (locale === 'en' ? 'en' : 'fr')
