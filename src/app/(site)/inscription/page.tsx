import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'

import { AuthForm } from '@/components/forms/AuthForm'
import { SiteShell } from '@/components/site/SiteShell'
import { getSessionUser } from '@/lib/auth/dal'
import { safeRedirect } from '@/lib/auth/redirect'
import { env } from '@/lib/env'

export const metadata: Metadata = {
  title: 'Créer un compte',
  description: 'Créer votre espace client.',
  robots: { index: false, follow: false },
}

const InscriptionPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>
}) => {
  const params = await searchParams
  const raw = Array.isArray(params.next) ? params.next[0] : params.next
  const next = safeRedirect(raw)

  const user = await getSessionUser()
  if (user) redirect(next)

  return (
    <SiteShell>
      <section className="shell auth-page">
        <div className="auth-intro">
          <p className="eyebrow">Espace client</p>
          <h1>
            Créer votre <em>espace client.</em>
          </h1>
          <p>
            Suivez vos demandes de devis, recevez vos propositions et vos factures, réservez une
            rencontre et participez au forum.
          </p>
          <div className="auth-benefits">
            <span>Demande de devis guidée</span>
            <span>Propositions à accepter ou refuser</span>
            <span>Documents privés et sécurisés</span>
            <span>Notifications par courriel</span>
          </div>
        </div>

        <Suspense fallback={<div className="auth-card" aria-busy="true" />}>
          <AuthForm initialMode="register" googleEnabled={env.google !== null} />
        </Suspense>
      </section>
    </SiteShell>
  )
}

export default InscriptionPage
