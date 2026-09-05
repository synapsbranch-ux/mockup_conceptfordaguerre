#!/usr/bin/env node
/**
 * Audit SEO technique.
 *
 * Controle, page par page, ce que les moteurs de recherche et Search Console
 * examinent reellement : metadonnees, unicite, donnees structurees, liens
 * internes, accessibilite des images.
 *
 *   node scripts/seo-audit.mjs [url]
 *
 * Sort en code 1 si un controle bloquant echoue.
 */
const BASE = process.argv[2] ?? 'http://localhost:3000'

const checks = []
const pass = (page, label, detail = '') => checks.push({ page, label, ok: true, detail })
const fail = (page, label, detail = '') => checks.push({ page, label, ok: false, detail })

const get = async (path) => {
  const response = await fetch(`${BASE}${path}`)
  return { status: response.status, body: await response.text() }
}

// --- Extraction -------------------------------------------------------------

const tag = (html, re) => {
  const match = html.match(re)
  return match ? match[1].trim() : null
}

const title = (html) => tag(html, /<title>([^<]*)<\/title>/)
const meta = (html, name) =>
  tag(html, new RegExp(`<meta[^>]+name="${name}"[^>]+content="([^"]*)"`, 'i')) ??
  tag(html, new RegExp(`<meta[^>]+content="([^"]*)"[^>]+name="${name}"`, 'i'))
const prop = (html, property) =>
  tag(html, new RegExp(`<meta[^>]+property="${property}"[^>]+content="([^"]*)"`, 'i')) ??
  tag(html, new RegExp(`<meta[^>]+content="([^"]*)"[^>]+property="${property}"`, 'i'))
const canonical = (html) => tag(html, /<link[^>]+rel="canonical"[^>]+href="([^"]*)"/i)
const jsonLd = (html) =>
  [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => m[1])

const headings = (html, level) => [...html.matchAll(new RegExp(`<h${level}[^>]*>`, 'g'))].length

