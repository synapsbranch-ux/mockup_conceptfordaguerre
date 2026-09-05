import type { GlobalConfig } from 'payload'

import { anyone, authenticated } from '../access'
import { revalidateGlobal } from '../hooks/revalidate'

/**
 * Contenu éditorial de l'espace client et de la réservation.
 *
 * Les états vides, les introductions et les appels à l'action sont
 * administrables : aucun de ces textes n'est figé dans un composant React.
 */
export const ClientSpaceSettings: GlobalConfig = {
  slug: 'clientSpaceSettings',
  label: 'Espace client et rendez-vous',
  admin: {
    group: 'Réglages',
    description: 'Textes d’accueil, états vides et présentation de la réservation.',
  },
  access: { read: anyone, update: authenticated },
  hooks: { afterChange: [revalidateGlobal('clientSpaceSettings')] },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Accueil de l’espace',
          fields: [
            {
              name: 'welcomeTitle',
              type: 'text',
              label: 'Titre de bienvenue',
              defaultValue: 'Bonjour {prenom}',
              maxLength: 120,
              admin: {
                description:
                  '{prenom} est remplacé par le prénom de la personne, ou son nom si le prénom est absent.',
              },
            },
            {
              name: 'welcomeIntro',
              type: 'textarea',
              label: 'Introduction',
              maxLength: 600,
              defaultValue:
                'Retrouvez ici vos devis, vos documents, vos factures et vos rendez-vous.',
            },
            {
              name: 'quickActionsTitle',
              type: 'text',
              label: 'Titre des actions rapides',
              defaultValue: 'Actions rapides',
              maxLength: 120,
            },
          ],
        },
        {
          label: 'États vides',
          description:
            'Affichés lorsqu’une section ne contient encore aucune donnée. Jamais de chiffre inventé à la place.',
          fields: [
            {
              name: 'emptyQuotes',
              type: 'text',
              label: 'Aucun devis',
              defaultValue: 'Vous n’avez pas encore de demande de devis.',
              maxLength: 200,
            },
            {
              name: 'emptyProposals',
              type: 'text',
              label: 'Aucune proposition',
              defaultValue: 'Aucune proposition en attente de votre décision.',
              maxLength: 200,
            },
            {
              name: 'emptyInvoices',
              type: 'text',
              label: 'Aucune facture',
              defaultValue: 'Aucune facture pour le moment.',
              maxLength: 200,
            },
            {
              name: 'emptyProjects',
              type: 'text',
              label: 'Aucun projet',
              defaultValue: 'Aucun projet en cours.',
              maxLength: 200,
            },
            {
              name: 'emptyDocuments',
              type: 'text',
              label: 'Aucun document',
              defaultValue: 'Aucun document ne vous a encore été transmis.',
              maxLength: 200,
            },
            {
              name: 'emptyMessages',
              type: 'text',
              label: 'Aucun message',
              defaultValue: 'Aucune conversation en cours.',
              maxLength: 200,
            },
            {
              name: 'emptyAppointments',
              type: 'text',
              label: 'Aucun rendez-vous',
              defaultValue: 'Aucun rendez-vous prévu.',
              maxLength: 200,
            },
            {
              name: 'emptyNotifications',
              type: 'text',
              label: 'Aucune notification',
              defaultValue: 'Aucune notification.',
              maxLength: 200,
            },
          ],
        },
        {
          label: 'Rendez-vous',
          fields: [
            {
              name: 'bookingEnabled',
              type: 'checkbox',
              label: 'Réservation ouverte',
              defaultValue: true,
            },
            {
              name: 'bookingTitle',
              type: 'text',
              label: 'Titre',
              defaultValue: 'Réserver une rencontre',
              maxLength: 120,
            },
            {
              name: 'bookingIntro',
              type: 'textarea',
              label: 'Introduction',
              maxLength: 800,
              defaultValue:
                'Choisissez un format de rencontre, puis un créneau qui vous convient.',
            },
            {
              name: 'bookingConfirmation',
              type: 'textarea',
              label: 'Message après réservation',
              maxLength: 600,
              defaultValue:
                'Votre demande est enregistrée. Vous recevrez une confirmation par courriel.',
            },
            {
              name: 'bookingPolicy',
              type: 'textarea',
              label: 'Conditions d’annulation',
              maxLength: 1000,
            },
          ],
        },
      ],
    },
  ],
}
