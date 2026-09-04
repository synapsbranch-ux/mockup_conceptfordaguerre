import Head from 'next/head'
import Link from 'next/link'
import Layout, { Arrow, SiteImage } from '@/components/Layout'
import { projects } from '@/data/site'

export default function ProjectPage({ project, nextProject }) {
  if (!project) return null
  return (
    <Layout><Head><title>{project.title} | Réalisations</title></Head><article className="case-study">
      <header className="case-header shell"><Link href="/projects" className="back-link">← Toutes les réalisations</Link><p className="eyebrow">{project.type} · {project.number}</p><h1>{project.title}</h1><p>{project.summary}</p></header>
      <div className="case-hero shell"><SiteImage src={project.image} sizes="100vw" priority /></div>
      <div className="case-content shell"><aside><span>Technologies</span>{project.technologies.map((technology) => <p key={technology}>{technology}</p>)}</aside>
        <div className="case-sections">
          <section><span>01</span><div><h2>Contexte & problème</h2><p>{project.problem}</p></div></section>
          <section><span>02</span><div><h2>Méthodologie</h2><p>{project.method}</p></div></section>
          <section><span>03</span><div><h2>Résultats</h2><p>{project.result}</p><small>Résultats chiffrés à confirmer avant publication.</small></div></section>
          <section><span>04</span><div><h2>Ce que j’ai appris</h2><p>{project.learning}</p></div></section>
        </div>
      </div>
      <Link className="next-case" href={`/projects/${nextProject.slug}`}><span>Projet suivant</span><strong>{nextProject.title}</strong><Arrow /></Link>
    </article></Layout>
  )
}

export function getStaticPaths() { return { paths: projects.map(({ slug }) => ({ params: { slug } })), fallback: false } }
export function getStaticProps({ params }) { const index = projects.findIndex((item) => item.slug === params.slug); return { props: { project: projects[index], nextProject: projects[(index + 1) % projects.length] } } }
