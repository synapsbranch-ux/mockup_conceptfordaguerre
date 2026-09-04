import Head from 'next/head'
import Layout, { PageIntro, SiteImage } from '@/components/Layout'
import { images } from '@/data/site'

const commitments = [
  ['01', 'Développement d’Haïti', 'Contribuer à la valorisation des données dans les institutions, l’agriculture et les initiatives qui façonnent l’avenir du pays.'],
  ['02', 'Éducation & mentorat', 'Encourager les jeunes à découvrir la data, soutenir la formation continue et transmettre avec la générosité reçue de mentors comme Yvan Blaise.'],
  ['03', 'Démocratisation de la donnée', 'Vulgariser l’analytique grâce à des articles, visualisations et outils qui rendent la connaissance accessible au plus grand nombre.'],
  ['04', 'Initiatives communautaires', 'Collaborer avec des écoles, associations et organisations autour de projets bénévoles et d’actions locales à impact.'],
]

export default function Engagement() {
  return (
    <Layout>
      <Head><title>Engagement social | Jacques-Daguerre Valcy</title></Head>
      <PageIntro eyebrow="Engagement social" number="05" title={'La connaissance au service<br/><em>de la transformation sociale.</em>'} description="Je crois que la donnée peut soutenir l’éducation, renforcer les communautés et contribuer à un développement plus juste, particulièrement en Haïti." />
      <section className="engagement-visual shell"><SiteImage src={images.haitiData} alt="La donnée comme outil de transformation sociale en Haïti" sizes="(max-width: 820px) 100vw, 65vw" priority /><div className="engagement-quote"><span>Mon pourquoi</span><blockquote>« Rendre la connaissance accessible pour que davantage de personnes puissent participer aux décisions qui les concernent. »</blockquote></div></section>
      <section className="commitments shell section-pad">{commitments.map(([number, title, text]) => <article key={number}><span>{number}</span><h2>{title}</h2><p>{text}</p></article>)}</section>
      <section className="education-panel"><div><SiteImage src={images.education} alt="Éducation et mentorat autour des données" sizes="(max-width: 820px) 100vw, 50vw" /></div><div><p className="eyebrow light">Transmettre</p><h2>La donnée devient puissante<br /><em>quand elle se partage.</em></h2><p>Ateliers, contenus pédagogiques, mentorat et collaborations : cette section accueillera les initiatives réalisées et celles à venir.</p></div></section>
      <section className="values-marquee" aria-label="Valeurs"><span>Rigueur</span><span>Impact social</span><span>Éducation</span><span>Transparence</span><span>Innovation responsable</span><span>Solidarité</span></section>
    </Layout>
  )
}
