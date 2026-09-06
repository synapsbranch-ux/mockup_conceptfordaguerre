import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { RenderBlocks } from '@/components/blocks/RenderBlocks'
import { CommentSection } from '@/components/comments/CommentSection'
import { CMSImage } from '@/components/media/CMSImage'
import { estimateReadingTime, RichText } from '@/components/richtext/RichText'
import { SiteShell } from '@/components/site/SiteShell'
import { StructuredData } from '@/components/site/StructuredData'
import { dictionary } from '@/lib/i18n'
import { getArticle, getSiteSettings } from '@/lib/payload'
import { buildMetadata } from '@/lib/seo'
import { articleSchema, breadcrumbSchema, buildGraph } from '@/lib/structuredData'

type Args = { params: Promise<{ slug: string }> }

const t = dictionary('en')

/**
 * Article de blog, version anglaise.
 *
 * Le slug reste celui du document : un article n'a qu'une adresse par langue,
 * `/blog/x` et `/en/blog/x`, ce qui garde les deux versions appariées pour les
 * moteurs de recherche.
 */
export const generateMetadata = async ({ params }: Args): Promise<Metadata> => {
  const { slug } = await params
  const article = await getArticle(slug, 'en')
  if (!article) return {}

  return buildMetadata({
    seo: article.seo,
    fallbackTitle: article.title,
    fallbackDescription: article.excerpt,
    fallbackImage: article.hero,
    path: `/en/blog/${slug}`,
    locale: 'en',
    type: 'article',
    publishedTime: article.publishedAt,
    modifiedTime: article.updatedAt,
  })
}

const EnglishArticlePage = async ({ params }: Args) => {
  const { slug } = await params
  const [article, settings] = await Promise.all([getArticle(slug, 'en'), getSiteSettings()])

  if (!article) notFound()

  const readingTime = article.readingTime?.trim() || estimateReadingTime(article.body)

  const graph = buildGraph([
    articleSchema(article, settings),
    breadcrumbSchema([
      { name: settings.siteName ?? 'Home', path: '/en' },
      { name: 'Blog', path: '/en/blog' },
      { name: article.title, path: `/en/blog/${article.slug}` },
    ]),
  ])

  return (
    <SiteShell>
      <StructuredData json={graph} />
      <article className="article-page">
        <header className="article-header shell">
          <Link href="/blog" className="back-link">
            {t.backToList}
          </Link>
          <p className="eyebrow">
            {article.category}
            {readingTime ? ` · ${readingTime}` : ''}
          </p>
          <h1>{article.title}</h1>
          <p>{article.excerpt}</p>
        </header>

        <div className="article-hero shell">
          <CMSImage media={article.hero} alt={article.heroAlt} size="hero" sizes="100vw" priority />
        </div>

        <div className="article-body">
          {article.lead && <p className="article-lead">{article.lead}</p>}
          <RichText content={article.body} />
          <RenderBlocks blocks={article.blocks} />
        </div>
      </article>

      <CommentSection article={article} />
    </SiteShell>
  )
}

export default EnglishArticlePage
