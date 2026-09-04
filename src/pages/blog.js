import Head from 'next/head'
import Link from 'next/link'
import Layout, { Arrow, PageIntro } from '@/components/Layout'
import { articles } from '@/data/site'

export default function Blog() {
  const [featured, ...rest] = articles
  return (
    <Layout>
      <Head><title>Blog | Jacques-Daguerre Valcy</title></Head>
      <PageIntro eyebrow="Blog" number="04" title={'Des idées pour<br/><em>mieux décider.</em>'} description="Analytique, automatisation, entrepreneuriat et impact social — des réflexions pour rendre la donnée plus humaine et plus utile." />
      <section className="blog-feature shell">
        <Link href={`/blog/${featured.slug}`} className="blog-feature-image"><img src={featured.image} alt="" /></Link>
        <div className="blog-feature-copy"><span>{featured.category} · Article à la une</span><h2>{featured.title}</h2><p>{featured.excerpt}</p><Link className="text-link" href={`/blog/${featured.slug}`}>Lire l’article <Arrow /></Link></div>
      </section>
      <section className="blog-list shell section-pad">
        <div className="blog-list-heading"><p className="eyebrow">Tous les articles</p><span>05 perspectives à venir</span></div>
        {rest.map((article, index) => (
          <Link className="blog-row" href={`/blog/${article.slug}`} key={article.slug}>
            <span className="blog-row-number">0{index + 2}</span><img src={article.image} alt="" /><div><span>{article.category}</span><h2>{article.title}</h2><p>{article.excerpt}</p></div><div className="blog-row-meta"><span>{article.read}</span><Arrow /></div>
          </Link>
        ))}
      </section>
    </Layout>
  )
}
