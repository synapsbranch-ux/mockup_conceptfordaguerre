#!/usr/bin/env node
/**
 * Verification structurelle du rendu public.
 *
 * Pour chaque route, controle le statut HTTP puis la presence de toutes les
 * classes CSS que le prototype d'origine utilisait sur cette page. Une classe
 * manquante signale une regression visuelle, meme si la page repond 200.
 *
 *   node scripts/verify-routes.mjs [url]
 */
const BASE = process.argv[2] ?? 'http://localhost:3000'

/**
 * Classes attendues par route, relevees sur le prototype Pages Router.
 * `globals.css` etant inchange, la presence de ces classes garantit que le
 * meme traitement visuel est applique.
 */
const EXPECTED = {
  '/': [
    'hero',
    'hero-overlay',
    'hero-content',
    'hero-kicker',
    'hero-copy',
    'hero-actions',
    'button-accent',
    'button-ghost',
    'hero-metric',
    'metric-top',
    'chart-fill',
    'chart-line',
    'metric-bottom',
    'scroll-cue',
    'statement',
    'statement-text',
    'statement-signature',
    'featured',
    'section-heading',
    'project-feature-grid',
    'project-card',
    'project-card-large',
    'media-frame',
    'project-card-meta',
    'services-preview',
    'service-list',
    'service-row',
    'service-number',
    'origin-split',
    'origin-image',
    'origin-copy',
    'button-light',
    'home-gallery',
    'home-gallery-grid',
    'gallery-tall',
    'gallery-wide',
    'article-preview',
    'article-grid',
    'article-card',
    'article-image',
    'article-category',
    'article-meta',
    'cta-band',
    'round-link',
  ],
  '/about': [
    'page-intro',
    'page-intro-copy',
    'page-number',
    'about-lead',
    'about-portrait',
    'about-biography',
    'lead-copy',
    'about-note',
    'journey-section',
    'display-light',
    'journey-list',
    'journey-row',
    'about-grid',
    'about-story',
    'value-stack',
    'about-milestones',
  ],
  '/projects': ['page-intro', 'projects-index', 'project-index-card', 'project-index-number', 'project-index-image', 'project-index-copy', 'text-link'],
  '/services': [
    'page-intro',
    'services-hero',
    'service-detail-list',
    'service-detail',
    'vision-panel',
    'vision-copy',
    'vision-image',
    'collab',
    'button-dark',
    'prototype-note',
  ],
  '/blog': ['page-intro', 'blog-feature', 'blog-feature-image', 'blog-feature-copy', 'blog-list', 'blog-list-heading', 'blog-row', 'blog-row-number', 'blog-row-meta'],
  '/contact': ['page-intro', 'contact-layout', 'contact-aside', 'availability', 'contact-form', 'field-pair', 'checkbox', 'button-dark'],
  '/engagement': ['page-intro', 'engagement-visual', 'engagement-quote', 'commitments', 'education-panel', 'values-marquee'],
  '/legal': ['page-intro', 'legal-layout', 'legal-content', 'legal-warning'],
  // `checkbox` n'apparait qu'en mode inscription, apres interaction : comme dans
  // le prototype, il est absent du rendu serveur initial.
  '/space': ['auth-page', 'auth-intro', 'auth-benefits', 'auth-card', 'auth-tabs', 'prototype-caption'],
  '/projects/tableaux-de-bord-power-bi': ['case-study', 'case-header', 'back-link', 'case-hero', 'case-content', 'case-sections', 'next-case'],
  '/blog/comment-la-data-peut-aider-haiti': ['article-page', 'article-header', 'back-link', 'article-hero', 'article-body', 'article-lead', 'article-draft-note'],
}

/** Presentes sur toutes les pages : en-tete, pied de page, accessibilite. */
const GLOBAL_CLASSES = [
  'skip-link',
  'site-header',
  'brand',
  'brand-mark',
  'brand-name',
  'main-nav',
  'menu-toggle',
  'header-cta',
  'site-footer',
  'footer-visuals',
  'footer-visual-message',
  'footer-lead',
  'newsletter',
  'consent',
  'footer-links',
  'footer-label',
  'pending-link',
  'footer-bottom',
]

const NOT_FOUND = ['/page-inexistante', '/projects/inexistant', '/blog/inexistant']

const hasClass = (html, className) =>
  new RegExp(`class="[^"]*\\b${className.replace(/-/g, '\\-')}\\b[^"]*"`).test(html)

const run = async () => {
  console.log(`\nVerification structurelle — ${BASE}`)
  console.log('='.repeat(72))

  let failures = 0
  let totalClasses = 0

  for (const [route, classes] of Object.entries(EXPECTED)) {
    const response = await fetch(`${BASE}${route}`)
    const html = await response.text()

    if (response.status !== 200) {
      console.log(`  ECHEC ${route} — HTTP ${response.status}`)
      failures += 1
      continue
    }

    const expected = [...classes, ...GLOBAL_CLASSES]
    const missing = expected.filter((className) => !hasClass(html, className))
    totalClasses += expected.length

    if (missing.length > 0) {
      console.log(`  ECHEC ${route} — classes absentes : ${missing.join(', ')}`)
      failures += 1
    } else {
      console.log(`  OK    ${route.padEnd(42)} ${expected.length} classes, ${html.length} octets`)
    }
  }

  for (const route of NOT_FOUND) {
    const response = await fetch(`${BASE}${route}`)
    if (response.status === 404) {
      console.log(`  OK    ${route.padEnd(42)} 404 attendu`)
    } else {
      console.log(`  ECHEC ${route} — HTTP ${response.status} au lieu de 404`)
      failures += 1
    }
  }

  console.log('='.repeat(72))
  console.log(
    failures === 0
      ? `Toutes les routes conformes (${totalClasses} verifications de classe).`
      : `${failures} route(s) en echec.`,
  )
  process.exit(failures === 0 ? 0 : 1)
}

run().catch((error) => {
  console.error('Interruption :', error.message)
  process.exit(1)
})
