import type { Block } from 'payload'

import { blockBaseFields, variantField } from '../fields/blockBase'
import { headlineField } from '../fields/headline'
import { linkField } from '../fields/link'

/** Bandeau d'appel à l'action (`.cta-band`, `.collab`). */
export const CtaBlock: Block = {
  slug: 'cta',
  interfaceName: 'CtaBlock',
  labels: { singular: 'Appel à l’action', plural: 'Appels à l’action' },
  fields: [
    ...blockBaseFields,
    variantField(
      [
        { label: 'Bandeau sombre avec flèche circulaire', value: 'band' },
        { label: 'Bandeau clair avec bouton', value: 'collab' },
      ],
      'band',
    ),
    { name: 'eyebrow', type: 'text', label: 'Surtitre', maxLength: 60 },
    headlineField({ label: 'Titre' }),
    // La variante « bandeau » rend un lien en flèche circulaire, sans texte :
    // le libellé y est facultatif et l'intitulé accessible obligatoire.
    linkField({ name: 'link', label: 'Destination', requireLabel: false }),
    {
      name: 'ariaLabel',
      type: 'text',
      label: 'Intitulé accessible du lien',
      maxLength: 80,
      validate: (value: string | null | undefined, { siblingData }: { siblingData: Record<string, unknown> }) => {
        if (siblingData?.variant === 'collab') return true
        if (!value || value.trim() === '') {
          return 'Obligatoire : ce lien n’affiche aucun texte, son intitulé accessible est la seule information pour les lecteurs d’écran.'
        }
        return true
      },
      admin: {
        description:
          'Utilisé par la variante « flèche circulaire », dont le lien n’affiche aucun texte. Ex. « Me contacter ».',
        condition: (_d, s) => s?.variant !== 'collab',
      },
    },
  ],
}

/** Colonne de coordonnées de la page contact (`.contact-aside`). */
export const ContactInfoBlock: Block = {
  slug: 'contactInfo',
  interfaceName: 'ContactInfoBlock',
  labels: { singular: 'Coordonnées', plural: 'Coordonnées' },
  fields: [
    ...blockBaseFields,
    {
      name: 'items',
      type: 'array',
      label: 'Entrées',
      labels: { singular: 'Entrée', plural: 'Entrées' },
      minRows: 1,
      admin: { description: 'Chaque entrée affiche un libellé et une valeur.' },
      fields: [
        { name: 'label', type: 'text', label: 'Libellé', required: true, maxLength: 40 },
        {
          name: 'kind',
          type: 'select',
          label: 'Type de valeur',
          defaultValue: 'text',
          options: [
            { label: 'Texte simple', value: 'text' },
            { label: 'Adresse courriel (lien mailto)', value: 'email' },
            { label: 'Lien', value: 'link' },
          ],
        },
        { name: 'value', type: 'text', label: 'Valeur affichée', required: true, maxLength: 200 },
        {
          name: 'href',
          type: 'text',
          label: 'Destination',
          admin: {
            condition: (_d, s) => s?.kind === 'link',
            description: 'Chemin interne (/legal) ou URL complète (https://…).',
          },
        },
      ],
    },
    {
      name: 'socials',
      type: 'group',
      label: 'Réseaux sociaux',
      admin: {
        description:
          'Reprend automatiquement les réseaux définis dans « Réglages du site ». Aucune saisie à dupliquer ici.',
      },
      fields: [
        { name: 'enabled', type: 'checkbox', label: 'Afficher les réseaux', defaultValue: false },
        {
          name: 'label',
          type: 'text',
          label: 'Libellé de la rubrique',
          maxLength: 40,
          admin: { condition: (_d, s) => Boolean(s?.enabled) },
        },
        {
          name: 'hidePending',
          type: 'checkbox',
          label: 'Masquer les réseaux sans adresse',
          defaultValue: false,
          admin: {
            condition: (_d, s) => Boolean(s?.enabled),
            description:
              'Décoché, un réseau sans adresse reste visible avec sa mention « à confirmer ».',
          },
        },
      ],
    },
    {
      name: 'availability',
      type: 'group',
      label: 'Indicateur de disponibilité',
      fields: [
        { name: 'enabled', type: 'checkbox', label: 'Afficher', defaultValue: true },
        {
          name: 'text',
          type: 'text',
          label: 'Message',
          maxLength: 120,
          admin: { condition: (_d, s) => Boolean(s?.enabled) },
        },
      ],
    },
  ],
}

/**
 * Formulaire de contact.
 * Seuls les libellés, messages et sujets sont éditables : la structure des
 * champs et la validation restent définies dans le code.
 */
