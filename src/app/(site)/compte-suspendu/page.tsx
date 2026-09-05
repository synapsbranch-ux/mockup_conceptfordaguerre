import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'

import { SiteShell } from '@/components/site/SiteShell'
import { getSessionUser } from '@/lib/auth/dal'

export const metadata: Metadata = {
  title: 'Compte suspendu',
  robots: { index: false, follow: false },
}

/**
 * Écran d'un compte suspendu.
 *
 * Accessible uniquement à une session réellement suspendue : un compte en règle
 * est renvoyé vers son espace, un visiteur anonyme vers la connexion. La page
 * ne divulgue aucun motif ni aucune donnée du compte.
 */
const CompteSuspenduPage = async () => {
  const user = await getSessionUser()
  if (!user) redirect('/connexion')
  if (!user.suspended) redirect('/espace-client')

  return (
    <SiteShell>
      <section className="shell section-pad">
        <p className="eyebrow">Espace client</p>
        <h1 style={{ fontSize: 'clamp(40px, 5vw, 64px)', fontWeight: 500 }}>
          Accès <em>suspendu</em>
        </h1>
        <p style={{ color: 'var(--muted)', maxWidth: 620, fontSize: 17 }}>
          L’accès à votre espace client est temporairement suspendu. Vos données et vos documents
          sont conservés. Pour rétablir l’accès, écrivez-nous depuis le formulaire de contact.
        </p>
        <div style={{ display: 'flex', gap: 16, marginTop: 40, flexWrap: 'wrap' }}>
          <Link className="button button-dark" href="/contact">
            Nous écrire ↗
          </Link>
          <Link className="button button-light" href="/deconnexion">
            Se déconnecter
          </Link>
        </div>
      </section>
    </SiteShell>
  )
}

export default CompteSuspenduPage