const images = (html) => [...html.matchAll(/<img\b[^>]*>/g)].map((m) => m[0])
const internalLinks = (html) =>
  [...new Set([...html.matchAll(/href="(\/[^"#?]*)"/g)].map((m) => m[1]))].filter(
    (href) => !href.startsWith('/api/') && !href.startsWith('/admin'),
  )

// --- Pages auditees ---------------------------------------------------------

const PAGES = [
  '/',
  '/about',
  '/projects',
  '/services',
  '/blog',
  '/contact',
  '/engagement',
  '/legal',
  '/projects/tableaux-de-bord-power-bi',
  '/blog/comment-la-data-peut-aider-haiti',
]

/** Pages volontairement exclues des moteurs. */
const NOINDEX_EXPECTED = new Set(['/space'])

const run = async () => {
  console.log(`\nAudit SEO — ${BASE}`)
  console.log('='.repeat(74))

  const titles = new Map()
  const descriptions = new Map()
  const allLinks = new Set()

  for (const path of PAGES) {
    const page = await get(path)
    const label = path

    if (page.status !== 200) {
      fail(label, 'HTTP 200', `recu ${page.status}`)
      continue
    }

    const html = page.body

    // --- Metadonnees de base
    const t = title(html)
    if (!t) fail(label, 'Balise title')
    else if (t.length < 25 || t.length > 70) fail(label, 'Longueur du title', `${t.length} caracteres`)
    else pass(label, 'Balise title', `${t.length} car.`)
    if (t) titles.set(label, t)

    const d = meta(html, 'description')
    if (!d) fail(label, 'Meta description')
    else if (d.length < 60 || d.length > 170)
      fail(label, 'Longueur de la description', `${d.length} caracteres`)
    else pass(label, 'Meta description', `${d.length} car.`)
    if (d) descriptions.set(label, d)

    // --- URL canonique
    const c = canonical(html)
    const expected = `${BASE}${path === '/' ? '' : path}`
    if (!c) fail(label, 'URL canonique')
    else if (c !== expected) fail(label, 'URL canonique', `${c} au lieu de ${expected}`)
    else pass(label, 'URL canonique')

    // --- Open Graph et Twitter
    const ogMissing = ['og:title', 'og:description', 'og:image', 'og:url', 'og:type', 'og:site_name']
      .filter((key) => !prop(html, key))
    if (ogMissing.length > 0) fail(label, 'Open Graph', `manquant : ${ogMissing.join(', ')}`)
    else pass(label, 'Open Graph', '6 balises')

    const twMissing = ['twitter:card', 'twitter:title', 'twitter:description', 'twitter:image']
      .filter((key) => !meta(html, key))
    if (twMissing.length > 0) fail(label, 'Twitter Card', `manquant : ${twMissing.join(', ')}`)
    else pass(label, 'Twitter Card', '4 balises')

    // --- Structure du document
    if (!/<html[^>]+lang="fr"/.test(html)) fail(label, 'Attribut lang')
    else pass(label, 'Attribut lang')

    if (!/<meta charSet="utf-8"|<meta charset="utf-8"/i.test(html)) fail(label, 'Charset')
    else pass(label, 'Charset')

    if (!/name="viewport"/.test(html)) fail(label, 'Viewport')
    else pass(label, 'Viewport')

    const h1 = headings(html, 1)
    if (h1 === 1) pass(label, 'Un seul h1')
    else fail(label, 'Un seul h1', `${h1} trouve(s)`)

    // --- Donnees structurees
    const blocks = jsonLd(html)
    if (blocks.length === 0) fail(label, 'JSON-LD')
    else {
      try {
        const parsed = blocks.map((block) => JSON.parse(block))
        const types = parsed.flatMap((entry) =>
          (entry['@graph'] ?? [entry]).map((node) => node['@type']),
        )
        pass(label, 'JSON-LD valide', types.join(', '))
      } catch (error) {
        fail(label, 'JSON-LD valide', error.message)
      }
    }

    // --- Images
    const withoutAlt = images(html).filter((img) => !/\balt="/.test(img))
    if (withoutAlt.length > 0) fail(label, 'Texte alternatif des images', `${withoutAlt.length} sans alt`)
    else pass(label, 'Texte alternatif des images', `${images(html).length} images`)

    const emptyAlt = images(html).filter((img) => /\balt=""/.test(img))
    if (emptyAlt.length > 0) fail(label, 'Alt non vide', `${emptyAlt.length} alt vide(s)`)
    else pass(label, 'Alt non vide')

    // --- Indexabilite
    const robotsMeta = meta(html, 'robots') ?? ''
    if (NOINDEX_EXPECTED.has(path)) {
      if (robotsMeta.includes('noindex')) pass(label, 'Exclusion voulue des moteurs')
      else fail(label, 'Exclusion voulue des moteurs', 'devrait etre noindex')
    } else if (robotsMeta.includes('noindex')) {
      fail(label, 'Page indexable', 'noindex present')
    } else {
      pass(label, 'Page indexable')
    }

    for (const link of internalLinks(html)) allLinks.add(link)
  }

  // --- Unicite des metadonnees ---------------------------------------------
  const dupTitles = [...titles.values()].filter((v, i, arr) => arr.indexOf(v) !== i)
  if (dupTitles.length > 0) fail('site', 'Titres uniques', `doublon : ${dupTitles[0]}`)
  else pass('site', 'Titres uniques', `${titles.size} pages`)

  const dupDesc = [...descriptions.values()].filter((v, i, arr) => arr.indexOf(v) !== i)
  if (dupDesc.length > 0)
    fail('site', 'Descriptions uniques', `${dupDesc.length} doublon(s)`)
  else pass('site', 'Descriptions uniques', `${descriptions.size} pages`)

  // --- Ressources de reference ---------------------------------------------
  const robots = await get('/robots.txt')
  if (robots.status !== 200) fail('site', 'robots.txt', `HTTP ${robots.status}`)
  else if (!robots.body.includes('Sitemap:')) fail('site', 'robots.txt', 'ne reference pas le sitemap')
  else if (!robots.body.includes('Disallow: /admin')) fail('site', 'robots.txt', 'n exclut pas /admin')
  else pass('site', 'robots.txt', 'sitemap reference, /admin exclu')

  const sitemap = await get('/sitemap.xml')
  if (sitemap.status !== 200) {
    fail('site', 'sitemap.xml', `HTTP ${sitemap.status}`)
  } else {
    const urls = [...sitemap.body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])
    if (urls.length === 0) {
      fail('site', 'sitemap.xml', 'aucune URL')
    } else {
      // Chaque URL du plan doit repondre 200 : aucune entree ne doit mener a
      // une 404, c'est l'erreur la plus penalisante en Search Console.
      let broken = 0
      for (const url of urls) {
        const response = await fetch(url)
        if (response.status !== 200) broken += 1
      }
      if (broken > 0) fail('site', 'URLs du sitemap', `${broken}/${urls.length} en erreur`)
      else pass('site', 'URLs du sitemap', `${urls.length} URLs, toutes en 200`)
    }
  }

  const llms = await get('/llms.txt')
  if (llms.status !== 200) fail('site', 'llms.txt', `HTTP ${llms.status}`)
  else if (!llms.body.startsWith('#')) fail('site', 'llms.txt', 'format inattendu')
  else pass('site', 'llms.txt', `${llms.body.split('\n').length} lignes`)

  // --- Liens internes -------------------------------------------------------
  let brokenLinks = []
  for (const link of allLinks) {
    const response = await fetch(`${BASE}${link}`)
    if (response.status !== 200) brokenLinks.push(`${link} (${response.status})`)
  }
  if (brokenLinks.length > 0) fail('site', 'Liens internes', brokenLinks.join(', '))
  else pass('site', 'Liens internes', `${allLinks.size} liens, aucun mort`)

  // --- Restitution ----------------------------------------------------------
  const byPage = new Map()
  for (const check of checks) {
    if (!byPage.has(check.page)) byPage.set(check.page, [])
    byPage.get(check.page).push(check)
  }

  for (const [page, entries] of byPage) {
    const failed = entries.filter((entry) => !entry.ok)
    if (failed.length === 0) {
      console.log(`  OK    ${page.padEnd(46)} ${entries.length} controles`)
    } else {
      console.log(`  ECHEC ${page}`)
      for (const entry of failed) console.log(`          - ${entry.label} : ${entry.detail}`)
    }
  }

  const total = checks.length
  const ok = checks.filter((check) => check.ok).length
  const score = total === 0 ? 0 : (ok / total) * 10

  console.log('='.repeat(74))
  console.log(`${ok}/${total} controles reussis — score ${score.toFixed(1)}/10`)
  console.log('')
  process.exit(ok === total ? 0 : 1)
}

run().catch((error) => {
  console.error('Interruption :', error.message)
  process.exit(1)
})
