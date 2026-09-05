import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { CMSImage } from '@/components/media/CMSImage'
import { Arrow } from '@/components/site/primitives'
import { SiteShell } from '@/components/site/SiteShell'
import { StructuredData } from '@/components/site/StructuredData'
import { getProject, getProjects, getSiteSettings } from '@/lib/payload'
import { buildMetadata } from '@/lib/seo'
import { breadcrumbSchema, buildGraph, projectSchema } from '@/lib/structuredData'
import type { Project } from '@/payload-types'

type Args = { params: Promise<{ slug: string }> }

export const generateMetadata = async ({ params }: Args): Promise<Metadata> => {
  const { slug } = await params
  const project = await getProject(slug)
  if (!project) return {}
  return buildMetadata({
    seo: project.seo,
    fallbackTitle: project.title,
    fallbackDescription: project.summary,
    fallbackImage: project.cover,
    path: `/projects/${slug}`,
  })
}

/**
 * Projet suivant : la premiere relation explicite si elle existe, sinon le
 * projet suivant dans l'ordre d'affichage, en bouclant sur le premier — le
 * comportement du prototype.
 */
const resolveNext = (project: Project, all: Project[]): Project | null => {
  const related = project.relatedProjects?.find(
    (entry): entry is Project => typeof entry === 'object' && entry !== null,
  )
  if (related) return related
  if (all.length < 2) return null
  const index = all.findIndex((entry) => entry.id === project.id)
  return all[(index + 1) % all.length] ?? null
}

const ProjectPage = async ({ params }: Args) => {
  const { slug } = await params
  const [project, projects, settings] = await Promise.all([
    getProject(slug),
    getProjects(),
    getSiteSettings(),
  ])

  if (!project) notFound()

  const labels = settings.labels
  const next = resolveNext(project, projects)

  const graph = buildGraph([
    projectSchema(project, settings),
    breadcrumbSchema([
      { name: settings.siteName ?? 'Accueil', path: '/' },
      { name: 'Réalisations', path: '/projects' },
      { name: project.title, path: `/projects/${project.slug}` },
    ]),
  ])

  return (
    <SiteShell>
      <StructuredData json={graph} />
      <article className="case-study">
        <header className="case-header shell">
          <Link href="/projects" className="back-link">
            {labels?.projectBack}
          </Link>
          <p className="eyebrow">
            {project.type} &middot; {project.number}
          </p>
          <h1>{project.title}</h1>
          <p>{project.summary}</p>
          {project.introduction && <p>{project.introduction}</p>}
        </header>

        <div className="case-hero shell">
          <CMSImage
            media={project.cover}
            alt={project.coverAlt}
            size="hero"
            sizes="100vw"
            priority
          />
        </div>

        <div className="case-content shell">
          <aside>
            <span>{labels?.projectTechnologies}</span>
            {(project.technologies ?? []).map((technology, index) => (
              <p key={technology.id ?? `tech-${index}`}>{technology.label}</p>
            ))}
          </aside>

          <div className="case-sections">
            <section>
              <span>01</span>
              <div>
                <h2>{labels?.projectContext}</h2>
                {project.context && <p>{project.context}</p>}
                <p>{project.problem}</p>
              </div>
            </section>
            <section>
              <span>02</span>
              <div>
                <h2>{labels?.projectMethod}</h2>
                <p>{project.method}</p>
              </div>
            </section>
            <section>
              <span>03</span>
              <div>
                <h2>{labels?.projectResult}</h2>
                <p>{project.result}</p>
                {project.resultNote && <small>{project.resultNote}</small>}
              </div>
            </section>
            <section>
              <span>04</span>
              <div>
                <h2>{labels?.projectLearning}</h2>
                <p>{project.learning}</p>
              </div>
            </section>
          </div>
        </div>

        {(project.gallery ?? []).length > 0 && (
          <div className="shell section-pad-top">
            {(project.gallery ?? []).map((item, index) => (
              <figure key={item.id ?? `gal-${index}`} className="media-frame">
                <CMSImage
                  media={item.image}
                  alt={item.imageAlt}
                  size="content"
                  sizes="(max-width: 820px) 100vw, 1380px"
                />
                {item.caption && <figcaption>{item.caption}</figcaption>}
              </figure>
            ))}
          </div>
        )}

        {next && (
          <Link className="next-case" href={`/projects/${next.slug}`}>
            <span>{labels?.projectNext}</span>
            <strong>{next.title}</strong>
            <Arrow />
          </Link>
        )}
      </article>
    </SiteShell>
  )
}

export default ProjectPage
