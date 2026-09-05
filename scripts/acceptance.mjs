#!/usr/bin/env node
/**
 * Suite de tests d'acceptation.
 *
 * Exerce les 21 criteres du cahier des charges contre une instance en cours
 * d'execution, via l'API REST de Payload et le rendu public.
 *
 *   node scripts/acceptance.mjs [url]
 *
 * Les identifiants sont lus dans `.admin-credentials.local` (ignore par git).
 * Chaque scenario restaure l'etat initial, la suite est donc rejouable.
 */
import { readFileSync } from 'node:fs'

const BASE = process.argv[2] ?? 'http://localhost:3000'

/**
 * Identite d'appelant propre a cette execution.
 * La limitation de debit compte par adresse : sans cela, un simple rejeu de la
 * suite serait bloque par ses propres soumissions precedentes.
 */
const RUN_IP = `203.0.113.${Math.floor(Math.random() * 200) + 10}`
const publicHeaders = (extra = {}) => ({
  'Content-Type': 'application/json',
  'X-Forwarded-For': RUN_IP,
  ...extra,
})

// --- Utilitaires --------------------------------------------------------------

const results = []
let token = null

const record = (id, label, passed, detail = '') => {
  results.push({ id, label, passed, detail })
  const mark = passed ? '  OK  ' : '  ECHEC '
  console.log(`${mark} ${String(id).padStart(2)}. ${label}${detail ? ` — ${detail}` : ''}`)
}

const check = async (id, label, fn) => {
  try {
    const detail = await fn()
    record(id, label, true, typeof detail === 'string' ? detail : '')
  } catch (error) {
    record(id, label, false, error.message)
  }
}

const assert = (condition, message) => {
  if (!condition) throw new Error(message)
}

const api = async (path, options = {}) => {
  const headers = { ...(options.headers ?? {}) }
  if (token) headers.Authorization = `JWT ${token}`
  if (options.body && !headers['Content-Type'] && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }
  const response = await fetch(`${BASE}${path}`, { ...options, headers })
  const text = await response.text()
  let json = null
  try {
    json = JSON.parse(text)
  } catch {
    /* reponse non JSON */
  }
  return { status: response.status, json, text }
}

const html = async (path, options = {}) => {
  const response = await fetch(`${BASE}${path}`, { redirect: 'manual', ...options })
  return { status: response.status, body: await response.text() }
}

/** Attend qu'une condition sur le HTML public devienne vraie (revalidation). */
const waitForPage = async (path, predicate, { attempts = 12, delay = 700 } = {}) => {
  let last = ''
  for (let i = 0; i < attempts; i += 1) {
    const page = await html(path)
    last = page.body
    if (predicate(last)) return last
    await new Promise((resolve) => setTimeout(resolve, delay))
  }
  throw new Error(`condition jamais atteinte sur ${path}`)
}

const credentials = () => {
  const file = readFileSync('.admin-credentials.local', 'utf8')
  const line = file.split('\n').find((entry) => entry.startsWith('jdvalcy02@gmail.com'))
  assert(line, 'identifiants super-admin introuvables')
  const [email, ...rest] = line.trim().split(/\s+/)
  return { email, password: rest.join(' ') }
}

// --- Scenarios ----------------------------------------------------------------

