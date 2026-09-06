/**
 * Seed idempotent du contenu.
 *
 * Clés stables : `slug` pour les documents, `filename` pour les médias. Chaque
 * entité est créée si absente, mise à jour sinon — une seconde exécution ne
 * produit donc aucun doublon.
 *
 * Les pages sont écrites en deux passes : leurs blocs se référencent entre eux
 * (liens de navigation, appels à l'action), il faut donc que tous les
 * identifiants existent avant de résoudre les liens.
 */
import type { Payload } from 'payload'

import { commitmentFixtures } from './fixtures/commitments'
import { footerFixture, headerFixture, navigationSlugs, siteSettingsFixture, socialNetworks } from './fixtures/globals'
import { blockquote, heading, lexical, paragraph } from './fixtures/helpers'
import { legacyArticles, legacyProjects, legacyServices } from './fixtures/legacy-site'
import { mediaFixtures } from './fixtures/media'
import { pageFixtures } from './fixtures/pages'

export type SeedReport = {
  entity: string
  created: number
  updated: number
  total: number
}

type Maps = {
  media: Map<string, string>
  pages: Map<string, string>
}

const seedContext = { disableRevalidate: true } as const

// --- Résolution des références ----------------------------------------------

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/**
 * Remplace récursivement les marqueurs `{ __media }` et `{ __page }` par les
 * identifiants réels. Un marqueur non résolu devient `null` plutôt que de
 * planter : le rapport de seed le signale.
 */
const resolveRefs = (value: unknown, maps: Maps, unresolved: string[]): unknown => {
  if (Array.isArray(value)) return value.map((item) => resolveRefs(item, maps, unresolved))
  if (!isRecord(value)) return value

  if (typeof value.__media === 'string') {
    const fixture = mediaFixtures.find((entry) => entry.key === value.__media)
    const id = fixture ? maps.media.get(fixture.filename) : undefined
    if (!id) unresolved.push(`média « ${value.__media} »`)
    return id ?? null
  }

  if (typeof value.__page === 'string') {
    const id = maps.pages.get(value.__page)
    if (!id) unresolved.push(`page « ${value.__page} »`)
    return id ?? null
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, resolveRefs(item, maps, unresolved)]),
  )
}

// --- Upsert générique --------------------------------------------------------

type UpsertArgs<T> = {
  payload: Payload
  collection: 'projects' | 'articles' | 'services' | 'commitments' | 'pages'
  items: T[]
  keyOf: (item: T) => string
  dataOf: (item: T) => Record<string, unknown>
}

const upsertBySlug = async <T>({
  payload,
  collection,
  items,
  keyOf,
  dataOf,
}: UpsertArgs<T>): Promise<{ created: number; updated: number; ids: Map<string, string> }> => {
  let created = 0
  let updated = 0
  const ids = new Map<string, string>()

  for (const item of items) {
    const slug = keyOf(item)
    const existing = await payload.find({
      collection,
      where: { slug: { equals: slug } },
      limit: 1,
      draft: true,
      overrideAccess: true,
    })

    const data = { ...dataOf(item), slug, _status: 'published' as const }

    // `collection` est une union de slugs : Payload type ses opérations par slug
    // littéral et ne peut pas restreindre `data` ici. Le cast porte uniquement
    // sur la forme des arguments, les données restant validées par Payload.
    if (existing.totalDocs > 0) {
      const doc = await payload.update({
        collection,
        id: existing.docs[0].id,
        data,
        overrideAccess: true,
        context: seedContext,
      } as Parameters<Payload['update']>[0])
      ids.set(slug, String(doc.id))
      updated += 1
    } else {
      const doc = await payload.create({
        collection,
        data,
        overrideAccess: true,
        context: seedContext,
      } as Parameters<Payload['create']>[0])
      ids.set(slug, String(doc.id))
      created += 1
    }
  }

  return { created, updated, ids }
}

// --- Corps d'article ---------------------------------------------------------

/**
 * Corps éditorial du prototype, identique pour les cinq articles dans
 * `src/pages/blog/[slug].js`. Il est repris tel quel — le texte définitif reste
 * à rédiger, ce que signale l'encart de brouillon ajouté à la suite.
 */
const defaultArticleBody = () =>
  lexical([
    heading('Partir de la décision'),
    paragraph(
      'Une démarche analytique utile commence par une question simple : quelle décision voulons-nous améliorer ? Cette question permet de choisir les données, les indicateurs et le niveau de détail réellement nécessaires.',
    ),
    blockquote('La donnée ne remplace pas le jugement. Elle lui donne un contexte plus clair.'),
    heading('Rendre l’information accessible'),
    paragraph(
      'La qualité technique ne suffit pas. Les résultats doivent être compris par les personnes concernées, dans leur langage, au moment où elles en ont besoin. La visualisation et la pédagogie font donc partie intégrante de l’analyse.',
    ),
    heading('Transformer l’analyse en action'),
    paragraph(
      'Le dernier kilomètre est celui de l’action : une recommandation priorisée, un signal d’alerte, une automatisation ou un tableau de bord qui aide à suivre les progrès.',
    ),
  ])


