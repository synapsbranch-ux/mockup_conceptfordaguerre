import type { LucideIcon } from 'lucide-react'
import {
  BadgeEuro,
  Bell,
  Bookmark,
  Building2,
  CalendarClock,
  CalendarCog,
  FileSignature,
  FileStack,
  FileText,
  FolderKanban,
  Gauge,
  Inbox,
  LayoutDashboard,
  Mail,
  MessageSquare,
  MessagesSquare,
  Newspaper,
  ReceiptText,
  ScrollText,
  Send,
  Settings,
  ShieldAlert,
  Sparkles,
  Tags,
  Users,
} from 'lucide-react'

/**
 * Modèle de navigation des deux tableaux de bord.
 *
 * Déclaratif et partagé, pour que la barre latérale, le fil d'Ariane et la
 * recherche décrivent tous la même arborescence : un intitulé ne peut pas
 * diverger d'un écran à l'autre.
 *
 * `badge` nomme un compteur calculé côté serveur. Un compteur absent ou nul
 * n'affiche rien — jamais un zéro décoratif ni une valeur inventée.
 */

export type NavItem = {
  title: string
  href: string
  icon: LucideIcon
  /** Clé du compteur, résolue côté serveur. */
  badge?: BadgeKey
  /** Correspondance exacte plutôt que par préfixe (utile pour les racines). */
  exact?: boolean
}

export type NavGroup = {
  label: string
  items: NavItem[]
}

/** Compteurs affichables. Tous adossés à une requête réelle. */
export type BadgeKey =
  | 'unreadMessages'
  | 'unreadNotifications'
  | 'proposalsAwaitingDecision'
  | 'unpaidInvoices'
  | 'upcomingAppointments'
  | 'newDocuments'
  | 'quotesToProcess'
  | 'adminUnreadConversations'
  | 'newContactMessages'
  | 'appointmentsToConfirm'
  | 'commentsToModerate'
  | 'forumReports'
  | 'activeProjects'

export type BadgeCounts = Partial<Record<BadgeKey, number>>

// --- Espace client ------------------------------------------------------------

export const CUSTOMER_NAV: NavGroup[] = [
  {
    label: 'Aperçu',
    items: [
      {
        title: 'Tableau de bord',
        href: '/espace-client',
        icon: LayoutDashboard,
        exact: true,
      },
      {
        title: 'Notifications',
        href: '/espace-client/notifications',
        icon: Bell,
        badge: 'unreadNotifications',
      },
    ],
  },
  {
    label: 'Prestations',
    items: [
      { title: 'Devis', href: '/espace-client/devis', icon: FileSignature },
      {
        title: 'Propositions',
        href: '/espace-client/propositions',
        icon: ScrollText,
        badge: 'proposalsAwaitingDecision',
      },
      { title: 'Services', href: '/espace-client/services', icon: Sparkles },
      { title: 'Projets', href: '/espace-client/projets', icon: FolderKanban },
      {
        title: 'Factures',
        href: '/espace-client/factures',
        icon: ReceiptText,
        badge: 'unpaidInvoices',
      },
    ],
  },
  {
    label: 'Échanges',
    items: [
      {
        title: 'Messages',
        href: '/espace-client/messages',
        icon: MessageSquare,
        badge: 'unreadMessages',
      },
      {
        title: 'Rendez-vous',
        href: '/espace-client/rendez-vous',
        icon: CalendarClock,
        badge: 'upcomingAppointments',
      },
      {
        title: 'Documents',
        href: '/espace-client/documents',
        icon: FileStack,
        badge: 'newDocuments',
      },
    ],
  },
  {
    label: 'Communauté',
    items: [
      { title: 'Articles', href: '/espace-client/articles', icon: Newspaper },
      { title: 'Favoris', href: '/espace-client/favoris', icon: Bookmark },
      { title: 'Forum', href: '/forum', icon: MessagesSquare },
    ],
  },
  {
    label: 'Compte',
    items: [{ title: 'Profil', href: '/espace-client/profil', icon: Building2 }],
  },
]

// --- Administration -----------------------------------------------------------