const run = async () => {
  console.log(`\nTests d'acceptation — ${BASE}`)
  console.log('='.repeat(72))

  // Authentification prealable
  const { email, password } = credentials()
  const login = await api('/api/users/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  assert(login.status === 200 && login.json?.token, 'connexion super-admin impossible')
  token = login.json.token
  console.log(`Session super-admin ouverte (${email})\n`)

  const pages = await api('/api/pages?where[slug][equals]=home&depth=0&draft=true')
  const home = pages.json.docs[0]
  assert(home, 'page d accueil introuvable')
  const originalLayout = JSON.parse(JSON.stringify(home.layout))

  const restoreHome = async () => {
    await api(`/api/pages/${home.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ layout: originalLayout, _status: 'published' }),
    })
  }

  // 1. Titre du hero
  await check(1, 'Modifier le titre du hero met a jour la page publique', async () => {
    const marker = `Titre verifie ${Date.now()}`
    const layout = JSON.parse(JSON.stringify(originalLayout))
    layout[0].title[0].text = marker
    const patch = await api(`/api/pages/${home.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ layout, _status: 'published' }),
    })
    assert(patch.status === 200, `PATCH a renvoye ${patch.status}`)
    await waitForPage('/', (body) => body.includes(marker))
    await restoreHome()
    await waitForPage('/', (body) => body.includes('Transformer les'))
    return 'titre modifie puis restaure'
  })

  // 2. Image du hero et texte alternatif
  await check(2, 'Remplacer l image du hero et son texte alternatif', async () => {
    const media = await api('/api/media?limit=50&depth=0')
    const other = media.json.docs.find((doc) => doc.filename === 'datakle-hero.webp')
    assert(other, 'media de remplacement introuvable')
    const layout = JSON.parse(JSON.stringify(originalLayout))
    layout[0].image = other.id
    layout[0].imageAlt = 'Texte alternatif de verification'
    await api(`/api/pages/${home.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ layout, _status: 'published' }),
    })
    await waitForPage('/', (body) => body.includes('/api/media/file/datakle-hero'))
    await restoreHome()
    await waitForPage('/', (body) => body.includes('/api/media/file/hero-executive'))
    return 'image remplacee puis restauree'
  })

  // 3. Reordonnancement des sections
  await check(3, 'Reordonner les sections de l accueil', async () => {
    const layout = JSON.parse(JSON.stringify(originalLayout))
    const [statement] = layout.splice(1, 1)
    layout.splice(3, 0, statement)
    await api(`/api/pages/${home.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ layout, _status: 'published' }),
    })
    const body = await waitForPage('/', (page) => {
      const statementPos = page.indexOf('statement-text')
      const servicePos = page.indexOf('services-preview')
      return statementPos > 0 && servicePos > 0 && statementPos > servicePos
    })
    assert(body.includes('statement-text'), 'section deplacee absente')
    await restoreHome()
    await waitForPage('/', (page) => page.indexOf('statement-text') < page.indexOf('services-preview'))
    return 'ordre modifie puis restaure'
  })

  // 4. Masquage d une section
  await check(4, 'Masquer une section de l accueil', async () => {
    const layout = JSON.parse(JSON.stringify(originalLayout))
    layout[1].visible = false
    await api(`/api/pages/${home.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ layout, _status: 'published' }),
    })
    await waitForPage('/', (body) => !body.includes('statement-text'))
    await restoreHome()
    await waitForPage('/', (body) => body.includes('statement-text'))
    return 'section masquee puis retablie'
  })

  // 5 & 6. Creation et publication d un projet
  const projectSlug = `projet-verification-${Date.now()}`
  let projectId = null
  await check(5, 'Creer et publier un nouveau projet', async () => {
    const media = await api('/api/media?limit=1&depth=0')
    const created = await api('/api/projects', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Projet de verification',
        slug: projectSlug,
        number: '99',
        type: 'Verification',
        summary: 'Projet cree par la suite de tests d acceptation.',
        cover: media.json.docs[0].id,
        problem: 'Probleme de verification.',
        method: 'Methode de verification.',
        result: 'Resultat de verification.',
        learning: 'Apprentissage de verification.',
        order: 999,
        _status: 'published',
      }),
    })
    assert(created.status === 201, `creation a renvoye ${created.status}`)
    projectId = created.json.doc.id
    return `slug ${projectSlug}`
  })

  await check(6, 'Le projet apparait dans l index et sa fiche repond', async () => {
    await waitForPage('/projects', (body) => body.includes(projectSlug))
    const detail = await html(`/projects/${projectSlug}`)
    assert(detail.status === 200, `fiche projet a renvoye ${detail.status}`)
    assert(detail.body.includes('Projet de verification'), 'titre absent de la fiche')
    return 'index et fiche detail operationnels'
  })

  // 7, 8, 9. Brouillon d article, previsualisation, publication
  const articleSlug = `article-verification-${Date.now()}`
  let articleId = null
  await check(7, 'Creer un article en brouillon', async () => {
    const media = await api('/api/media?limit=1&depth=0')
    const created = await api('/api/articles?draft=true', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Article de verification',
        slug: articleSlug,
        category: 'Verification',
        excerpt: 'Brouillon cree par la suite de tests.',
        hero: media.json.docs[0].id,
        order: 999,
        _status: 'draft',
      }),
    })
    assert(created.status === 201, `creation a renvoye ${created.status}`)
    articleId = created.json.doc.id
    assert(created.json.doc._status === 'draft', 'le document n est pas en brouillon')
    return 'brouillon cree'
  })

  await check(8, 'Le brouillon est invisible au public mais visible en previsualisation', async () => {
    const anonymous = await html(`/blog/${articleSlug}`)
    assert(anonymous.status === 404, `visiteur anonyme a recu ${anonymous.status} au lieu de 404`)

    const anonymousApi = await fetch(`${BASE}/api/articles?where[slug][equals]=${articleSlug}`)
    const anonymousJson = await anonymousApi.json()
    assert(anonymousJson.totalDocs === 0, 'le brouillon fuit via l API REST anonyme')

    const previewSecret = readFileSync('.env', 'utf8')
      .split('\n')
      .find((line) => line.startsWith('PREVIEW_SECRET='))
      .split('=')[1]
      .replace(/"/g, '')
      .trim()

    const preview = await fetch(
      `${BASE}/api/preview?secret=${previewSecret}&collection=articles&slug=${articleSlug}`,
      { headers: { Authorization: `JWT ${token}` }, redirect: 'manual' },
    )
    assert(
      preview.status === 307 || preview.status === 302,
      `previsualisation a renvoye ${preview.status}`,
    )

    const noSecret = await fetch(
      `${BASE}/api/preview?secret=mauvais&collection=articles&slug=${articleSlug}`,
      { headers: { Authorization: `JWT ${token}` }, redirect: 'manual' },
    )
    assert(noSecret.status === 401, 'un secret invalide a ete accepte')

    const noAuth = await fetch(
      `${BASE}/api/preview?secret=${previewSecret}&collection=articles&slug=${articleSlug}`,
      { redirect: 'manual' },
    )
    assert(noAuth.status === 403, 'previsualisation accessible sans session')

    return '404 public, redirection en preview, secret et session exiges'
  })

  await check(9, 'Publier l article le rend public', async () => {
    const published = await api(`/api/articles/${articleId}`, {
      method: 'PATCH',
      body: JSON.stringify({ _status: 'published' }),
    })
    assert(published.status === 200, `publication a renvoye ${published.status}`)
    await waitForPage(`/blog/${articleSlug}`, (body) => body.includes('Article de verification'))
    return 'article accessible publiquement'
  })

  // 10 & 11. En-tete et pied de page
  await check(10, 'Modifier l en-tete change la navigation partout', async () => {
    const header = await api('/api/globals/header?depth=1')
    const original = header.json.navigation
    const marker = `Nav ${Date.now()}`
    const navigation = JSON.parse(JSON.stringify(original))
    navigation[1].link.label = marker
    navigation[1].link.page = navigation[1].link.page?.id ?? navigation[1].link.page

    await api('/api/globals/header', {
      method: 'POST',
      body: JSON.stringify({ navigation }),
    })
    await waitForPage('/', (body) => body.includes(marker))
    const other = await html('/contact')
    assert(other.body.includes(marker), 'la modification n apparait pas sur /contact')

    const restored = JSON.parse(JSON.stringify(original)).map((item) => ({
      ...item,
      link: { ...item.link, page: item.link.page?.id ?? item.link.page },
    }))
    await api('/api/globals/header', {
      method: 'POST',
      body: JSON.stringify({ navigation: restored }),
    })
    await waitForPage('/', (body) => !body.includes(marker))
    return 'propagation verifiee sur 2 pages'
  })

  await check(11, 'Modifier le pied de page change toutes les pages', async () => {
    const footer = await api('/api/globals/footer?depth=0')
    const original = footer.json.copyright
    const marker = `Copyright ${Date.now()}`
    await api('/api/globals/footer', {
      method: 'POST',
      body: JSON.stringify({ copyright: marker }),
    })
    await waitForPage('/', (body) => body.includes(marker))
    const other = await html('/legal')
    assert(other.body.includes(marker), 'la modification n apparait pas sur /legal')
    await api('/api/globals/footer', {
      method: 'POST',
      body: JSON.stringify({ copyright: original }),
    })
    await waitForPage('/', (body) => body.includes(original))
    return 'propagation verifiee sur 2 pages'
  })

  // 12. Televersement depuis l admin
  let uploadedId = null
  await check(12, 'Televerser une image depuis l admin', async () => {
    const { execSync } = await import('node:child_process')
    execSync(
      `node -e "const s=require('sharp');s({create:{width:600,height:400,channels:3,background:'#173f35'}}).webp().toFile('/tmp/verification-upload.webp')"`,
    )
    const file = readFileSync('/tmp/verification-upload.webp')
    const form = new FormData()
    form.append('file', new Blob([file], { type: 'image/webp' }), 'verification-upload.webp')
    form.append(
      '_payload',
      JSON.stringify({
        title: 'Image de verification',
        alt: 'Aplat vert uni cree par la suite de tests.',
        category: 'autre',
      }),
    )
    const upload = await api('/api/media', { method: 'POST', body: form })
    assert(upload.status === 201, `televersement a renvoye ${upload.status}`)
    uploadedId = upload.json.doc.id
    const sizes = Object.values(upload.json.doc.sizes ?? {}).filter((size) => size?.filename)
    assert(sizes.length >= 3, `seulement ${sizes.length} declinaisons generees`)
    const served = await fetch(`${BASE}/api/media/file/${upload.json.doc.filename}`)
    assert(served.status === 200, `fichier servi avec ${served.status}`)
    return `${sizes.length} declinaisons, servi depuis GridFS`
  })

  // 13. Les medias migres sont servis
  await check(13, 'Les 25 medias migres se chargent depuis le stockage configure', async () => {
    const media = await api('/api/media?limit=100&depth=0')
    const migrated = media.json.docs.filter((doc) => doc.filename !== 'verification-upload.webp')
    assert(migrated.length >= 25, `seulement ${migrated.length} medias en base`)
    // GET : la methode qu'emploient reellement les navigateurs et `next/image`.
    let served = 0
    let bytes = 0
    for (const doc of migrated) {
      const response = await fetch(`${BASE}/api/media/file/${doc.filename}`)
      if (response.status === 200) {
        served += 1
        bytes += (await response.arrayBuffer()).byteLength
      }
    }
    assert(served === migrated.length, `${served}/${migrated.length} fichiers servis`)

    // Les declinaisons generees doivent l'etre aussi.
    const variants = migrated.flatMap((doc) =>
      Object.values(doc.sizes ?? {})
        .filter((size) => size?.filename)
        .map((size) => size.filename),
    )
    const uniqueVariants = [...new Set(variants)]
    let variantsServed = 0
    for (const filename of uniqueVariants) {
      const response = await fetch(`${BASE}/api/media/file/${filename}`)
      if (response.status === 200) variantsServed += 1
    }
    assert(
      variantsServed === uniqueVariants.length,
      `${variantsServed}/${uniqueVariants.length} declinaisons servies`,
    )

    const withoutAlt = migrated.filter((doc) => !doc.alt?.trim())
    assert(withoutAlt.length === 0, `${withoutAlt.length} medias sans texte alternatif`)
    return `${served} originaux + ${variantsServed} declinaisons, ${(bytes / 1048576).toFixed(1)} Mio, tous avec texte alternatif`
  })

  // 15 & 16. Formulaires prives
  await check(15, 'Les demandes de contact arrivent en prive dans Payload', async () => {
    const marker = `Verification ${Date.now()}`
    const sent = await fetch(`${BASE}/api/contact`, {
      method: 'POST',
      headers: publicHeaders(),
      body: JSON.stringify({
        name: marker,
        email: 'acceptance@example.com',
        message: 'Message de la suite de tests.',
        consent: true,
        elapsed: 5000,
      }),
    })
    assert(sent.status === 200, `envoi a renvoye ${sent.status}`)

    const anonymous = await fetch(`${BASE}/api/contactSubmissions`)
    assert(anonymous.status === 403, `lecture anonyme autorisee (${anonymous.status})`)

    const authenticated = await api('/api/contactSubmissions?limit=100')
    assert(authenticated.status === 200, 'lecture authentifiee refusee')
    assert(
      authenticated.json.docs.some((doc) => doc.name === marker),
      'la demande n apparait pas dans le CMS',
    )
    return 'visible pour le CMS, refusee au public'
  })

  await check(16, 'Les inscriptions a l infolettre arrivent en prive', async () => {
    const address = `acceptance-${Date.now()}@example.com`
    const sent = await fetch(`${BASE}/api/newsletter`, {
      method: 'POST',
      headers: publicHeaders(),
      body: JSON.stringify({ email: address, source: 'tests', elapsed: 5000 }),
    })
    assert(sent.status === 200, `envoi a renvoye ${sent.status}`)

    const duplicate = await fetch(`${BASE}/api/newsletter`, {
      method: 'POST',
      headers: publicHeaders(),
      body: JSON.stringify({ email: address, source: 'tests', elapsed: 5000 }),
    })
    const duplicateJson = await duplicate.json()
    assert(
      duplicateJson.status === 'already-subscribed',
      'un doublon actif a ete accepte',
    )

    const anonymous = await fetch(`${BASE}/api/newsletterSubscribers`)
    assert(anonymous.status === 403, `lecture anonyme autorisee (${anonymous.status})`)

    const authenticated = await api('/api/newsletterSubscribers?limit=100')
    assert(
      authenticated.json.docs.some((doc) => doc.email === address),
      'l inscription n apparait pas dans le CMS',
    )
    return 'doublon refuse, lecture reservee au CMS'
  })

  // 17. Cloisonnement des roles
  let editorId = null
  await check(17, 'Un editeur ne peut pas gerer les super-administrateurs', async () => {
    const editorPassword = `Ed${Math.random().toString(36).slice(2)}A9zzz`
    const created = await api('/api/users', {
      method: 'POST',
      body: JSON.stringify({
        email: `editeur-test-${Date.now()}@example.com`,
        name: 'Editeur de verification',
        role: 'editor',
        active: true,
        password: editorPassword,
      }),
    })
    assert(created.status === 201, `creation editeur a renvoye ${created.status}`)
    editorId = created.json.doc.id

    const editorLogin = await fetch(`${BASE}/api/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: created.json.doc.email, password: editorPassword }),
    })
    const editorJson = await editorLogin.json()
    assert(editorJson.token, 'connexion editeur impossible')
    const editorToken = editorJson.token
    const asEditor = (path, options = {}) =>
      fetch(`${BASE}${path}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `JWT ${editorToken}`,
          ...(options.headers ?? {}),
        },
      })

    // Ne voit que son propre compte.
    const list = await (await asEditor('/api/users?limit=100')).json()
    assert(list.totalDocs === 1, `l editeur voit ${list.totalDocs} comptes au lieu de 1`)
    assert(list.docs[0].id === editorId, 'l editeur voit un compte qui n est pas le sien')

    // Ne peut pas creer de compte.
    const createAttempt = await asEditor('/api/users', {
      method: 'POST',
      body: JSON.stringify({
        email: `intrus-${Date.now()}@example.com`,
        name: 'Intrus',
        role: 'super-admin',
        password: 'IntrusMotDePasse9',
      }),
    })
    assert(createAttempt.status === 403, `creation autorisee (${createAttempt.status})`)

    // Ne peut pas s auto-promouvoir.
    await asEditor(`/api/users/${editorId}`, {
      method: 'PATCH',
      body: JSON.stringify({ role: 'super-admin' }),
    })
    const after = await api(`/api/users/${editorId}?depth=0`)
    assert(after.json.role === 'editor', 'l editeur a reussi a changer son role')

    // Peut en revanche editer le contenu.
    const contentEdit = await asEditor(`/api/pages/${home.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ name: 'Accueil' }),
    })
    assert(contentEdit.status === 200, `edition de contenu refusee (${contentEdit.status})`)

    return 'liste cloisonnee, creation refusee, elevation de role bloquee'
  })

  // 18. Contenu non publie inaccessible
  await check(18, 'Un visiteur anonyme n atteint aucun contenu non publie', async () => {
    const draftPage = await api('/api/pages', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Page brouillon de verification',
        title: 'Page brouillon',
        slug: `brouillon-verification-${Date.now()}`,
        template: 'standard',
        layout: [],
        _status: 'draft',
      }),
    })
    const slug = draftPage.json.doc.slug
    const publicPage = await html(`/${slug}`)
    assert(publicPage.status === 404, `page brouillon servie avec ${publicPage.status}`)

    const restApi = await (await fetch(`${BASE}/api/pages?where[slug][equals]=${slug}`)).json()
    assert(restApi.totalDocs === 0, 'le brouillon fuit via l API REST anonyme')

    await api(`/api/pages/${draftPage.json.doc.id}`, { method: 'DELETE' })
    return '404 public et API REST vide'
  })

  // 19. URLs historiques
  await check(19, 'Les routes et slugs existants fonctionnent toujours', async () => {
    const routes = [
      '/',
      '/about',
      '/projects',
      '/services',
      '/blog',
      '/contact',
      '/engagement',
      '/legal',
      '/space',
      '/projects/tableaux-de-bord-power-bi',
      '/projects/automatisation-access-excel',
      '/projects/donnees-et-impact-haiti',
      '/projects/analyse-marketing-numerique',
      '/projects/systeme-aide-decision',
      '/blog/comment-la-data-peut-aider-haiti',
      '/blog/mon-parcours-mba',
      '/blog/fonder-datakle',
      '/blog/visualisation-outil-decision',
      '/blog/projets-vba-simplement',
    ]
    const failures = []
    for (const route of routes) {
      const page = await html(route)
      if (page.status !== 200) failures.push(`${route} (${page.status})`)
    }
    assert(failures.length === 0, `routes en echec : ${failures.join(', ')}`)
    return `${routes.length} routes en 200`
  })

  // 20. Metadonnees SEO
  await check(20, 'Les pages exposent titre, description, canonique et Open Graph', async () => {
    const page = await html('/about')
    const missing = []
    if (!/<title>[^<]+<\/title>/.test(page.body)) missing.push('title')
    if (!/name="description"/.test(page.body)) missing.push('description')
    if (!/rel="canonical"/.test(page.body)) missing.push('canonical')
    if (!/property="og:title"/.test(page.body)) missing.push('og:title')
    if (!/property="og:image"/.test(page.body)) missing.push('og:image')
    assert(missing.length === 0, `metadonnees manquantes : ${missing.join(', ')}`)
    return 'title, description, canonical, og:title, og:image'
  })

  // 14. Aucune dependance au contenu code en dur
  await check(14, 'Aucune page publique ne depend de src/data/site.js', async () => {
    const { readdirSync, statSync } = await import('node:fs')
    const { join } = await import('node:path')

    const walk = (dir) =>
      readdirSync(dir).flatMap((entry) => {
        const full = join(dir, entry)
        return statSync(full).isDirectory() ? walk(full) : [full]
      })

    const sources = ['src/app', 'src/components', 'src/lib'].flatMap(walk)
    const offenders = sources.filter((file) => {
      if (!/\.(ts|tsx|js|jsx)$/.test(file)) return false
      const content = readFileSync(file, 'utf8')
      return content.includes('data/site') || content.includes('images/daguerre')
    })
    assert(
      offenders.length === 0,
      `fichiers dependant encore du contenu code en dur : ${offenders.join(', ')}`,
    )

    // Le rendu public ne doit referencer que des medias servis par le CMS.
    const page = await html('/')
    assert(
      !page.body.includes('/images/daguerre/'),
      'la page d accueil reference encore les images locales',
    )
    return `${sources.length} fichiers verifies, aucune reference`
  })

  // 21. Protections des points d entree publics
  await check(21, 'Les soumissions publiques sont limitees en debit', async () => {
    const burstIp = `198.51.100.${Math.floor(Math.random() * 200) + 10}`
    const send = () =>
      fetch(`${BASE}/api/newsletter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': burstIp },
        body: JSON.stringify({
          email: `rafale-${Math.random().toString(36).slice(2)}@example.com`,
          elapsed: 5000,
        }),
      })

    const statuses = []
    for (let i = 0; i < 8; i += 1) statuses.push((await send()).status)
    const blocked = statuses.filter((status) => status === 429).length
    assert(blocked > 0, `aucune requete bloquee sur 8 (statuts : ${statuses.join(', ')})`)
    assert(statuses[0] === 200, 'la premiere requete legitime a ete bloquee')
    return `${8 - blocked} acceptees puis ${blocked} bloquees (429)`
  })

  // Nettoyage des artefacts de test
  console.log('\nNettoyage des artefacts de test...')
  if (projectId) await api(`/api/projects/${projectId}`, { method: 'DELETE' })
  if (articleId) await api(`/api/articles/${articleId}`, { method: 'DELETE' })
  if (editorId) await api(`/api/users/${editorId}`, { method: 'DELETE' })
  if (uploadedId) await api(`/api/media/${uploadedId}`, { method: 'DELETE' })
  await restoreHome()

  // --- Synthese ---------------------------------------------------------------
  const passed = results.filter((entry) => entry.passed).length
  console.log('\n' + '='.repeat(72))
  console.log(`${passed}/${results.length} scenarios reussis`)
  const failures = results.filter((entry) => !entry.passed)
  if (failures.length > 0) {
    console.log('\nEchecs :')
    for (const failure of failures) console.log(`  ${failure.id}. ${failure.label} — ${failure.detail}`)
  }
  console.log('')
  process.exit(failures.length === 0 ? 0 : 1)
}

run().catch((error) => {
  console.error('\nInterruption :', error.message)
  process.exit(1)
})
