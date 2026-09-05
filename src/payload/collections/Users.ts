import type { CollectionConfig } from 'payload'

import { isCMSUser, isSuperAdmin, superAdminFieldOnly } from '../access'
import { usersCreate, usersDelete, usersRead, usersUpdate } from '../access/users'
import { betterAuthStrategy } from '../auth/betterAuthStrategy'

/**
 * Comptes du site — clients et personnel confondus.
 *
 * Better Auth est le système d'identité unique : il partage cette collection et
 * y écrit les inscriptions. La stratégie locale de Payload est désactivée, si
 * bien qu'aucun mot de passe n'est plus vérifié ici ; l'authentification passe
 * toujours par Better Auth.
 *
 * Le champ `role` est protégé au niveau du champ : ni un éditeur, ni un client
 * ne peut s'auto-promouvoir. Côté Better Auth, il est déclaré `input: false`,
 * donc une inscription qui transporte `role` le voit ignoré.
 */
export const Users: CollectionConfig = {
  slug: 'users',
  labels: { singular: 'Utilisateur', plural: 'Utilisateurs' },
  auth: {
    // L'identité est gérée par Better Auth : plus de connexion par mot de passe
    // côté Payload. Les champs `salt`/`hash` hérités restent en base sans usage.
    // `enableFields` conserve `email` sur la collection et dans les types :
    // la forme en base reste identique aux comptes existants et l'adresse reste
    // consultable dans l'admin. `optionalPassword` reflète que le secret vit
    // désormais dans la collection `account` de Better Auth.
    disableLocalStrategy: { enableFields: true, optionalPassword: true },
    strategies: [betterAuthStrategy],
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'email', 'role', 'active', 'lastLogin'],
    group: 'Système',
    description:
      'Comptes du site. Seuls les super-administrateurs peuvent modifier un rôle ou suspendre un compte.',
  },
  access: {
    read: usersRead,
    create: usersCreate,
    update: usersUpdate,
    delete: usersDelete,
    // Un client connecté n'accède jamais au panneau CMS.
    admin: ({ req: { user } }) => isCMSUser(user),
    unlock: ({ req: { user } }) => isSuperAdmin(user),
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      label: 'Nom complet',
      required: true,
      maxLength: 120,
    },
    {
      name: 'role',
      type: 'select',
      label: 'Rôle',
      required: true,
      // Toute nouvelle inscription est un client. Le privilège n'est jamais
      // accordé par défaut.
      defaultValue: 'customer',
      options: [
        { label: 'Client', value: 'customer' },
        { label: 'Administrateur', value: 'editor' },
        { label: 'Super-administrateur', value: 'super-admin' },
      ],
      access: {
        create: superAdminFieldOnly,
        update: superAdminFieldOnly,
      },
      admin: {
        position: 'sidebar',
        description:
          'Client : espace client uniquement. Administrateur : contenu et médias. Super-administrateur : accès complet, y compris les comptes.',
      },
    },
    {
      name: 'active',
      type: 'checkbox',
      label: 'Compte actif',
      defaultValue: true,
      access: {
        create: superAdminFieldOnly,
        update: superAdminFieldOnly,
      },
      admin: {
        position: 'sidebar',
        description: 'Décocher empêche la connexion sans supprimer le compte ni ses contributions.',
      },
    },
    {
      name: 'suspended',
      type: 'checkbox',
      label: 'Compte suspendu',
      defaultValue: false,
      access: {
        create: superAdminFieldOnly,
        update: superAdminFieldOnly,
      },
      admin: {
        position: 'sidebar',
        description:
          'Un compte suspendu perd l’accès à l’espace client et le droit de publier dans la communauté.',
      },
    },
    {
      name: 'forumBanned',
      type: 'checkbox',
      label: 'Publication communautaire bloquée',
      defaultValue: false,
      access: {
        create: superAdminFieldOnly,
        update: superAdminFieldOnly,
      },
      admin: {
        position: 'sidebar',
        description:
          'Bloque les commentaires et le forum sans retirer l’accès au reste de l’espace client.',
      },
    },
    {
      name: 'lastLogin',
      type: 'date',
      label: 'Dernière connexion',
      admin: {
        position: 'sidebar',
        readOnly: true,
        date: { pickerAppearance: 'dayAndTime', displayFormat: 'd MMM yyyy, HH:mm' },
      },
    },
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Profil',
          description: 'Renseigné par la personne depuis son espace client.',
          fields: [
            {
              type: 'row',
              fields: [
                { name: 'firstName', type: 'text', label: 'Prénom', maxLength: 80 },
                { name: 'lastName', type: 'text', label: 'Nom', maxLength: 80 },
              ],
            },
            {
              name: 'avatar',
              type: 'upload',
              relationTo: 'media',
              label: 'Photo de profil',
            },
            {
              type: 'row',
              fields: [
                { name: 'phone', type: 'text', label: 'Téléphone', maxLength: 40 },
                { name: 'company', type: 'text', label: 'Entreprise', maxLength: 160 },
              ],
            },
            {
              type: 'row',
              fields: [
                { name: 'jobTitle', type: 'text', label: 'Fonction', maxLength: 120 },
                { name: 'country', type: 'text', label: 'Pays', maxLength: 80 },
              ],
            },
            {
              type: 'row',
              fields: [
                { name: 'industry', type: 'text', label: 'Secteur d’activité', maxLength: 120 },
                { name: 'website', type: 'text', label: 'Site web', maxLength: 200 },
              ],
            },
            {
              name: 'preferredLocale',
              type: 'select',
              label: 'Langue préférée',
              defaultValue: 'fr',
              options: [
                { label: 'Français', value: 'fr' },
                { label: 'English', value: 'en' },
              ],
            },
            {
              name: 'timezone',
              type: 'text',
              label: 'Fuseau horaire',
              maxLength: 64,
              defaultValue: 'America/Toronto',
              admin: {
                description:
                  'Identifiant IANA, ex. « America/Port-au-Prince ». Sert à afficher les rendez-vous.',
              },
            },
          ],
        },
        {
          label: 'Préférences',
          fields: [
            {
              name: 'notificationPreferences',
              type: 'group',
              label: 'Notifications par courriel',
              fields: [
                {
                  name: 'messages',
                  type: 'checkbox',
                  label: 'Nouveaux messages',
                  defaultValue: true,
                },
                {
                  name: 'proposals',
                  type: 'checkbox',
                  label: 'Propositions et devis',
                  defaultValue: true,
                },
                {
                  name: 'invoices',
                  type: 'checkbox',
                  label: 'Factures et rappels',
                  defaultValue: true,
                },
                {
                  name: 'appointments',
                  type: 'checkbox',
                  label: 'Rendez-vous',
                  defaultValue: true,
                },
                {
                  name: 'community',
                  type: 'checkbox',
                  label: 'Réponses aux commentaires et au forum',
                  defaultValue: true,
                },
              ],
            },
            {
              name: 'newsletterOptIn',
              type: 'checkbox',
              label: 'Abonné à l’infolettre',
              defaultValue: false,
              admin: {
                description:
                  'Reflète le consentement. La collecte réelle reste dans « Abonnés à l’infolettre ».',
              },
            },
          ],
        },
      ],
    },
  ],
  timestamps: true,
}
