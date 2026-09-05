import Link from 'next/link'

import { CMSImage } from '@/components/media/CMSImage'
import { Arrow, SectionTitle } from '@/components/site/primitives'
import { resolveHref } from '@/lib/links'
import { getArticles, getCommitments, getProjects, getServices } from '@/lib/payload'
import type {
  Article,
  ArticleListBlock,
  Commitment,
  CommitmentListBlock,
  FeaturedArticleBlock,
  FeaturedProjectBlock,
  Project,
  ProjectGridBlock,
  Service,
  ServiceListBlock,
} from '@/payload-types'

/** Sélection : liste choisie à la main, sinon tri par ordre d'affichage. */
type Selectable = { id: string; featured?: boolean | null }

const select = <T extends Selectable>(
  all: T[],
  block: { source?: string | null; onlyFeatured?: boolean | null; limit?: number | null; items?: unknown },
): T[] => {
  if (block.source === 'manual') {
    const items = (block.items ?? []) as (T | string)[]
    return items.filter((item): item is T => typeof item === 'object' && item !== null)
  }
  const pool = block.onlyFeatured ? all.filter((item) => item.featured) : all
  return pool.slice(0, block.limit ?? pool.length)
}

// --- Projets ------------------------------------------------------------------

const ProjectCard = ({ project, large }: { project: Project; large: boolean }) => (
  <Link
    className={large ? 'project-card project-card-large' : 'project-card'}
    href={`/projects/${project.slug}`}
  >
    <div className="media-frame">
      <CMSImage
        media={project.cover}
        alt={project.coverAlt}
        size="content"
        sizes={large ? '(max-width: 820px) 100vw, 58vw' : '(max-width: 820px) 100vw, 40vw'}
      />
    </div>
    <div className="project-card-meta">
      <span>
        {project.number} / {project.type}
      </span>
      <Arrow />
    </div>
    <h3>{project.title}</h3>
    <p>{project.summary}</p>
  </Link>
)

export const ProjectGrid = async ({ block }: { block: ProjectGridBlock }) => {
  const projects = select(await getProjects(), block)
  if (projects.length === 0) return null

  if (block.variant === 'index') {
    return (
      <section className="projects-index shell section-pad-top">
        {projects.map((project) => (
          <Link href={`/projects/${project.slug}`} className="project-index-card" key={project.id}>
            <div className="project-index-number">{project.number}</div>
            <div className="project-index-image">
              <CMSImage
                media={project.cover}
                alt={project.coverAlt}
                size="content"
                sizes="(max-width: 820px) 100vw, 42vw"
              />
            </div>
            <div className="project-index-copy">
              <span>{project.type}</span>
              <h2>{project.title}</h2>
              <p>{project.summary}</p>
              {block.itemLinkLabel && (
                <span className="text-link">
                  {block.itemLinkLabel} <Arrow />
                </span>
              )}
            </div>
          </Link>
        ))}
      </section>
    )
  }

  return (
    <section className="featured section-pad shell">
      <SectionTitle heading={block.heading} />
      <div className="project-feature-grid">
        {projects.map((project, index) => (
          <ProjectCard key={project.id} project={project} large={index === 0} />
        ))}
      </div>
    </section>
  )
}

export const FeaturedProject = async ({ block }: { block: FeaturedProjectBlock }) => {
  const project = typeof block.project === 'object' ? block.project : null
  if (!project) return null
  return (
    <section className="featured section-pad shell">
      <SectionTitle heading={block.heading} />
      <div className="project-feature-grid">
        <ProjectCard project={project} large />
      </div>
    </section>
  )
}

// --- Services -----------------------------------------------------------------

