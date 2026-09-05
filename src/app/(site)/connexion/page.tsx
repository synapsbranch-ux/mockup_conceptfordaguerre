import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'

import { AuthForm } from '@/components/forms/AuthForm'
import { SiteShell } from '@/components/site/SiteShell'
import { getSessionUser } from '@/lib/auth/dal'
import { safeRedirect } from '@/lib/auth/redirect'
import { env } from '@/lib/env'

export const metadata: Metadata = {
  title: 'Connexion',
  description: 'Accéder à votre espace client.',
  // Une page de connexion n'a pas vocation à être indexée.
  robots: { index: false, follow: false },
}

const ConnexionPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>
}) => {
  const params = await searchParams
  const raw = Array.isArray(params.next) ? params.next[0] : params.next
  const next = safeRedirect(raw)

  // Une personne déjà connectée n'a rien à faire ici.
  const user = await getSessionUser()
  if (user) redirect(next)

  return (
    <SiteShell>
      <section className="shell auth-page">
        <div className="auth-intro">
          <p className="eyebrow">Espace client</p>
          <h1>
            Vos devis, documents et <em>rendez-vous.</em>
          </h1>
          <p>
            Un seul compte pour suivre vos demandes, échanger avec l’équipe, consulter vos factures
            et réserver une rencontre.
          </p>
          <div className="auth-benefits">
            <span>Suivi des devis et des propositions</span>
            <span>Documents et factures au même endroit</span>
            <span>Réservation de rencontres</span>
            <span>Participation au forum</span>
          </div>
        </div>

        <Suspense fallback={<div className="auth-card" aria-busy="true" />}>
          <AuthForm initialMode="login" googleEnabled={env.google !== null} />
        </Suspense>
      </section>
    </SiteShell>
  )
}

export default ConnexionPage
