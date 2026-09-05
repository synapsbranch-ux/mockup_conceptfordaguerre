import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { RenderBlocks } from '@/components/blocks/RenderBlocks'
import { CMSImage } from '@/components/media/CMSImage'
import { estimateReadingTime, RichText } from '@/components/richtext/RichText'
import { CommentSection } from '@/components/comments/CommentSection'
import { SiteShell } from '@/components/site/SiteShell'
import { StructuredData } from '@/components/site/StructuredData'
import { getArticle, getSiteSettings } from '@/lib/payload'
import { buildMetadata } from '@/lib/seo'
import { articleSchema, breadcrumbSchema, buildGraph } from '@/lib/structuredData'

type Args = { params: Promise<{ slug: string }> }

export const generateMetadata = async ({ params }: Args): Promise<Metadata> => {
  const { slug } = await params
  const article = await getArticle(slug)
  if (!article) return {}
  return buildMetadata({
    seo: article.seo,
    fallbackTitle: article.title,
    fallbackDescription: article.excerpt,
    fallbackImage: article.hero,
    path: `/blog/${slug}`,
    type: 'article',
    publishedTime: article.publishedAt,
    modifiedTime: article.updatedAt,
  })
}

const ArticlePage = async ({ params }: Args) => {
  const { slug } = await params
  const [article, settings] = await Promise.all([getArticle(slug), getSiteSettings()])

  if (!article) notFound()

  // Le temps de lecture saisi prime ; a defaut il est estime depuis le corps.
  const readingTime = article.readingTime?.trim() || estimateReadingTime(article.body)

  const graph = buildGraph([
    articleSchema(article, settings),
    breadcrumbSchema([
      { name: settings.siteName ?? 'Accueil', path: '/' },
      { name: 'Blog', path: '/blog' },
      { name: article.title, path: `/blog/${article.slug}` },
    ]),
  ])

  return (
    <SiteShell>
      <StructuredData json={graph} />
      <article className="article-page">
        <header className="article-header shell">
          <Link href="/blog" className="back-link">
            {settings.labels?.articleBack}
          </Link>
          <p className="eyebrow">
            {article.category}
            {readingTime ? ` · ${readingTime}` : ''}
          </p>
          <h1>{article.title}</h1>
          <p>{article.excerpt}</p>
        </header>

        <div className="article-hero shell">
          <CMSImage
            media={article.hero}
            alt={article.heroAlt}
            size="hero"
            sizes="100vw"
            priority
          />
        </div>

        <div className="article-body">
          {article.lead && <p className="article-lead">{article.lead}</p>}
          <RichText content={article.body} />
          <RenderBlocks blocks={article.blocks} />
        </div>
      </article>

      {/* Commentaires publics. La section se retire d'elle-meme si l'article
          les a fermes. */}
      <CommentSection article={article} />
    </SiteShell>
  )
}

export default ArticlePage
