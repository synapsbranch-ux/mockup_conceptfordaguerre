import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { SiteShell } from '@/components/site/SiteShell'
import { StructuredData } from '@/components/site/StructuredData'
import { getSessionUser } from '@/lib/auth/dal'
import { env } from '@/lib/env'
import { getForumCategories, getForumFeed, parseSort } from '@/lib/forum'
import { getPayloadClient } from '@/lib/payload'
import { breadcrumbSchema, buildGraph } from '@/lib/structuredData'

type SearchParams = Promise<Record<string, string | string[] | undefined>>

const first = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value

const settings = async () => {
  const payload = await getPayloadClient()
  return payload.findGlobal({ slug: 'communitySettings', depth: 0 }).catch(() => null)
}

export const generateMetadata = async (): Promise<Metadata> => {
  const community = await settings()
  const title = community?.forumTitle ?? 'Forum'
  const description = community?.forumDescription ?? undefined

  // Forum ferme : la page n'est pas indexee.
  if (community?.forumEnabled === false) {
    return { title, robots: { index: false, follow: false } }
  }

  return {
    title,
    description,
    alternates: { canonical: `${env.serverURL}/forum` },
    openGraph: { title, description, url: `${env.serverURL}/forum`, type: 'website' },
  }
}

const SORTS: { value: string; label: string }[] = [
  { value: 'active', label: 'Actives' },
  { value: 'recent', label: 'Récentes' },
  { value: 'popular', label: 'Populaires' },
  { value: 'unanswered', label: 'Sans réponse' },
]

const relative = (value: string | null | undefined): string => {
  if (!value) return ''
  const diff = Date.now() - new Date(value).getTime()
  const minutes = Math.round(diff / 60000)
  if (minutes < 1) return 'à l’instant'
  if (minutes < 60) return `il y a ${minutes} min`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `il y a ${hours} h`
  const days = Math.round(hours / 24)
  if (days < 31) return `il y a ${days} j`
  return new Intl.DateTimeFormat('fr-CA', { dateStyle: 'medium' }).format(new Date(value))
}

/**
 * Fil public du forum.
 *
 * Lisible sans connexion. Seules les discussions publiées y figurent : la
 * requête est bornée par `PUBLIC_TOPIC_WHERE`, donc un contenu masqué ou
 * archivé n'apparaît ni ici, ni dans le plan du site.
 */
