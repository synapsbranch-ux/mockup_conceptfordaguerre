import { env } from '@/lib/env'
import { getArticles, getCommitments, getPayloadClient, getProjects, getServices, getSiteSettings } from '@/lib/payload'
import { pagePath } from '@/lib/links'

/**
 * llms.txt — vue synthetique du site pour les agents conversationnels.
 *
 * Convention llmstxt.org : un document Markdown court, servi en texte brut, qui
 * decrit le site et pointe vers ses pages principales. Il evite aux modeles de
 * deviner la structure a partir du HTML.
 *
 * Entierement genere depuis le CMS : publier un projet ou un article le fait
 * apparaitre ici automatiquement. Seul le contenu publie y figure.
 */

export const dynamic = 'force-dynamic'

const line = (label: string, path: string, description?: string | null): string =>
  `- [${label}](${env.serverURL}${path === '/' ? '' : path})${description ? `: ${description}` : ''}`

/** Ramene un texte a une ligne courte, sans retour a la ligne. */
const brief = (value: string | null | undefined, max = 160): string | undefined => {
  if (!value) return undefined
  const flat = value.replace(/\s+/g, ' ').trim()
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat
}

export const GET = async (): Promise<Response> => {
  const settings = await getSiteSettings()

  if (settings.allowIndexing === false) {
    return new Response('# Site en préparation\n\nContenu non disponible pour le moment.\n', {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  }

  const payload = await getPayloadClient()
  const [{ docs: pages }, projects, articles, services, commitments] = await Promise.all([
    payload.find({
      collection: 'pages',
      limit: 0,
      pagination: false,
      depth: 0,
      where: { _status: { equals: 'published' } },
      sort: 'createdAt',
    }),
    getProjects(),
    getArticles(),
    getServices(),
    getCommitments(),
  ])

  const data = settings.structuredData
  const out: string[] = []

  out.push(`# ${settings.siteName ?? 'Site'}`)
  out.push('')

  const summary = brief(data?.description ?? settings.defaultSeoDescription, 400)
  if (summary) {
    out.push(`> ${summary}`)
    out.push('')
  }

  // Contexte factuel, uniquement ce qui est renseigne dans le CMS.
  const facts: string[] = []
  if (data?.personName && data?.jobTitle) facts.push(`${data.personName} — ${data.jobTitle}.`)
  if (settings.location) facts.push(`Basé à ${settings.location}.`)
  if (data?.organizationName) {
    const org = brief(data.organizationDescription)
    facts.push(org ? `${data.organizationName} : ${org}` : `Organisation : ${data.organizationName}.`)
  }
  const expertise = (data?.knowsAbout ?? []).map((entry) => entry.label).filter(Boolean)
  if (expertise.length > 0) facts.push(`Domaines d’expertise : ${expertise.join(', ')}.`)
  if (settings.email) facts.push(`Contact : ${settings.email}.`)
  if (facts.length > 0) {
    out.push(facts.join(' '))
    out.push('')
  }

  out.push('## Pages')
  out.push('')
  for (const page of pages) {
    if (!page.slug || page.slug === 'space') continue
    out.push(line(page.title ?? page.name ?? page.slug, pagePath(page.slug), brief(page.seo?.description)))
  }
  out.push('')

  if (projects.length > 0) {
    out.push('## Réalisations')
    out.push('')
    for (const project of projects) {
      out.push(line(project.title, `/projects/${project.slug}`, brief(project.summary)))
    }
    out.push('')
  }

  if (articles.length > 0) {
    out.push('## Articles')
    out.push('')
    for (const article of articles) {
      out.push(line(article.title, `/blog/${article.slug}`, brief(article.excerpt)))
    }
    out.push('')
  }

  if (services.length > 0) {
    out.push('## Services')
    out.push('')
    for (const service of services) {
      const text = brief(service.summary)
      out.push(`- ${service.title}${text ? `: ${text}` : ''}`)
    }
    out.push('')
  }

  if (commitments.length > 0) {
    out.push('## Engagements')
    out.push('')
    for (const commitment of commitments) {
      const text = brief(commitment.summary)
      out.push(`- ${commitment.title}${text ? `: ${text}` : ''}`)
    }
    out.push('')
  }

  const socials = (settings.socials ?? []).filter((social) => social.url?.trim())
  if (socials.length > 0) {
    out.push('## Ailleurs')
    out.push('')
    for (const social of socials) out.push(`- [${social.label}](${social.url})`)
    out.push('')
  }

  out.push('## Ressources')
  out.push('')
  out.push(`- [Plan du site](${env.serverURL}/sitemap.xml)`)
  out.push('')

  return new Response(out.join('\n'), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
