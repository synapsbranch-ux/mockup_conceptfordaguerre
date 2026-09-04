import Head from 'next/head'
import Link from 'next/link'
import Layout, { Arrow, PageIntro, SiteImage } from '@/components/Layout'
import { projects } from '@/data/site'

export default function Projects() {
  return (
    <Layout>
      <Head><title>Réalisations | Jacques-Daguerre Valcy</title></Head>
      <PageIntro eyebrow="Réalisations" number="02" title={'Des analyses qui<br/><em>deviennent des actions.</em>'} description="Une sélection de projets en visualisation, automatisation, recherche et stratégie analytique. Les résultats chiffrés seront ajoutés après validation du client." />
      <section className="projects-index shell section-pad-top">{projects.map((project) => (
        <Link href={`/projects/${project.slug}`} className="project-index-card" key={project.slug}>
          <div className="project-index-number">{project.number}</div><div className="project-index-image"><SiteImage src={project.image} sizes="(max-width: 820px) 100vw, 42vw" /></div>
          <div className="project-index-copy"><span>{project.type}</span><h2>{project.title}</h2><p>{project.summary}</p><span className="text-link">Voir l’étude de cas <Arrow /></span></div>
        </Link>
      ))}</section>
    </Layout>
  )
}
