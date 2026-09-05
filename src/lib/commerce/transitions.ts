/**
 * Transitions de statut, contrôlées par le serveur.
 *
 * Un statut n'est jamais accepté tel quel depuis une requête : la transition
 * demandée est confrontée à ces tables. Cela empêche par exemple qu'un client
 * fasse passer sa demande de `draft` à `accepted` en sautant l'envoi de la
 * proposition, ou qu'une facture annulée redevienne payée.
 *
 * Module pur : aucune dépendance serveur, directement testable.
 */

// --- Demandes de devis --------------------------------------------------------

export const QUOTE_STATUSES = [
  'draft',
  'submitted',
  'in_review',
  'quoted',
  'accepted',
  'declined',
  'closed',
] as const

export type QuoteStatus = (typeof QUOTE_STATUSES)[number]

/** Qui peut demander la transition. */
export type Actor = 'customer' | 'staff'

const QUOTE_TRANSITIONS: Record<QuoteStatus, { to: QuoteStatus; by: Actor[] }[]> = {
  // Un brouillon appartient au client : lui seul l'envoie.
  draft: [
    { to: 'submitted', by: ['customer'] },
    { to: 'closed', by: ['customer', 'staff'] },
  ],
  submitted: [
    { to: 'in_review', by: ['staff'] },
    { to: 'closed', by: ['staff'] },
  ],
  in_review: [
    { to: 'quoted', by: ['staff'] },
    { to: 'closed', by: ['staff'] },
  ],
  // Une proposition est parvenue au client : à lui de décider.
  quoted: [
    { to: 'accepted', by: ['customer'] },
    { to: 'declined', by: ['customer'] },
    { to: 'closed', by: ['staff'] },
  ],
  // États terminaux : seule la clôture administrative reste possible.
  accepted: [{ to: 'closed', by: ['staff'] }],
  declined: [{ to: 'closed', by: ['staff'] }],
  closed: [],
}

// --- Propositions -------------------------------------------------------------

export const PROPOSAL_STATUSES = ['draft', 'sent', 'accepted', 'declined', 'expired'] as const

export type ProposalStatus = (typeof PROPOSAL_STATUSES)[number]

const PROPOSAL_TRANSITIONS: Record<ProposalStatus, { to: ProposalStatus; by: Actor[] }[]> = {
  draft: [{ to: 'sent', by: ['staff'] }],
  // Une proposition envoyée est figée : son contenu ne change plus, seule la
  // décision du client ou l'expiration la fait évoluer.
  sent: [
    { to: 'accepted', by: ['customer'] },
    { to: 'declined', by: ['customer'] },
    { to: 'expired', by: ['staff'] },
  ],
  accepted: [],
  declined: [],
  expired: [],
}

// --- Factures -----------------------------------------------------------------

export const INVOICE_STATUSES = [
  'draft',
  'sent',
  'partially_paid',
  'paid',
  'overdue',
  'cancelled',
] as const

export type InvoiceStatus = (typeof INVOICE_STATUSES)[number]

const INVOICE_TRANSITIONS: Record<InvoiceStatus, { to: InvoiceStatus; by: Actor[] }[]> = {
  draft: [
    { to: 'sent', by: ['staff'] },
    { to: 'cancelled', by: ['staff'] },
  ],
  sent: [
    { to: 'partially_paid', by: ['staff'] },
    { to: 'paid', by: ['staff'] },
    { to: 'overdue', by: ['staff'] },
    { to: 'cancelled', by: ['staff'] },
  ],
  partially_paid: [
    { to: 'paid', by: ['staff'] },
    { to: 'overdue', by: ['staff'] },
    { to: 'cancelled', by: ['staff'] },
  ],
  overdue: [
    { to: 'partially_paid', by: ['staff'] },
    { to: 'paid', by: ['staff'] },
    { to: 'cancelled', by: ['staff'] },
  ],
  // Une facture réglée ou annulée est définitive : on émet un avoir ou une
  // nouvelle facture plutôt que de réécrire l'historique comptable.
  paid: [],
  cancelled: [],
}

// --- Rendez-vous ---------------------------------------------------------------

export const APPOINTMENT_STATUSES = [
  'requested',
  'confirmed',
  'completed',
  'cancelled',
  'no_show',
] as const

export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number]

const APPOINTMENT_TRANSITIONS: Record<AppointmentStatus, { to: AppointmentStatus; by: Actor[] }[]> =
  {
    requested: [
      { to: 'confirmed', by: ['staff'] },
      { to: 'cancelled', by: ['customer', 'staff'] },
    ],
    confirmed: [
      { to: 'completed', by: ['staff'] },
      { to: 'cancelled', by: ['customer', 'staff'] },
      { to: 'no_show', by: ['staff'] },
    ],
    completed: [],
    cancelled: [],
    no_show: [],
  }

// --- Vérification générique -----------------------------------------------------

type TransitionTable<S extends string> = Record<S, { to: S; by: Actor[] }[]>

const check = <S extends string>(
  table: TransitionTable<S>,
  from: S,
  to: S,
  actor: Actor,
): boolean => {
  // Rester dans le même statut est toujours acceptable : cela permet de
  // modifier d'autres champs sans transition.
  if (from === to) return true
  const allowed = table[from]
  if (!allowed) return false
  return allowed.some((entry) => entry.to === to && entry.by.includes(actor))
}

export const canTransitionQuote = (from: QuoteStatus, to: QuoteStatus, actor: Actor): boolean =>
  check(QUOTE_TRANSITIONS, from, to, actor)

export const canTransitionProposal = (
  from: ProposalStatus,
  to: ProposalStatus,
  actor: Actor,
): boolean => check(PROPOSAL_TRANSITIONS, from, to, actor)

export const canTransitionInvoice = (
  from: InvoiceStatus,
  to: InvoiceStatus,
  actor: Actor,
): boolean => check(INVOICE_TRANSITIONS, from, to, actor)

export const canTransitionAppointment = (
  from: AppointmentStatus,
  to: AppointmentStatus,
  actor: Actor,
): boolean => check(APPOINTMENT_TRANSITIONS, from, to, actor)

/**
 * Une proposition envoyée est immuable.
 * Seul le statut peut encore évoluer ; lignes, montants et conditions sont figés
 * au moment de l'envoi, faute de quoi le document accepté par le client ne
 * correspondrait plus à ce qu'il a accepté.
 */
export const isProposalLocked = (status: ProposalStatus): boolean => status !== 'draft'

/** Une facture n'est modifiable que tant qu'elle est en brouillon. */
export const isInvoiceLocked = (status: InvoiceStatus): boolean => status !== 'draft'

/** Statuts considérés comme occupant un créneau (anti-double-réservation). */
export const ACTIVE_APPOINTMENT_STATUSES: AppointmentStatus[] = ['requested', 'confirmed']
