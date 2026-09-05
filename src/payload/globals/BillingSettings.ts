import type { GlobalConfig } from 'payload'

import { authenticated, superAdminOnly } from '../access'
import { revalidateGlobal } from '../hooks/revalidate'

/**
 * Réglages de facturation.
 *
 * Lecture réservée : ces informations figurent sur des documents comptables et
 * n'ont rien à faire dans une réponse publique.
 *
 * La numérotation est un compteur **persistant**. Il n'est jamais recalculé
 * depuis le nombre de factures existantes : une facture annulée ou supprimée
 * ne doit pas libérer son numéro, sans quoi deux documents distincts
 * porteraient la même référence.
 */
export const BillingSettings: GlobalConfig = {
  slug: 'billingSettings',
  label: 'Facturation',
  admin: {
    group: 'Réglages',
    description: 'Coordonnées de l’émetteur, numérotation, taxes et devise par défaut.',
  },
  access: {
    read: authenticated,
    update: superAdminOnly,
  },
  hooks: { afterChange: [revalidateGlobal('billingSettings')] },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Émetteur',
          fields: [
            { name: 'companyName', type: 'text', label: 'Raison sociale', maxLength: 200 },
            { name: 'companyEmail', type: 'email', label: 'Courriel' },
            { name: 'companyPhone', type: 'text', label: 'Téléphone', maxLength: 40 },
            { name: 'companyAddress', type: 'textarea', label: 'Adresse', maxLength: 400 },
            {
              name: 'taxIdentifiers',
              type: 'array',
              label: 'Numéros fiscaux',
              labels: { singular: 'Numéro', plural: 'Numéros' },
              fields: [
                { name: 'label', type: 'text', label: 'Intitulé', required: true, maxLength: 60 },
                { name: 'value', type: 'text', label: 'Numéro', required: true, maxLength: 60 },
              ],
            },
          ],
        },
        {
          label: 'Numérotation',
          fields: [
            {
              name: 'invoicePrefix',
              type: 'text',
              label: 'Préfixe des factures',
              defaultValue: 'FA',
              maxLength: 10,
              admin: { description: 'Ex. « FA » donne FA-2026-0001.' },
            },
            {
              name: 'invoiceNextNumber',
              type: 'number',
              label: 'Prochain numéro',
              defaultValue: 1,
              min: 1,
              admin: {
                description:
                  'Compteur persistant. Il n’est jamais recalculé depuis les factures existantes : une facture annulée ne libère pas son numéro.',
              },
            },
            {
              name: 'invoiceNumberPadding',
              type: 'number',
              label: 'Nombre de chiffres',
              defaultValue: 4,
              min: 1,
              max: 10,
            },
            {
              name: 'includeYear',
              type: 'checkbox',
              label: 'Inclure l’année',
              defaultValue: true,
            },
          ],
        },
        {
          label: 'Montants',
          fields: [
            {
              name: 'defaultCurrency',
              type: 'select',
              label: 'Devise par défaut',
              defaultValue: 'CAD',
              options: [
                { label: 'Dollar canadien (CAD)', value: 'CAD' },
                { label: 'Dollar américain (USD)', value: 'USD' },
                { label: 'Euro (EUR)', value: 'EUR' },
                { label: 'Gourde (HTG)', value: 'HTG' },
              ],
            },
            {
              name: 'defaultTaxRate',
              type: 'number',
              label: 'Taux de taxe par défaut (%)',
              defaultValue: 0,
              min: 0,
              max: 100,
            },
            {
              name: 'defaultPaymentTermsDays',
              type: 'number',
              label: 'Délai de paiement par défaut (jours)',
              defaultValue: 30,
              min: 0,
              max: 365,
            },
            {
              name: 'defaultPaymentTerms',
              type: 'textarea',
              label: 'Conditions de paiement par défaut',
              maxLength: 2000,
            },
            {
              name: 'invoiceFooter',
              type: 'textarea',
              label: 'Mention de pied de facture',
              maxLength: 600,
            },
          ],
        },
      ],
    },
  ],
}
