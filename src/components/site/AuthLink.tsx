import Link from 'next/link'

import { getSessionUser } from '@/lib/auth/dal'
import { dictionary, type Locale } from '@/lib/i18n'

/**
 * Accès au compte, dans l'en-tête du site public.
 *
 * Volontairement **structurel** et non administrable : c'est une fonction du
 * site, pas un contenu éditorial. Un lien de connexion qui dépendrait d'une
 * configuration CMS peut disparaître par inadvertance — et sans lui, une
 * personne n'a plus aucun moyen de créer un compte ni de se connecter.
 *
 * Le libellé suit l'état de session : « Espace client » pour une personne
 * connectée, « Se connecter » sinon. La destination hors session conserve la
 * page visée, pour revenir au bon endroit après authentification.
 */
export const AuthLink = async ({ locale = 'fr' }: { locale?: Locale }) => {
  const user = await getSessionUser()
  const t = dictionary(locale)

  if (user) {
    return (
      <Link className="header-auth" href="/espace-client">
        {t.clientArea}
      </Link>
    )
  }

  return (
    <Link className="header-auth" href="/connexion?next=%2Fespace-client">
      {t.signIn}
    </Link>
  )
}
