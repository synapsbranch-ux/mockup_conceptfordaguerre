import type { MetadataRoute } from 'next'

import { env } from '@/lib/env'
import { getSiteSettings } from '@/lib/payload'

/**
 * robots.txt genere depuis le CMS.
 *
 * Decocher « Autoriser l'indexation » dans les reglages du site bloque
 * l'ensemble des robots — utile tant que le site n'est pas pret a etre reference.
 *
 * Les zones privees sont exclues explicitement : l'administration, l'API et les
 * routes de previsualisation n'ont rien a faire dans un index.
 */
const robots = async (): Promise<MetadataRoute.Robots> => {
  const settings = await getSiteSettings()
  const allowed = settings.allowIndexing !== false

  if (!allowed) {
    return {
      rules: [{ userAgent: '*', disallow: '/' }],
      host: env.serverURL,
    }
  }

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/admin/', '/api/', '/space'],
      },
      // Les robots d'IA generative sont laisses libres sur le contenu public :
      // `llms.txt` leur donne une vue synthetique du site.
      {
        userAgent: ['GPTBot', 'ClaudeBot', 'PerplexityBot', 'Google-Extended'],
        allow: '/',
        disallow: ['/admin', '/admin/', '/api/'],
      },
    ],
    sitemap: `${env.serverURL}/sitemap.xml`,
    host: env.serverURL,
  }
}

export default robots
