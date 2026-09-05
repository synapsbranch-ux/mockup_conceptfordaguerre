import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { SiteShell } from '@/components/site/SiteShell'
import { auth } from '@/lib/auth/server'

export const metadata: Metadata = {
  title: 'Déconnexion',
  robots: { index: false, follow: false },
}

/**
 * Déconnexion.
 *
 * La révocation passe par une action serveur déclenchée en POST : une simple
 * visite d'URL ne doit pas pouvoir déconnecter quelqu'un, sans quoi une image
 * distante pointant vers `/deconnexion` suffirait à le faire.
 */
const signOutAction = async (): Promise<void> => {
  'use server'
  const { headers } = await import('next/headers')
  try {
    await auth.api.signOut({ headers: await headers() })
  } catch {
    // Session déjà absente ou expirée : le résultat visé est atteint.
  }
  redirect('/')
}

const DeconnexionPage = () => (
  <SiteShell>
    <section className="shell section-pad">
      <p className="eyebrow">Espace client</p>
      <h1 style={{ fontSize: 'clamp(40px, 5vw, 64px)', fontWeight: 500 }}>
        Se <em>déconnecter</em>
      </h1>
      <p style={{ color: 'var(--muted)', maxWidth: 560 }}>
        Vous fermez votre session sur cet appareil. Vos données restent accessibles à votre
        prochaine connexion.
      </p>
      <form action={signOutAction} style={{ marginTop: 40 }}>
        <button className="button button-dark" type="submit">
          Confirmer la déconnexion ↗
        </button>
      </form>
    </section>
  </SiteShell>
)

export default DeconnexionPage
