import type { GlobalConfig } from 'payload'

import { anyone, authenticated } from '../access'
import { headlineField } from '../fields/headline'
import { imageFields } from '../fields/media'
import { linkField } from '../fields/link'
import { revalidateGlobal } from '../hooks/revalidate'

/** Pied de page commun à toutes les pages. */
export const Footer: GlobalConfig = {
  slug: 'footer',
  label: 'Pied de page',
  admin: {
    group: 'Configuration',
    description:
      'Visuels éditoriaux, infolettre, colonnes de liens et mentions. S’applique à toutes les pages.',
  },
  access: { read: anyone, update: authenticated },
  hooks: { afterChange: [revalidateGlobal('globals')] },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Bandeau visuel',
          description: 'Deux images encadrant un message court.',
          fields: [
            {
              name: 'visuals',
              type: 'array',
              label: 'Images éditoriales',
              labels: { singular: 'Image', plural: 'Images' },
              minRows: 2,
              maxRows: 2,
              fields: [
                ...imageFields({ required: true }),
                { name: 'caption', type: 'text', label: 'Légende', maxLength: 120 },
              ],
            },
            {
              name: 'visualMessage',
              type: 'group',
              label: 'Message central',
              fields: [
                {
                  name: 'kicker',
                  type: 'text',
                  label: 'Mention au-dessus',
                  maxLength: 60,
                  admin: { description: 'Ex. « DATAKLE / 2026 ».' },
                },
                headlineField({ name: 'lines', label: 'Message', required: false, maxRows: 6 }),
              ],
            },
          ],
        },
        {
          label: 'Infolettre',
          fields: [
            { name: 'newsletterEyebrow', type: 'text', label: 'Surtitre', maxLength: 60 },
            headlineField({ name: 'newsletterTitle', label: 'Titre', required: false }),
            {
              type: 'row',
              fields: [
                {
                  name: 'newsletterFieldLabel',
                  type: 'text',
                  label: 'Libellé du champ',
                  maxLength: 60,
                  admin: { width: '50%' },
                },
                {
                  name: 'newsletterPlaceholder',
                  type: 'text',
                  label: 'Indication du champ',
                  maxLength: 60,
                  admin: { width: '50%' },
                },
              ],
            },
            { name: 'newsletterButton', type: 'text', label: 'Bouton', maxLength: 60 },
            {
              name: 'newsletterConsent',
              type: 'textarea',
              label: 'Mention de consentement',
              maxLength: 400,
            },
            {
              name: 'newsletterMessages',
              type: 'group',
              label: 'Messages de retour',
              fields: [
                { name: 'success', type: 'text', label: 'Succès', maxLength: 200 },
                { name: 'alreadySubscribed', type: 'text', label: 'Déjà inscrit', maxLength: 200 },
                { name: 'error', type: 'text', label: 'Erreur', maxLength: 200 },
                { name: 'rateLimited', type: 'text', label: 'Trop de tentatives', maxLength: 200 },
              ],
            },
          ],
        },
        {
          label: 'Colonnes de liens',
          fields: [
            {
              name: 'columns',
              type: 'array',
              label: 'Colonnes',
              labels: { singular: 'Colonne', plural: 'Colonnes' },
              maxRows: 4,
              fields: [
                { name: 'title', type: 'text', label: 'Titre de colonne', required: true, maxLength: 60 },
                {
                  name: 'kind',
                  type: 'select',
                  label: 'Contenu',
                  defaultValue: 'links',
                  options: [
                    { label: 'Liens', value: 'links' },
                    { label: 'Réseaux sociaux (repris des réglages du site)', value: 'socials' },
                  ],
                },
                {
                  name: 'links',
                  type: 'array',
                  label: 'Liens',
                  labels: { singular: 'Lien', plural: 'Liens' },
                  admin: { condition: (_d, s) => s?.kind !== 'socials' },
                  fields: [linkField({ name: 'link', label: 'Lien' })],
                },
              ],
            },
          ],
        },
        {
          label: 'Mentions',
          fields: [
            {
              name: 'legalLinks',
              type: 'array',
              label: 'Liens légaux',
              labels: { singular: 'Lien', plural: 'Liens' },
              fields: [linkField({ name: 'link', label: 'Lien' })],
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'copyright',
                  type: 'text',
                  label: 'Mention de copyright',
                  maxLength: 160,
                  admin: { width: '50%' },
                },
                {
                  name: 'signature',
                  type: 'text',
                  label: 'Signature à droite',
                  maxLength: 160,
                  admin: { width: '50%' },
                },
              ],
            },
          ],
        },
      ],
    },
  ],
}