export const ServiceList = async ({ block }: { block: ServiceListBlock }) => {
  const services = select(await getServices(), block)
  if (services.length === 0) return null

  if (block.variant === 'detail') {
    return (
      <section className="service-detail-list section-pad shell">
        {services.map((service: Service) => (
          <article className="service-detail" key={service.id}>
            <span>{service.number}</span>
            <div>
              <h2>{service.title}</h2>
              <p>{service.summary}</p>
            </div>
            <ul>
              {(service.deliverables ?? []).map((item, index) => (
                <li key={item.id ?? `d-${index}`}>{item.label}</li>
              ))}
            </ul>
          </article>
        ))}
      </section>
    )
  }

  // Variante « lignes » : chaque service pointe vers la destination du lien
  // d'action de l'en-tête, comme dans le prototype.
  const href = block.heading?.showAction ? resolveHref(block.heading.action) : null

  return (
    <section className="services-preview section-pad">
      <div className="shell">
        <SectionTitle heading={block.heading} />
        <div className="service-list">
          {services.map((service: Service) => {
            const content = (
              <>
                <span className="service-number">{service.number}</span>
                <h3>{service.title}</h3>
                <p>{service.summary}</p>
                <Arrow />
              </>
            )
            return href ? (
              <Link href={href} className="service-row" key={service.id}>
                {content}
              </Link>
            ) : (
              <div className="service-row" key={service.id}>
                {content}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

// --- Articles -----------------------------------------------------------------

/** Date affichée : le libellé libre prime, sinon la date de publication formatée. */
const articleDate = (article: Article): string => {
  if (article.publishedLabel?.trim()) return article.publishedLabel
  if (!article.publishedAt) return ''
  return new Intl.DateTimeFormat('fr-CA', { day: 'numeric', month: 'long', year: 'numeric' }).format(
    new Date(article.publishedAt),
  )
}

const pickFeatured = (articles: Article[]): Article | null =>
  articles.find((article) => article.featured) ?? articles[0] ?? null

export const ArticleList = async ({ block }: { block: ArticleListBlock }) => {
  const all = await getArticles()
  const featured = block.excludeFeatured ? pickFeatured(all) : null
  const pool = featured ? all.filter((article) => article.id !== featured.id) : all
  const articles = select(pool, block)
  if (articles.length === 0) return null

  if (block.variant === 'rows') {
    // La numérotation continue celle de l'article à la une, comme dans le prototype.
    const offset = block.excludeFeatured ? 2 : 1
    return (
      <section className="blog-list shell section-pad">
        <div className="blog-list-heading">
          {block.heading?.eyebrow && <p className="eyebrow">{block.heading.eyebrow}</p>}
          {block.metaLabel && <span>{block.metaLabel}</span>}
        </div>
        {articles.map((article, index) => (
          <Link className="blog-row" href={`/blog/${article.slug}`} key={article.id}>
            <span className="blog-row-number">
              {String(index + offset).padStart(2, '0')}
            </span>
            <CMSImage media={article.hero} alt={article.heroAlt} size="card" sizes="250px" />
            <div>
              <span>{article.category}</span>
              <h2>{article.title}</h2>
              <p>{article.excerpt}</p>
            </div>
            <div className="blog-row-meta">
              <span>{article.readingTime}</span>
              <Arrow />
            </div>
          </Link>
        ))}
      </section>
    )
  }

  return (
    <section className="article-preview section-pad shell">
      <SectionTitle heading={block.heading} />
      <div className="article-grid">
        {articles.map((article) => (
          <Link href={`/blog/${article.slug}`} className="article-card" key={article.id}>
            <div className="article-image">
              <CMSImage
                media={article.hero}
                alt={article.heroAlt}
                size="card"
                sizes="(max-width: 820px) 100vw, 33vw"
              />
            </div>
            <span className="article-category">{article.category}</span>
            <h3>{article.title}</h3>
            <div className="article-meta">
              <span>
                {articleDate(article)} · {article.readingTime}
              </span>
              <Arrow />
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}

export const FeaturedArticle = async ({ block }: { block: FeaturedArticleBlock }) => {
  const article =
    block.source === 'manual' && typeof block.article === 'object'
      ? block.article
      : pickFeatured(await getArticles())
  if (!article) return null

  return (
    <section className="blog-feature shell">
      <Link href={`/blog/${article.slug}`} className="blog-feature-image">
        <CMSImage
          media={article.hero}
          alt={article.heroAlt}
          size="hero"
          sizes="(max-width: 820px) 100vw, 62vw"
          priority
        />
      </Link>
      <div className="blog-feature-copy">
        <span>
          {article.category}
          {block.badge ? ` · ${block.badge}` : ''}
        </span>
        <h2>{article.title}</h2>
        <p>{article.excerpt}</p>
        {block.linkLabel && (
          <Link className="text-link" href={`/blog/${article.slug}`}>
            {block.linkLabel} <Arrow />
          </Link>
        )}
      </div>
    </section>
  )
}

// --- Engagements ---------------------------------------------------------------

export const CommitmentList = async ({ block }: { block: CommitmentListBlock }) => {
  const commitments = select(await getCommitments(), block)
  if (commitments.length === 0) return null

  return (
    <section className="commitments shell section-pad">
      {commitments.map((commitment: Commitment) => (
        <article key={commitment.id}>
          <span>{commitment.number}</span>
          <h2>{commitment.title}</h2>
          <p>{commitment.summary}</p>
        </article>
      ))}
    </section>
  )
}
