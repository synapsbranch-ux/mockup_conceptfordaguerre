import type { GlobalConfig } from 'payload'

import { anyone, authenticated } from '../access'
import { headlineField } from '../fields/headline'
import { revalidateGlobal } from '../hooks/revalidate'

/** Identité, coordonnées et valeurs SEO par défaut du site. */
export const SiteSettings: GlobalConfig = {
  slug: 'siteSettings',
  label: 'Réglages du site',
  admin: {
    group: 'Configuration',
    description:
      'Informations utilisées partout sur le site. Les mentions « à confirmer » restent affichées telles quelles tant que le client ne les a pas validées.',
  },
  access: { read: anyone, update: authenticated },
  hooks: { afterChange: [revalidateGlobal('globals')] },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Identité',
          fields: [
            { name: 'siteName', type: 'text', label: 'Nom du site', required: true, maxLength: 120 },
            { name: 'brandName', type: 'text', label: 'Nom de marque', maxLength: 120 },
            {
              type: 'row',
              fields: [
                {
                  name: 'brandInitials',
                  type: 'text',
                  label: 'Initiales du logo',
                  maxLength: 4,
                  admin: { width: '30%', description: 'Affichées dans la pastille ronde. Ex. « JD ».' },
                },
                {
                  name: 'tagline',
                  type: 'text',
                  label: 'Signature',
                  maxLength: 120,
                  admin: { width: '70%', description: 'Ex. « Data · Stratégie · Impact ».' },
                },
              ],
            },
            {
              name: 'copyright',
              type: 'text',
              label: 'Mention de copyright',
              maxLength: 160,
            },
          ],
        },
        {
          label: 'Contact',
          fields: [
            { name: 'email', type: 'email', label: 'Courriel professionnel' },
            { name: 'location', type: 'text', label: 'Localisation', maxLength: 160 },
            {
              name: 'availability',
              type: 'text',
              label: 'Message de disponibilité',
              maxLength: 200,
            },
            {
              name: 'appointmentUrl',
              type: 'text',
              label: 'Lien de prise de rendez-vous',
              maxLength: 400,
              admin: {
                description:
                  'URL Calendly ou équivalent. Laisser vide tant qu’elle n’est pas fournie : le site affichera alors la mention « à confirmer » définie ci-dessous.',
              },
            },
            {
              name: 'appointmentPending',
              type: 'text',
              label: 'Mention si aucun lien de rendez-vous',
              maxLength: 200,
            },
          ],
        },
        {
          label: 'Réseaux sociaux',
          description:
            'Un réseau sans URL est affiché comme « à confirmer » plutôt que masqué, afin de ne pas inventer d’information.',
          fields: [
            {
              name: 'socials',
              type: 'array',
              label: 'Réseaux',
              labels: { singular: 'Réseau', plural: 'Réseaux' },
              admin: {
                description:
                  'Glisser-déposer pour réordonner. Choisir « Autre » pour un réseau absent de la liste : une icône générique est alors utilisée.',
              },
              fields: [
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'network',
                      type: 'select',
                      label: 'Réseau',
                      required: true,
                      defaultValue: 'custom',
                      admin: { width: '40%', description: 'Détermine l’icône affichée.' },
                      options: [
                        { label: 'LinkedIn', value: 'linkedin' },
                        { label: 'GitHub', value: 'github' },
                        { label: 'Medium', value: 'medium' },
                        { label: 'YouTube', value: 'youtube' },
                        { label: 'Instagram', value: 'instagram' },
                        { label: 'X (Twitter)', value: 'x' },
                        { label: 'Facebook', value: 'facebook' },
                        { label: 'Bluesky', value: 'bluesky' },
                        { label: 'TikTok', value: 'tiktok' },
                        { label: 'Threads', value: 'threads' },
                        { label: 'Mastodon', value: 'mastodon' },
                        { label: 'Substack', value: 'substack' },
                        { label: 'WhatsApp', value: 'whatsapp' },
                        { label: 'Courriel', value: 'email' },
                        { label: 'Autre (icône générique)', value: 'custom' },
                      ],
                    },
                    {
                      name: 'label',
                      type: 'text',
                      label: 'Nom affiché',
                      required: true,
                      maxLength: 40,
                      admin: {
                        width: '60%',
                        description: 'Texte du lien. Ex. « LinkedIn ».',
                      },
                    },
                  ],
                },
                {
                  name: 'url',
                  type: 'text',
                  label: 'Adresse',
                  maxLength: 400,
                  validate: (value: string | null | undefined) => {
                    if (!value || value.trim() === '') return true
                    const trimmed = value.trim()
                    if (trimmed.startsWith('mailto:') && trimmed.includes('@')) return true
                    try {
                      const url = new URL(trimmed)
                      if (url.protocol === 'http:' || url.protocol === 'https:') return true
                      return 'Seules les adresses http(s) et mailto: sont acceptées.'
                    } catch {
                      return 'Adresse invalide. Saisir une URL complète, par exemple https://linkedin.com/in/…'
                    }
                  },
                  admin: {
                    description:
                      'URL complète (https://…) ou mailto:. Laisser vide tant que l’adresse n’est pas connue : le site affichera alors la mention ci-dessous.',
                  },
                },
                {
                  name: 'pendingLabel',
                  type: 'text',
                  label: 'Mention affichée tant qu’aucune adresse n’est saisie',
                  defaultValue: 'à confirmer',
                  maxLength: 40,
                },
                {
                  name: 'showInHeader',
                  type: 'checkbox',
                  label: 'Afficher aussi dans la page Contact',
                  defaultValue: true,
                },
              ],
            },
          ],
        },
        {
          label: 'Référencement par défaut',
          fields: [
            {
              name: 'defaultSeoTitle',
              type: 'text',
              label: 'Titre SEO par défaut',
              maxLength: 70,
            },
            {
              name: 'defaultSeoDescription',
              type: 'textarea',
              label: 'Description SEO par défaut',
              maxLength: 180,
            },
            {
              name: 'defaultSeoImage',
              type: 'upload',
              relationTo: 'media',
              label: 'Image de partage par défaut',
            },
            {
              name: 'titleTemplate',
              type: 'text',
              label: 'Gabarit de titre',
              maxLength: 80,
              admin: {
                description:
                  'Utiliser %s à l’emplacement du titre de la page. Ex. « %s | Jacques-Daguerre Valcy ».',
              },
            },
            {
              name: 'keywords',
              type: 'array',
              label: 'Mots-clés',
              labels: { singular: 'Mot-clé', plural: 'Mots-clés' },
              admin: {
                description:
                  'Facultatif. Peu utilisé par Google, mais repris par certains moteurs et agrégateurs.',
              },
              fields: [{ name: 'label', type: 'text', label: 'Mot-clé', required: true, maxLength: 60 }],
            },
            {
              name: 'verification',
              type: 'group',
              label: 'Vérification de propriété',
              admin: {
                description:
                  'Codes fournis par les consoles de recherche pour confirmer que le site vous appartient.',
              },
              fields: [
                {
                  name: 'google',
                  type: 'text',
                  label: 'Google Search Console',
                  maxLength: 120,
                  admin: {
                    description:
                      'Contenu de la balise « google-site-verification ». Coller uniquement le code, pas la balise entière.',
                  },
                },
                { name: 'bing', type: 'text', label: 'Bing Webmaster Tools', maxLength: 120 },
              ],
            },
            {
              name: 'allowIndexing',
              type: 'checkbox',
              label: 'Autoriser l’indexation par les moteurs de recherche',
              defaultValue: true,
              admin: {
                description:
                  'Décocher bloque tout le site dans robots.txt et ajoute une balise noindex. À utiliser pour un site en préparation.',
              },
            },
          ],
        },
        {
          label: 'Données structurées',
          description:
            'Alimentent les fiches enrichies affichées par les moteurs de recherche. Ne rien inventer : un champ vide est simplement omis.',
          fields: [
            {
              name: 'structuredData',
              type: 'group',
              label: 'Identité publiée',
              fields: [
                {
                  name: 'personName',
                  type: 'text',
                  label: 'Nom de la personne',
                  maxLength: 120,
                },
                {
                  name: 'jobTitle',
                  type: 'text',
                  label: 'Fonction',
                  maxLength: 120,
                  admin: { description: 'Ex. « Stratège analytique ».' },
                },
                {
                  name: 'description',
                  type: 'textarea',
                  label: 'Description courte de la personne',
                  maxLength: 400,
                },
                {
                  name: 'portrait',
                  type: 'upload',
                  relationTo: 'media',
                  label: 'Portrait',
                  admin: { description: 'Utilisé par les fiches enrichies. Format carré recommandé.' },
                },
                {
                  name: 'organizationName',
                  type: 'text',
                  label: 'Nom de l’organisation',
                  maxLength: 120,
                },
                {
                  name: 'organizationDescription',
                  type: 'textarea',
                  label: 'Description de l’organisation',
                  maxLength: 400,
                },
                {
                  name: 'areaServed',
                  type: 'array',
                  label: 'Zones desservies',
                  labels: { singular: 'Zone', plural: 'Zones' },
                  fields: [{ name: 'label', type: 'text', label: 'Zone', required: true, maxLength: 80 }],
                },
                {
                  name: 'knowsAbout',
                  type: 'array',
                  label: 'Domaines d’expertise',
                  labels: { singular: 'Domaine', plural: 'Domaines' },
                  fields: [{ name: 'label', type: 'text', label: 'Domaine', required: true, maxLength: 80 }],
                },
              ],
            },
          ],
        },
        {
          label: 'Libelles des gabarits',
          description:
            'Textes fixes des pages de detail (projet, article). Modifiables sans toucher au code.',
          fields: [
            {
              name: 'labels',
              type: 'group',
              label: 'Libelles',
              fields: [
                {
                  name: 'projectBack',
                  type: 'text',
                  label: 'Retour a l index des projets',
                  maxLength: 60,
                },
                {
                  name: 'projectTechnologies',
                  type: 'text',
                  label: 'Intitule de la colonne technologies',
                  maxLength: 40,
                },
                {
                  name: 'projectContext',
                  type: 'text',
                  label: 'Titre section 01',
                  maxLength: 60,
                },
                { name: 'projectMethod', type: 'text', label: 'Titre section 02', maxLength: 60 },
                { name: 'projectResult', type: 'text', label: 'Titre section 03', maxLength: 60 },
                { name: 'projectLearning', type: 'text', label: 'Titre section 04', maxLength: 60 },
                {
                  name: 'projectNext',
                  type: 'text',
                  label: 'Mention du projet suivant',
                  maxLength: 40,
                },
                { name: 'articleBack', type: 'text', label: 'Retour au blog', maxLength: 60 },
              ],
            },
          ],
        },
        {
          label: 'Page 404',
          description: 'Textes affichés lorsqu’une adresse ne correspond à aucune page.',
          fields: [
            {
              name: 'notFound',
              type: 'group',
              label: 'Page introuvable',
              fields: [
                { name: 'eyebrow', type: 'text', label: 'Surtitre', maxLength: 60 },
                headlineField({ name: 'title', label: 'Titre', required: false }),
                { name: 'number', type: 'text', label: 'Numéro affiché', maxLength: 4 },
                { name: 'description', type: 'textarea', label: 'Description', maxLength: 500 },
                { name: 'ctaEyebrow', type: 'text', label: 'Surtitre du rappel', maxLength: 60 },
                { name: 'ctaTitle', type: 'text', label: 'Titre du rappel', maxLength: 120 },
                { name: 'ctaLabel', type: 'text', label: 'Bouton de retour', maxLength: 60 },
              ],
            },
          ],
        },
        {
          label: 'Analytique',
          description: 'Emplacements réservés. Aucun script n’est chargé tant qu’un identifiant n’est pas renseigné.',
          fields: [
            {
              name: 'analytics',
              type: 'group',
              label: 'Mesure d’audience',
              fields: [
                {
                  name: 'provider',
                  type: 'select',
                  label: 'Fournisseur',
                  defaultValue: 'none',
                  options: [
                    { label: 'Aucun', value: 'none' },
                    { label: 'Plausible', value: 'plausible' },
                    { label: 'Google Analytics', value: 'ga' },
                    { label: 'Matomo', value: 'matomo' },
                  ],
                },
                {
                  name: 'siteId',
                  type: 'text',
                  label: 'Identifiant du site',
                  maxLength: 120,
                  admin: { condition: (_d, s) => s?.provider && s.provider !== 'none' },
                },
                {
                  name: 'scriptUrl',
                  type: 'text',
                  label: 'URL du script',
                  maxLength: 400,
                  admin: { condition: (_d, s) => s?.provider && s.provider !== 'none' },
                },
              ],
            },
          ],
        },
      ],
    },
  ],
}
