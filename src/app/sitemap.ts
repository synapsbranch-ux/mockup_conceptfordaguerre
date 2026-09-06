import type { MetadataRoute } from "next";

import { env } from "@/lib/env";
import {
  getArticles,
  getPayloadClient,
  getProjects,
  getSiteSettings,
} from "@/lib/payload";
import { getPublicTopicSlugs } from "@/lib/forum";
import { pagePath } from "@/lib/links";

/**
 * Plan du site.
 *
 * Ne liste que du contenu reellement atteignable :
 *  - documents publies uniquement (l'API Local filtre les brouillons) ;
 *  - pages marquees « ne pas indexer » exclues ;
 *  - `/space` exclu, c'est une maquette sans contenu indexable.
 *
 * Aucune URL du plan ne peut donc mener a une 404 ou a une page vide.
 */

/** Pages exclues du plan : maquettes ou zones privees. */
const EXCLUDED_SLUGS = new Set(["space"]);

const url = (path: string): string =>
  `${env.serverURL}${path === "/" ? "" : path}`;

const sitemap = async (): Promise<MetadataRoute.Sitemap> => {
  const settings = await getSiteSettings();
  if (settings.allowIndexing === false) return [];

  const payload = await getPayloadClient();

  const { docs: pages } = await payload.find({
    collection: "pages",
    limit: 0,
    pagination: false,
    depth: 0,
    where: { _status: { equals: "published" } },
  });

  const [projects, articles] = await Promise.all([
    getProjects(),
    getArticles(),
  ]);

  const entries: MetadataRoute.Sitemap = [];

  /**
   * Routes statiques, definies par le code plutot que par le CMS.
   *
   * La reservation n'y figure que si elle est ouverte : le plan du site ne
   * doit mener qu'a des pages reellement utiles.
   * Les zones privees — espace client, administration, CMS, authentification —
   * en sont absentes et bloquees par robots.txt.
   *
   * `/forum` est ajoute plus bas, avec ses discussions.
   */
  const clientSpace = await payload
    .findGlobal({ slug: "clientSpaceSettings", depth: 0 })
    .catch(() => null);

  const staticRoutes: { path: string; priority: number; include: boolean }[] = [
    { path: "/ressources", priority: 0.6, include: true },
    { path: "/devis", priority: 0.7, include: true },
    {
      path: "/reservation",
      priority: 0.6,
      include: clientSpace?.bookingEnabled !== false,
    },
  ];

  for (const route of staticRoutes) {
    if (!route.include) continue;
    entries.push({
      url: url(route.path),
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: route.priority,
    });
  }

  for (const page of pages) {
    if (!page.slug || EXCLUDED_SLUGS.has(page.slug)) continue;
    if (page.seo?.noIndex) continue;

    const path = pagePath(page.slug);
    const isHome = path === "/";
    entries.push({
      url: url(path),
      lastModified: new Date(page.updatedAt),
      changeFrequency: isHome ? "weekly" : "monthly",
      priority: isHome ? 1 : 0.8,
    });
  }

  for (const project of projects) {
    if (!project.slug || project.seo?.noIndex) continue;
    entries.push({
      url: url(`/projects/${project.slug}`),
      lastModified: new Date(project.updatedAt),
      changeFrequency: "monthly",
      priority: 0.7,
    });
  }

  for (const article of articles) {
    if (!article.slug || article.seo?.noIndex) continue;
    entries.push({
      url: url(`/blog/${article.slug}`),
      lastModified: new Date(article.updatedAt),
      changeFrequency: "monthly",
      priority: 0.7,
    });
  }

  // Forum : uniquement les discussions publiees. `getPublicTopicSlugs` borne
  // deja la requete au statut « published », donc aucun contenu masque,
  // archive ou en brouillon ne peut atteindre le plan du site.
  const community = await payload
    .findGlobal({ slug: "communitySettings", depth: 0 })
    .catch(() => null);

  if (community?.forumEnabled !== false) {
    entries.push({
      url: url("/forum"),
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.6,
    });

    for (const topic of await getPublicTopicSlugs()) {
      entries.push({
        url: url(`/forum/${topic.slug}`),
        lastModified: new Date(topic.updatedAt),
        changeFrequency: "weekly",
        priority: 0.5,
      });
    }
  }

  /**
   * Versions anglaises.
   *
   * Seules les pages qui ont reellement un miroir `/en` sont ajoutees : y
   * declarer une page inexistante enverrait les moteurs sur une 404.
   *
   * Les deux versions sont appariees par `alternates.languages`, ce qui evite
   * qu'elles soient prises pour du contenu duplique.
   */
  const MIRRORED = new Set([
    "/",
    ...pages.map((page) => pagePath(page.slug)),
    ...articles.map((article) => `/blog/${article.slug}`),
  ]);

  const withAlternates: MetadataRoute.Sitemap = [];

  for (const entry of entries) {
    const path = entry.url.replace(env.serverURL, "") || "/";
    if (!MIRRORED.has(path)) {
      withAlternates.push(entry);
      continue;
    }

    const frURL = url(path);
    const enURL = url(path === "/" ? "/en" : `/en${path}`);

    withAlternates.push({
      ...entry,
      alternates: { languages: { fr: frURL, en: enURL } },
    });
    withAlternates.push({
      ...entry,
      url: enURL,
      alternates: { languages: { fr: frURL, en: enURL } },
    });
  }

  return withAlternates;
};

export default sitemap;
