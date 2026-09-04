import Head from 'next/head'
import Link from 'next/link'
import Layout, { SiteImage } from '@/components/Layout'
import { articles } from '@/data/site'

export default function Article({ article }) {
  if (!article) return null
  return (
    <Layout>
      <Head><title>{article.title} | Blog</title></Head>
      <article className="article-page">
        <header className="article-header shell"><Link href="/blog" className="back-link">← Retour au blog</Link><p className="eyebrow">{article.category} · {article.read}</p><h1>{article.title}</h1><p>{article.excerpt}</p></header>
        <div className="article-hero shell"><SiteImage src={article.image} sizes="100vw" priority /></div>
        <div className="article-body">
          <p className="article-lead">Cet article est présenté sous forme de prototype éditorial. Le texte final sera rédigé et validé dans le micro CMS avant publication.</p>
          <h2>Partir de la décision</h2><p>Une démarche analytique utile commence par une question simple : quelle décision voulons-nous améliorer ? Cette question permet de choisir les données, les indicateurs et le niveau de détail réellement nécessaires.</p>
          <blockquote>La donnée ne remplace pas le jugement. Elle lui donne un contexte plus clair.</blockquote>
          <h2>Rendre l’information accessible</h2><p>La qualité technique ne suffit pas. Les résultats doivent être compris par les personnes concernées, dans leur langage, au moment où elles en ont besoin. La visualisation et la pédagogie font donc partie intégrante de l’analyse.</p>
          <h2>Transformer l’analyse en action</h2><p>Le dernier kilomètre est celui de l’action : une recommandation priorisée, un signal d’alerte, une automatisation ou un tableau de bord qui aide à suivre les progrès.</p>
          <div className="article-draft-note">Brouillon de démonstration · Contenu à enrichir dans le CMS.</div>
        </div>
      </article>
    </Layout>
  )
}
export function getStaticPaths() { return { paths: articles.map(({ slug }) => ({ params: { slug } })), fallback: false } }
export function getStaticProps({ params }) { return { props: { article: articles.find((item) => item.slug === params.slug) } } }
