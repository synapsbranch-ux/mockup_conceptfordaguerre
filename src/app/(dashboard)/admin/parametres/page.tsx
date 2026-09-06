import { ExternalLink } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'

import { SectionHeading } from '@/components/dashboard/states'
import { requireStaff } from '@/lib/auth/dal'
import { isEmailConfigured } from '@/lib/email/send'
import { env } from '@/lib/env'

export const metadata: Metadata = { title: 'Paramètres' }

/**
 * Paramètres.
 *
 * Les formulaires vivent dans le CMS, qui gère déjà validation, versions et
 * contrôle d'accès. Cet écran regroupe les points d'entrée et surtout affiche
 * l'état réel des intégrations — plutôt que de le laisser découvrir au moment
 * où un envoi échoue.
 */
const SettingsPage = async () => {
  await requireStaff()

  const sections = [
    { title: 'Réglages du site', description: 'Métadonnées, indexation, réseaux sociaux.', href: '/cms/globals/siteSettings' },
    { title: 'En-tête', description: 'Navigation principale et appel à l’action.', href: '/cms/globals/header' },
    { title: 'Pied de page', description: 'Colonnes, mentions et liens.', href: '/cms/globals/footer' },
    { title: 'Forum et commentaires', description: 'Règles, modération, présentation sur l’accueil.', href: '/cms/globals/communitySettings' },
    { title: 'Espace client et rendez-vous', description: 'Textes d’accueil, états vides, conditions d’annulation.', href: '/cms/globals/clientSpaceSettings' },
    { title: 'Facturation', description: 'Coordonnées, numérotation, taxes et devise.', href: '/cms/globals/billingSettings' },
  ]

  const integrations = [
    {
      name: 'Envoi de courriels (Resend)',
      ready: isEmailConfigured(),
      readyLabel: 'Configuré',
      missingLabel: 'RESEND_API_KEY absente — les envois sont signalés comme non effectués.',
    },
    {
      name: 'Connexion Google',
      ready: env.google !== null,
      readyLabel: 'Configurée',
      missingLabel:
        'GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET absentes — le bouton Google est masqué.',
    },
    {
      name: 'Limitation de débit partagée (Redis)',
      ready: Boolean(env.redisURL),
      readyLabel: 'Redis actif',
      missingLabel: 'Repli en mémoire : les compteurs ne sont pas partagés entre instances.',
    },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Paramètres</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Réglages éditoriaux et état des intégrations.
        </p>
      </div>

      <section>
        <SectionHeading title="État des intégrations" />
        <ul className="space-y-2">
          {integrations.map((integration) => (
            <li
              key={integration.name}
              className="border-border bg-card flex flex-wrap items-start justify-between gap-3 rounded-lg border p-4"
            >
              <div>
                <p className="font-medium">{integration.name}</p>
                {!integration.ready && (
                  <p className="text-muted-foreground mt-0.5 text-sm">
                    {integration.missingLabel}
                  </p>
                )}
              </div>
              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-xs ${
                  integration.ready
                    ? 'bg-primary/10 text-primary'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {integration.ready ? integration.readyLabel : 'Non configuré'}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <SectionHeading title="Réglages éditoriaux" />
        <ul className="grid gap-3 sm:grid-cols-2">
          {sections.map((section) => (
            <li key={section.href}>
              <Link
                href={section.href}
                className="border-border bg-card hover:bg-muted/40 block rounded-lg border p-4 transition"
              >
                <span className="flex items-center gap-1.5 font-medium">
                  {section.title}
                  <ExternalLink className="size-3.5" aria-hidden />
                </span>
                <span className="text-muted-foreground mt-1 block text-sm">
                  {section.description}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

export default SettingsPage