const ForumPage = async ({ searchParams }: { searchParams: SearchParams }) => {
  const params = await searchParams
  const community = await settings()

  // Le forum peut être fermé depuis le CMS : la page devient introuvable.
  if (community?.forumEnabled === false) notFound()

  const sort = parseSort(first(params.tri))
  const page = Math.max(1, Number.parseInt(first(params.page) ?? '1', 10) || 1)
  const categorySlug = first(params.categorie)
  const tag = first(params.etiquette)
  const search = first(params.q)

  const [feed, categories, user] = await Promise.all([
    getForumFeed({ page, categorySlug, tag, search, sort }),
    getForumCategories(),
    getSessionUser(),
  ])

  const buildHref = (overrides: Record<string, string | undefined>): string => {
    const next = new URLSearchParams()
    const merged = { tri: sort, categorie: categorySlug, etiquette: tag, q: search, ...overrides }
    for (const [key, value] of Object.entries(merged)) {
      if (value && !(key === 'tri' && value === 'active')) next.set(key, value)
    }
    const query = next.toString()
    return query ? `/forum?${query}` : '/forum'
  }

  return (
    <SiteShell>
      <StructuredData
        json={buildGraph([
          {
            '@type': 'CollectionPage',
            name: community?.forumTitle ?? 'Forum',
            description: community?.forumDescription ?? undefined,
            url: `${env.serverURL}/forum`,
          },
          breadcrumbSchema([
            { name: 'Accueil', path: '/' },
            { name: community?.forumTitle ?? 'Forum', path: '/forum' },
          ]),
        ])}
      />

      <section className="shell forum-page">
        <header className="forum-header">
          <p className="eyebrow">Communauté</p>
          <h1>{community?.forumTitle ?? 'Forum'}</h1>
          {community?.forumDescription && <p className="forum-intro">{community.forumDescription}</p>}

          <div className="forum-header-actions">
            {user ? (
              <Link className="button button-dark" href="/forum/nouvelle-discussion">
                Ouvrir une discussion ↗
              </Link>
            ) : (
              <p className="forum-cta">
                {community?.forumJoinCta ?? 'Connectez-vous pour participer à la discussion.'}{' '}
                <Link href="/connexion?next=/forum" className="forum-link">
                  Se connecter
                </Link>
              </p>
            )}
          </div>
        </header>

        {/* Recherche et filtres : chaque contrôle est un lien, donc l'état du
            fil est entièrement porté par l'URL et reste partageable. */}
        <form className="forum-search" action="/forum" method="get">
          {sort !== 'active' && <input type="hidden" name="tri" value={sort} />}
          {categorySlug && <input type="hidden" name="categorie" value={categorySlug} />}
          <label className="sr-only" htmlFor="forum-q">
            Rechercher une discussion
          </label>
          <input
            id="forum-q"
            type="search"
            name="q"
            defaultValue={search ?? ''}
            placeholder="Rechercher une discussion…"
          />
          <button className="button button-dark" type="submit">
            Rechercher
          </button>
        </form>

        <nav className="forum-filters" aria-label="Filtres du forum">
          <div className="forum-filter-group">
            <span className="forum-filter-label">Trier</span>
            {SORTS.map((option) => (
              <Link
                key={option.value}
                href={buildHref({ tri: option.value, page: undefined })}
                className={option.value === sort ? 'forum-chip forum-chip-active' : 'forum-chip'}
                aria-current={option.value === sort ? 'true' : undefined}
              >
                {option.label}
              </Link>
            ))}
          </div>

          {categories.length > 0 && (
            <div className="forum-filter-group">
              <span className="forum-filter-label">Catégorie</span>
              <Link
                href={buildHref({ categorie: undefined, page: undefined })}
                className={!categorySlug ? 'forum-chip forum-chip-active' : 'forum-chip'}
              >
                Toutes
              </Link>
              {categories.map((category) => (
                <Link
                  key={category.id}
                  href={buildHref({ categorie: category.slug ?? undefined, page: undefined })}
                  className={
                    categorySlug === category.slug ? 'forum-chip forum-chip-active' : 'forum-chip'
                  }
                >
                  {category.title}
                </Link>
              ))}
            </div>
          )}
        </nav>

        {feed.docs.length > 0 ? (
          <ul className="forum-list">
            {feed.docs.map((topic) => {
              const category =
                typeof topic.category === 'object' && topic.category !== null
                  ? topic.category
                  : null
              return (
                <li key={topic.id} className="forum-item">
                  <div className="forum-item-main">
                    <div className="forum-badges">
                      {topic.pinned && <span className="forum-badge">Épinglée</span>}
                      {topic.resolved && <span className="forum-badge forum-badge-ok">Résolue</span>}
                      {topic.locked && <span className="forum-badge">Verrouillée</span>}
                      {category && <span className="forum-category">{category.title}</span>}
                    </div>
                    <h2 className="forum-item-title">
                      <Link href={`/forum/${topic.slug}`}>{topic.title}</Link>
                    </h2>
                    <p className="forum-item-meta">
                      {topic.replyCount ?? 0} réponse{(topic.replyCount ?? 0) > 1 ? 's' : ''} ·{' '}
                      {topic.viewCount ?? 0} vue{(topic.viewCount ?? 0) > 1 ? 's' : ''} ·{' '}
                      {relative(topic.lastActivityAt)}
                    </p>
                  </div>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="forum-empty">
            {search
              ? `Aucune discussion ne correspond à « ${search} ».`
              : (community?.forumEmptyState ?? 'Aucune discussion pour le moment.')}
          </p>
        )}

        {feed.totalPages > 1 && (
          <nav className="forum-pagination" aria-label="Pagination">
            {feed.page > 1 && (
              <Link className="forum-link" href={buildHref({ page: String(feed.page - 1) })}>
                ← Précédent
              </Link>
            )}
            <span className="forum-page-indicator">
              Page {feed.page} sur {feed.totalPages}
            </span>
            {feed.hasMore && (
              <Link className="forum-link" href={buildHref({ page: String(feed.page + 1) })}>
                Suivant →
              </Link>
            )}
          </nav>
        )}

        {community?.forumRules && (
          <aside className="forum-rules">
            <h2>Règles de participation</h2>
            <p>{community.forumRules}</p>
          </aside>
        )}
      </section>
    </SiteShell>
  )
}

export default ForumPage