export const ContactFormBlock: Block = {
  slug: 'contactForm',
  interfaceName: 'ContactFormBlock',
  labels: { singular: 'Formulaire de contact', plural: 'Formulaires de contact' },
  fields: [
    ...blockBaseFields,
    {
      name: 'labels',
      type: 'group',
      label: 'Libellés des champs',
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'name', type: 'text', label: 'Nom', required: true, admin: { width: '50%' } },
            { name: 'namePlaceholder', type: 'text', label: 'Indication — nom', admin: { width: '50%' } },
          ],
        },
        {
          type: 'row',
          fields: [
            { name: 'email', type: 'text', label: 'Courriel', required: true, admin: { width: '50%' } },
            { name: 'emailPlaceholder', type: 'text', label: 'Indication — courriel', admin: { width: '50%' } },
          ],
        },
        {
          type: 'row',
          fields: [
            { name: 'organisation', type: 'text', label: 'Organisation', required: true, admin: { width: '50%' } },
            { name: 'organisationPlaceholder', type: 'text', label: 'Indication — organisation', admin: { width: '50%' } },
          ],
        },
        {
          type: 'row',
          fields: [
            { name: 'subject', type: 'text', label: 'Sujet', required: true, admin: { width: '50%' } },
            { name: 'subjectPlaceholder', type: 'text', label: 'Indication — sujet', admin: { width: '50%' } },
          ],
        },
        {
          type: 'row',
          fields: [
            { name: 'message', type: 'text', label: 'Message', required: true, admin: { width: '50%' } },
            { name: 'messagePlaceholder', type: 'text', label: 'Indication — message', admin: { width: '50%' } },
          ],
        },
        { name: 'consent', type: 'textarea', label: 'Texte de consentement', required: true, maxLength: 400 },
        { name: 'submit', type: 'text', label: 'Bouton d’envoi', required: true, maxLength: 60 },
      ],
    },
    {
      name: 'subjects',
      type: 'array',
      label: 'Sujets proposés',
      labels: { singular: 'Sujet', plural: 'Sujets' },
      minRows: 1,
      admin: { description: 'Options de la liste déroulante « Sujet ».' },
      fields: [{ name: 'label', type: 'text', label: 'Libellé', required: true, maxLength: 80 }],
    },
    {
      name: 'messages',
      type: 'group',
      label: 'Messages de retour',
      fields: [
        { name: 'success', type: 'textarea', label: 'Succès', required: true, maxLength: 400 },
        { name: 'error', type: 'textarea', label: 'Erreur', required: true, maxLength: 400 },
        {
          name: 'rateLimited',
          type: 'textarea',
          label: 'Trop de tentatives',
          maxLength: 400,
          admin: { description: 'Affiché lorsque la limitation de débit se déclenche.' },
        },
      ],
    },
  ],
}

/** Formulaire d'inscription à l'infolettre (`.newsletter`). */
export const NewsletterFormBlock: Block = {
  slug: 'newsletterForm',
  interfaceName: 'NewsletterFormBlock',
  labels: { singular: 'Formulaire d’infolettre', plural: 'Formulaires d’infolettre' },
  fields: [
    ...blockBaseFields,
    { name: 'eyebrow', type: 'text', label: 'Surtitre', maxLength: 60 },
    headlineField({ label: 'Titre', required: false }),
    {
      type: 'row',
      fields: [
        { name: 'emailLabel', type: 'text', label: 'Libellé du champ', required: true, admin: { width: '50%' } },
        { name: 'placeholder', type: 'text', label: 'Indication', admin: { width: '50%' } },
      ],
    },
    { name: 'buttonLabel', type: 'text', label: 'Bouton', required: true, maxLength: 60 },
    { name: 'consent', type: 'textarea', label: 'Mention de consentement', maxLength: 400 },
    {
      name: 'messages',
      type: 'group',
      label: 'Messages de retour',
      fields: [
        { name: 'success', type: 'text', label: 'Succès', required: true, maxLength: 200 },
        { name: 'alreadySubscribed', type: 'text', label: 'Déjà inscrit', maxLength: 200 },
        { name: 'error', type: 'text', label: 'Erreur', required: true, maxLength: 200 },
        { name: 'rateLimited', type: 'text', label: 'Trop de tentatives', maxLength: 200 },
      ],
    },
    {
      name: 'source',
      type: 'text',
      label: 'Origine de l’inscription',
      maxLength: 60,
      admin: {
        description:
          'Enregistré avec chaque abonné pour savoir d’où vient l’inscription. Ex. « pied-de-page », « blog ».',
      },
    },
  ],
}

/** Corps juridique avec sommaire ancré (`.legal-layout`). */
export const LegalContentBlock: Block = {
  slug: 'legalContent',
  interfaceName: 'LegalContentBlock',
  labels: { singular: 'Contenu juridique', plural: 'Contenus juridiques' },
  fields: [
    ...blockBaseFields,
    {
      name: 'warning',
      type: 'group',
      label: 'Avertissement',
      admin: {
        description:
          'Encart affiché en tête du contenu juridique, à l’intérieur de la colonne de texte.',
      },
      fields: [
        { name: 'enabled', type: 'checkbox', label: 'Afficher l’avertissement', defaultValue: false },
        {
          name: 'text',
          type: 'textarea',
          label: 'Texte',
          maxLength: 700,
          admin: { condition: (_d, s) => Boolean(s?.enabled) },
        },
      ],
    },
    {
      name: 'tocLabel',
      type: 'text',
      label: 'Intitulé accessible du sommaire',
      maxLength: 80,
      admin: { description: 'Lu par les lecteurs d’écran. Ex. « Sommaire juridique ».' },
    },
    {
      name: 'sections',
      type: 'array',
      label: 'Sections',
      labels: { singular: 'Section', plural: 'Sections' },
      minRows: 1,
      admin: { description: 'Chaque section alimente automatiquement le sommaire latéral.' },
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'number', type: 'text', label: 'Numéro', maxLength: 4, admin: { width: '20%' } },
            { name: 'title', type: 'text', label: 'Titre', required: true, maxLength: 140, admin: { width: '80%' } },
          ],
        },
        {
          name: 'anchor',
          type: 'text',
          label: 'Ancre',
          required: true,
          maxLength: 60,
          admin: { description: 'Identifiant utilisé dans l’URL, sans dièse. Ex. « confidentialite ».' },
        },
        { name: 'content', type: 'richText', label: 'Contenu', required: true },
      ],
    },
    {
      name: 'lastUpdated',
      type: 'date',
      label: 'Dernière mise à jour',
      admin: { date: { pickerAppearance: 'dayOnly', displayFormat: 'd MMMM yyyy' } },
    },
  ],
}

