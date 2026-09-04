import Head from 'next/head'
import Layout, { PageIntro } from '@/components/Layout'
import { images, journey } from '@/data/site'

export default function About() {
  return (
    <Layout>
      <Head><title>À propos | Jacques-Daguerre Valcy</title></Head>
      <PageIntro eyebrow="À propos" number="01" title={'Comprendre les systèmes.<br/><em>Faire avancer les décisions.</em>'} description="Ingénieur-agronome de formation, analyste par expertise et stratège par conviction. Mon parcours suit un même fil : rendre la complexité utile." />
      <section className="about-lead shell">
        <div className="about-portrait"><img src={images.portrait} alt="Portrait professionnel de Jacques-Daguerre Valcy" /></div>
        <div className="about-biography">
          <p className="eyebrow">Biographie</p>
          <p className="lead-copy">Je crois à une analytique qui ne s’arrête pas aux constats. Une analytique qui aide les organisations à comprendre, choisir et agir avec plus de confiance.</p>
          <p>Ma formation d’ingénieur-agronome m’a appris à observer les systèmes dans leur ensemble. Ma spécialisation en économie m’a donné les outils pour comprendre les mécanismes de décision. La gestion de projet, le suivi-évaluation et la recherche ont ensuite structuré ma façon de travailler.</p>
          <p>Aujourd’hui, l’analyse de données est au cœur de mon expertise. Je m’intéresse particulièrement aux systèmes d’aide à la décision qui rendent l’information disponible au bon moment et sous une forme réellement adaptée aux acteurs.</p>
          <div className="about-note"><span>À compléter avec le client</span><p>Note exacte du MBA, titre et réalisations chez Desjardins, dates du parcours et courte mention du mentor Yvan Blaise.</p></div>
        </div>
      </section>
      <section className="journey-section section-pad"><div className="shell">
        <p className="eyebrow light">Le fil du parcours</p><h2 className="display-light">De la terre aux données,<br /><em>de l’analyse à l’action.</em></h2>
        <div className="journey-list">{journey.map((item, index) => (
          <article className="journey-row" key={item.title}><span>0{index + 1}</span><div><h3>{item.title}</h3><p>{item.text}</p></div><img src={item.image} alt="" /></article>
        ))}</div>
      </div></section>
      <section className="about-grid section-pad shell">
        <div><p className="eyebrow">Aujourd’hui</p><h2>Analytique d’affaires,<br />stratégie et Datakle.</h2></div>
        <div className="about-story"><p>J’ai complété une formation de deuxième cycle en suivi-évaluation et un MBA spécialisé en analytique d’affaires. Ces expériences ont renforcé ma capacité à relier les données aux objectifs, aux processus et aux réalités humaines.</p><p>La création de Datakle traduit cette ambition : offrir des services d’analyse, de visualisation, d’automatisation et de solutions Web/data qui créent un impact concret.</p></div>
        <div className="value-stack">{['Rigueur', 'Impact', 'Éducation', 'Transparence', 'Innovation responsable', 'Solidarité'].map((value) => <span key={value}>{value}</span>)}</div>
      </section>
    </Layout>
  )
}
