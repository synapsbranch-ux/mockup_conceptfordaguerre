import Head from 'next/head'
import Link from 'next/link'
import Layout, { Arrow, SectionTitle, SiteImage } from '@/components/Layout'
import { articles, images, projects, services } from '@/data/site'

export default function Home() {
  return (
    <Layout darkHeader>
      <Head>
        <title>Jacques-Daguerre Valcy | Stratège analytique</title>
        <meta name="description" content="Analyste de données et stratège analytique : je transforme les données en décisions utiles." />
        <meta property="og:title" content="Jacques-Daguerre Valcy | Stratège analytique" />
        <meta property="og:description" content="Transformer les données en décisions utiles." />
        <meta property="og:image" content={images.hero} />
      </Head>

      <section className="hero" style={{ '--hero-image': `url(${images.hero})` }}>
        <div className="hero-overlay" />
        <div className="hero-content shell">
          <p className="hero-kicker"><span /> Analyste de données · Québec / Haïti</p>
          <h1>Transformer les<br />données en <em>décisions utiles.</em></h1>
          <p className="hero-copy">Je suis Jacques-Daguerre Valcy, stratège analytique. Je relie recherche, technologie et vision d’affaires pour créer des solutions qui font avancer.</p>
          <div className="hero-actions">
            <Link href="/projects" className="button button-accent">Voir mes réalisations <Arrow /></Link>
            <Link href="/about" className="button button-ghost">Découvrir mon parcours</Link>
          </div>
        </div>
        <div className="hero-metric" aria-label="Aperçu analytique décoratif">
          <div className="metric-top"><span>Impact mesurable</span><strong>+34%</strong></div>
          <svg viewBox="0 0 360 100" role="img" aria-label="Courbe ascendante illustrant une amélioration">
            <path className="chart-fill" d="M0 88 C45 85,60 58,104 65 S170 80,205 46 S285 55,360 6 L360 100 L0 100Z" />
            <path className="chart-line" d="M0 88 C45 85,60 58,104 65 S170 80,205 46 S285 55,360 6" />
          </svg>
          <div className="metric-bottom"><span>Clarté</span><span>Stratégie</span><span>Action</span></div>
        </div>
        <a className="scroll-cue" href="#approche">Défiler <span>↓</span></a>
      </section>

      <section className="statement shell" id="approche">
        <p className="eyebrow">Mon approche</p>
        <p className="statement-text">La donnée n’a de valeur que lorsqu’elle permet <em>d’agir.</em> Je transforme la complexité en une direction claire, adaptée aux personnes qui décident.</p>
        <div className="statement-signature">JDV</div>
      </section>

      <section className="featured section-pad shell">
        <SectionTitle eyebrow="Sélection" title="Réalisations choisies" action="Tous les projets" href="/projects" />
        <div className="project-feature-grid">
          {projects.slice(0, 3).map((project, index) => (
            <Link className={index === 0 ? 'project-card project-card-large' : 'project-card'} href={`/projects/${project.slug}`} key={project.slug}>
              <div className="media-frame"><SiteImage src={project.image} sizes={index === 0 ? '(max-width: 820px) 100vw, 58vw' : '(max-width: 820px) 100vw, 40vw'} /></div>
              <div className="project-card-meta"><span>{project.number} / {project.type}</span><Arrow /></div>
              <h3>{project.title}</h3>
              <p>{project.summary}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="services-preview section-pad">
        <div className="shell">
          <SectionTitle eyebrow="Datakle" title="De la question à la solution" action="Découvrir les services" href="/services" />
          <div className="service-list">
            {services.map((service) => (
              <Link href="/services" className="service-row" key={service.number}>
                <span className="service-number">{service.number}</span><h3>{service.title}</h3><p>{service.text}</p><Arrow />
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="origin-split">
        <div className="origin-image"><SiteImage src={images.journey} alt="Parcours personnel entre Haïti et le Québec" sizes="(max-width: 820px) 100vw, 50vw" /></div>
        <div className="origin-copy">
          <p className="eyebrow light">Un parcours, deux territoires</p>
          <h2>D’Haïti au Québec,<br /><em>une même volonté d’impact.</em></h2>
          <p>Mon parcours réunit agronomie, économie, gestion de projet et analytique d’affaires. Cette diversité me permet de regarder un problème sous plusieurs angles avant de proposer une solution.</p>
          <Link className="button button-light" href="/about">Lire mon histoire <Arrow /></Link>
        </div>
      </section>

      <section className="home-gallery section-pad shell">
        <SectionTitle eyebrow="Parcours en images" title="Des racines, des rencontres, une trajectoire" />
        <div className="home-gallery-grid">
          <figure className="gallery-tall">
            <SiteImage src={images.fsaUlaval} alt="Jacques-Daguerre Valcy à la Faculté des sciences de l’agriculture et de l’alimentation" sizes="(max-width: 520px) 100vw, 38vw" />
            <figcaption><span>01</span> Formation & recherche</figcaption>
          </figure>
          <figure>
            <SiteImage src={images.graduation} alt="Portrait de graduation de Jacques-Daguerre Valcy" sizes="(max-width: 520px) 100vw, 31vw" />
            <figcaption><span>02</span> Persévérance académique</figcaption>
          </figure>
          <figure>
            <SiteImage src={images.universityGroup} alt="Jacques-Daguerre Valcy avec un groupe universitaire" sizes="(max-width: 520px) 100vw, 31vw" />
            <figcaption><span>03</span> Intelligence collective</figcaption>
          </figure>
          <figure className="gallery-wide">
            <SiteImage src={images.colleaguesEvent} alt="Rencontre professionnelle avec des collègues" sizes="(max-width: 520px) 100vw, 62vw" />
            <figcaption><span>04</span> Collaboration & communauté</figcaption>
          </figure>
        </div>
      </section>

      <section className="article-preview section-pad shell">
        <SectionTitle eyebrow="Notes & perspectives" title="Penser la donnée autrement" action="Voir le blog" href="/blog" />
        <div className="article-grid">
          {articles.slice(0, 3).map((article) => (
            <Link href={`/blog/${article.slug}`} className="article-card" key={article.slug}>
              <div className="article-image"><SiteImage src={article.image} sizes="(max-width: 820px) 100vw, 33vw" /></div>
              <span className="article-category">{article.category}</span><h3>{article.title}</h3>
              <div className="article-meta"><span>{article.date} · {article.read}</span><Arrow /></div>
            </Link>
          ))}
        </div>
      </section>

      <section className="cta-band shell">
        <div><p className="eyebrow light">Une question à explorer ?</p><h2>Faisons parler<br /><em>vos données.</em></h2></div>
        <Link href="/contact" className="round-link" aria-label="Me contacter"><Arrow /></Link>
      </section>
    </Layout>
  )
}
