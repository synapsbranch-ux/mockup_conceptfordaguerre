import Head from 'next/head'
import Link from 'next/link'
import Layout, { Arrow, PageIntro, SiteImage } from '@/components/Layout'
import { images, services } from '@/data/site'

export default function Services() {
  return (
    <Layout>
      <Head><title>Services Datakle | Jacques-Daguerre Valcy</title></Head>
      <PageIntro eyebrow="Datakle" number="03" title={'La donnée comme<br/><em>levier de progrès.</em>'} description="Datakle accompagne les organisations qui souhaitent mieux comprendre leurs données, automatiser leurs opérations et construire des outils utiles." />
      <section className="services-hero shell"><SiteImage src={images.datakle} alt="Univers visuel de Datakle" sizes="(max-width: 820px) 100vw, 70vw" priority /><div><span>Mission</span><p>Rendre l’analytique accessible et actionnable afin d’améliorer la décision, la performance et l’impact des organisations.</p></div></section>
      <section className="service-detail-list section-pad shell">
        {services.map((service) => (
          <article className="service-detail" key={service.number}>
            <span>{service.number}</span><div><h2>{service.title}</h2><p>{service.text}</p></div>
            <ul>{service.deliverables.map((item) => <li key={item}>{item}</li>)}</ul>
          </article>
        ))}
      </section>
      <section className="vision-panel">
        <div className="vision-copy"><p className="eyebrow light">Vision</p><h2>Créer des solutions utiles ici,<br /><em>contribuer au progrès en Haïti.</em></h2><p>Datakle veut rapprocher expertise analytique, innovation responsable et besoins réels. La vision est de contribuer à des institutions et communautés mieux outillées pour décider.</p></div>
        <div className="vision-image"><SiteImage src={images.haitiImpact} alt="Vision data et développement pour Haïti" sizes="(max-width: 820px) 100vw, 50vw" /></div>
      </section>
      <section className="collab shell section-pad"><div><p className="eyebrow">Collaboration</p><h2>Développeurs, organisations<br />et partenaires : construisons ensemble.</h2></div><Link href="/contact" className="button button-dark">Démarrer une conversation <Arrow /></Link></section>
      <div className="prototype-note shell">Raison sociale officielle et détails administratifs de Datakle à confirmer avant la mise en production.</div>
    </Layout>
  )
}
