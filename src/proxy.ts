import { getSessionCookie } from 'better-auth/cookies'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Filtre de requêtes — `proxy.ts` remplace `middleware.ts` depuis Next 16.
 *
 * Rôle strictement **optimiste** : il ne lit que la présence du cookie de
 * session pour éviter d'afficher une coque vide à un visiteur anonyme. Il ne
 * consulte jamais la base et ne constitue **jamais** une autorisation.
 *
 * L'autorisation réelle — session valide, rôle, compte non suspendu, propriété
 * de la ressource — est refaite côté serveur à chaque page protégée et à chaque
 * mutation d'API, via `src/lib/auth/dal.ts`. Un cookie forgé ne franchit donc
 * que ce filtre, jamais la vérification qui suit.
 */

/** Préfixes exigeant une session. */
const PROTECTED_PREFIXES = ['/espace-client', '/client', '/admin']

/** Préfixes d'authentification : une personne déjà connectée n'y a rien à faire. */
const AUTH_PATHS = ['/connexion', '/inscription']

const stripLocale = (pathname: string): string => {
  if (pathname === '/en') return '/'
  if (pathname.startsWith('/en/')) return pathname.slice(3)
  return pathname
}

export const proxy = (request: NextRequest): NextResponse => {
  const { pathname, search } = request.nextUrl
  const path = stripLocale(pathname)

  // Présence du cookie uniquement : aucune validation cryptographique ici.
  const hasSessionCookie = Boolean(getSessionCookie(request))

  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  )

  if (isProtected && !hasSessionCookie) {
    const loginURL = new URL('/connexion', request.url)
    // Conserve la destination demandée, chemin relatif uniquement. Elle est
    // revalidée par `safeRedirect` avant d'être suivie.
    loginURL.searchParams.set('next', `${pathname}${search}`)
    return NextResponse.redirect(loginURL)
  }

  const isAuthPath = AUTH_PATHS.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))

  if (isAuthPath && hasSessionCookie) {
    return NextResponse.redirect(new URL('/espace-client', request.url))
  }

  return NextResponse.next()
}

export const config = {
  /**
   * Exclut les ressources statiques, les binaires média et l'API
   * d'authentification elle-même — cette dernière doit rester joignable sans
   * session pour permettre la connexion.
   */
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/auth|api/media|robots.txt|sitemap.xml).*)'],
}

export default proxy