export const ADMIN_NAV: NavGroup[] = [
  {
    label: 'Pilotage',
    items: [{ title: 'Tableau de bord', href: '/admin', icon: Gauge, exact: true }],
  },
  {
    label: 'Commercial',
    items: [
      {
        title: 'Devis',
        href: '/admin/devis',
        icon: FileSignature,
        badge: 'quotesToProcess',
      },
      { title: 'Propositions', href: '/admin/propositions', icon: ScrollText },
      { title: 'Factures', href: '/admin/factures', icon: ReceiptText },
      { title: 'Paiements', href: '/admin/paiements', icon: BadgeEuro },
      {
        title: 'Projets',
        href: '/admin/projets',
        icon: FolderKanban,
        badge: 'activeProjects',
      },
      { title: 'Services', href: '/admin/services', icon: Sparkles },
    ],
  },
  {
    label: 'Relation client',
    items: [
      { title: 'Clients', href: '/admin/clients', icon: Users },
      {
        title: 'Conversations',
        href: '/admin/conversations',
        icon: MessageSquare,
        badge: 'adminUnreadConversations',
      },
      {
        title: 'Messages de contact',
        href: '/admin/contact',
        icon: Inbox,
        badge: 'newContactMessages',
      },
      {
        title: 'Rendez-vous',
        href: '/admin/rendez-vous',
        icon: CalendarClock,
        badge: 'appointmentsToConfirm',
      },
      { title: 'Disponibilités', href: '/admin/disponibilites', icon: CalendarCog },
    ],
  },
  {
    label: 'Contenu et communauté',
    items: [
      { title: 'Articles', href: '/admin/articles', icon: Newspaper },
      {
        title: 'Commentaires',
        href: '/admin/commentaires',
        icon: MessagesSquare,
        badge: 'commentsToModerate',
      },
      { title: 'Catégories du forum', href: '/admin/forum/categories', icon: Tags },
      { title: 'Discussions', href: '/admin/forum/discussions', icon: MessagesSquare },
      {
        title: 'Signalements',
        href: '/admin/forum/signalements',
        icon: ShieldAlert,
        badge: 'forumReports',
      },
      { title: 'Documents', href: '/admin/documents', icon: FileStack },
    ],
  },
  {
    label: 'Diffusion',
    items: [
      { title: 'Abonnés', href: '/admin/infolettre/abonnes', icon: Mail },
      { title: 'Campagnes', href: '/admin/infolettre/campagnes', icon: Send },
    ],
  },
  {
    label: 'Système',
    items: [
      { title: 'Pages et médias (CMS)', href: '/cms', icon: FileText },
      { title: 'Journal d’activité', href: '/admin/journal', icon: ScrollText },
      { title: 'Paramètres', href: '/admin/parametres', icon: Settings },
    ],
  },
]

/** Vrai lorsque `pathname` correspond à l'entrée de navigation. */
export const isNavItemActive = (item: NavItem, pathname: string): boolean => {
  if (item.exact) return pathname === item.href
  return pathname === item.href || pathname.startsWith(`${item.href}/`)
}

/**
 * Fil d'Ariane déduit du chemin, en s'appuyant sur le modèle ci-dessus.
 * Un segment inconnu du modèle est affiché tel quel, remis en forme.
 */
export const breadcrumbFor = (
  groups: NavGroup[],
  pathname: string,
  rootLabel: string,
  rootHref: string,
): { label: string; href: string }[] => {
  const trail: { label: string; href: string }[] = [{ label: rootLabel, href: rootHref }]
  if (pathname === rootHref) return trail

  const items = groups.flatMap((group) => group.items)
  const match = items
    .filter((item) => !item.exact && isNavItemActive(item, pathname))
    // Le libellé le plus spécifique gagne (`/admin/forum/categories` avant `/admin/forum`).
    .sort((a, b) => b.href.length - a.href.length)[0]

  if (match) {
    trail.push({ label: match.title, href: match.href })
    if (pathname !== match.href) {
      const rest = pathname.slice(match.href.length + 1)
      if (rest) trail.push({ label: humanize(rest), href: pathname })
    }
  } else {
    const rest = pathname.slice(rootHref.length + 1)
    if (rest) trail.push({ label: humanize(rest), href: pathname })
  }

  return trail
}

/** `mon-segment/123` → `Mon segment` : lisible sans être trompeur. */
const humanize = (segment: string): string => {
  const first = segment.split('/')[0].replace(/-/g, ' ')
  return first.charAt(0).toUpperCase() + first.slice(1)
}