// --- Seed --------------------------------------------------------------------

export const seed = async (payload: Payload): Promise<{ reports: SeedReport[]; unresolved: string[] }> => {
  const unresolved: string[] = []
  const reports: SeedReport[] = []

  // 1. Carte des médias (clé de fixture → identifiant MongoDB).
  const mediaDocs = await payload.find({
    collection: 'media',
    limit: 0,
    pagination: false,
    overrideAccess: true,
  })
  const mediaMap = new Map<string, string>(
    mediaDocs.docs.map((doc) => [doc.filename ?? '', String(doc.id)]),
  )
  if (mediaMap.size === 0) {
    throw new Error(
      'Aucun média en base. Exécuter « npm run payload:migrate-media » avant le seed.',
    )
  }

  const maps: Maps = { media: mediaMap, pages: new Map() }
  const mediaId = (key: string): string | undefined => {
    const fixture = mediaFixtures.find((entry) => entry.key === key)
    const id = fixture ? mediaMap.get(fixture.filename) : undefined
    if (!id) unresolved.push(`média « ${key} »`)
    return id
  }

  // 2. Projets.
  const projects = await upsertBySlug({
    payload,
    collection: 'projects',
    items: legacyProjects,
    keyOf: (project) => project.slug,
    dataOf: (project) => ({
      title: project.title,
      number: project.number,
      type: project.type,
      summary: project.summary,
      cover: mediaId(project.mediaKey),
      problem: project.problem,
      method: project.method,
      result: project.result,
      resultNote: 'Résultats chiffrés à confirmer avant publication.',
      learning: project.learning,
      technologies: project.technologies.map((label) => ({ label })),
      order: Number(project.number) * 10,
      featured: false,
    }),
  })
  reports.push({ entity: 'Projets', created: projects.created, updated: projects.updated, total: legacyProjects.length })

  // 3. Articles.
  const articles = await upsertBySlug({
    payload,
    collection: 'articles',
    items: legacyArticles,
    keyOf: (article) => article.slug,
    dataOf: (article) => ({
      title: article.title,
      category: article.category,
      excerpt: article.excerpt,
      hero: mediaId(article.mediaKey),
      readingTime: article.read,
      publishedLabel: article.date,
      body: defaultArticleBody(),
      // Le premier article est mis à la une.
      featured: article.slug === legacyArticles[0].slug,
      order: (legacyArticles.findIndex((entry) => entry.slug === article.slug) + 1) * 10,
    }),
  })
  reports.push({ entity: 'Articles', created: articles.created, updated: articles.updated, total: legacyArticles.length })

  // 4. Services.
  const services = await upsertBySlug({
    payload,
    collection: 'services',
    items: legacyServices,
    keyOf: (service) =>
      service.title
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, ''),
    dataOf: (service) => ({
      title: service.title,
      number: service.number,
      summary: service.text,
      deliverables: service.deliverables.map((label) => ({ label })),
      order: Number(service.number) * 10,
      featured: false,
      showCta: false,
    }),
  })
  reports.push({ entity: 'Services', created: services.created, updated: services.updated, total: legacyServices.length })

  // 5. Engagements.
  const commitments = await upsertBySlug({
    payload,
    collection: 'commitments',
    items: commitmentFixtures,
    keyOf: (commitment) => commitment.slug,
    dataOf: (commitment) => ({
      title: commitment.title,
      number: commitment.number,
      category: commitment.category,
      summary: commitment.summary,
      order: commitment.order,
      showCta: false,
    }),
  })
  reports.push({
    entity: 'Engagements',
    created: commitments.created,
    updated: commitments.updated,
    total: commitmentFixtures.length,
  })

  // 6. Pages — passe 1 : garantir l'existence de chaque page et de son identifiant.
  let pagesCreated = 0
  for (const page of pageFixtures) {
    const existing = await payload.find({
      collection: 'pages',
      where: { slug: { equals: page.slug } },
      limit: 1,
      draft: true,
      overrideAccess: true,
    })

    if (existing.totalDocs > 0) {
      maps.pages.set(page.slug, String(existing.docs[0].id))
      continue
    }

    const doc = await payload.create({
      collection: 'pages',
      data: {
        slug: page.slug,
        name: page.name,
        title: page.title,
        template: page.template,
        layout: [],
        _status: 'published',
      },
      overrideAccess: true,
      context: seedContext,
    })
    maps.pages.set(page.slug, String(doc.id))
    pagesCreated += 1
  }

  // 7. Pages — passe 2 : écrire la mise en page, tous les identifiants étant connus.
  for (const page of pageFixtures) {
    const id = maps.pages.get(page.slug)
    if (!id) continue

    await payload.update({
      collection: 'pages',
      id,
      data: {
        name: page.name,
        title: page.title,
        template: page.template,
        darkHeader: page.darkHeader ?? false,
        layout: resolveRefs(page.layout, maps, unresolved) as never,
        seo: {
          title: page.seo?.title,
          description: page.seo?.description ?? siteSettingsFixture.defaultSeoDescription,
          image: page.seo?.imageKey ? mediaId(page.seo.imageKey) : undefined,
          noIndex: page.seo?.noIndex ?? false,
        },
        _status: 'published',
      },
      overrideAccess: true,
      context: seedContext,
    })
  }
  reports.push({
    entity: 'Pages',
    created: pagesCreated,
    updated: pageFixtures.length - pagesCreated,
    total: pageFixtures.length,
  })

  // 8. Globals.
  await payload.updateGlobal({
    slug: 'siteSettings',
    data: {
      siteName: siteSettingsFixture.siteName,
      brandName: siteSettingsFixture.brandName,
      brandInitials: siteSettingsFixture.brandInitials,
      tagline: siteSettingsFixture.tagline,
      copyright: siteSettingsFixture.copyright,
      email: siteSettingsFixture.email,
      location: siteSettingsFixture.location,
      availability: siteSettingsFixture.availability,
      appointmentUrl: siteSettingsFixture.appointmentUrl,
      appointmentPending: siteSettingsFixture.appointmentPending,
      socials: socialNetworks,
      defaultSeoTitle: siteSettingsFixture.defaultSeoTitle,
      defaultSeoDescription: siteSettingsFixture.defaultSeoDescription,
      defaultSeoImage: mediaId(siteSettingsFixture.defaultSeoImageKey),
      titleTemplate: siteSettingsFixture.titleTemplate,
      analytics: { provider: 'none' },
      labels: siteSettingsFixture.labels,
      allowIndexing: siteSettingsFixture.allowIndexing,
      keywords: siteSettingsFixture.keywords.map((label) => ({ label })),
      structuredData: {
        personName: siteSettingsFixture.structuredData.personName,
        jobTitle: siteSettingsFixture.structuredData.jobTitle,
        description: siteSettingsFixture.structuredData.description,
        portrait: mediaId(siteSettingsFixture.structuredData.portraitKey),
        organizationName: siteSettingsFixture.structuredData.organizationName,
        organizationDescription: siteSettingsFixture.structuredData.organizationDescription,
        areaServed: siteSettingsFixture.structuredData.areaServed.map((label) => ({ label })),
        knowsAbout: siteSettingsFixture.structuredData.knowsAbout.map((label) => ({ label })),
      },
      notFound: siteSettingsFixture.notFound,
    },
    overrideAccess: true,
    context: seedContext,
  })

  await payload.updateGlobal({
    slug: 'header',
    data: {
      brand: headerFixture.brand,
      navigation: navigationSlugs.map((item) => ({
        link: {
          label: item.label,
          type: 'page' as const,
          page: maps.pages.get(item.page) ?? null,
          newTab: false,
        },
      })),
      cta: {
        enabled: headerFixture.cta.enabled,
        link: {
          label: headerFixture.cta.label,
          type: 'page' as const,
          page: maps.pages.get(headerFixture.cta.page) ?? null,
          newTab: false,
        },
      },
      mobile: headerFixture.mobile,
      skipLinkLabel: headerFixture.skipLinkLabel,
    },
    overrideAccess: true,
    context: seedContext,
  })

  await payload.updateGlobal({
    slug: 'footer',
    data: {
      visuals: footerFixture.visuals.map((visual) => ({
        image: mediaId(visual.mediaKey),
        caption: visual.caption,
      })),
      visualMessage: footerFixture.visualMessage,
      newsletterEyebrow: footerFixture.newsletterEyebrow,
      newsletterTitle: footerFixture.newsletterTitle,
      newsletterFieldLabel: footerFixture.newsletterFieldLabel,
      newsletterPlaceholder: footerFixture.newsletterPlaceholder,
      newsletterButton: footerFixture.newsletterButton,
      newsletterConsent: footerFixture.newsletterConsent,
      newsletterMessages: footerFixture.newsletterMessages,
      columns: footerFixture.columns.map((column) => ({
        title: column.title,
        kind: column.kind,
        links: column.pages.map((entry) => ({
          link:
            'url' in entry && entry.url
              ? { label: entry.label, type: 'custom' as const, url: entry.url, newTab: false }
              : {
                  label: entry.label,
                  type: 'page' as const,
                  page: entry.page ? (maps.pages.get(entry.page) ?? null) : null,
                  newTab: false,
                },
        })),
      })),
      legalLinks: [],
      copyright: footerFixture.copyright,
      signature: footerFixture.signature,
    },
    overrideAccess: true,
    context: seedContext,
  })

  reports.push({ entity: 'Globals', created: 0, updated: 3, total: 3 })

  return { reports, unresolved }
}
