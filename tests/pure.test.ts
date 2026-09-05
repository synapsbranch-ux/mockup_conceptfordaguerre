import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { pagePath, resolveHref } from '@/lib/links'
import { validateHref } from '@/payload/fields/link'
import { cleanEmail, cleanLine, cleanText, looksAutomated } from '@/lib/sanitize'
import { formatSlug } from '@/payload/fields/slug'
import { publicPathFor } from '@/payload/utils/preview'

describe('formatSlug', () => {
  it('retire les accents et la ponctuation', () => {
    assert.equal(formatSlug('Donnees et impact pour Haiti'), 'donnees-et-impact-pour-haiti')
    assert.equal(formatSlug('Données et impact pour Haïti'), 'donnees-et-impact-pour-haiti')
    assert.equal(formatSlug('Système d’aide à la décision'), 'systeme-d-aide-a-la-decision')
  })

  it('normalise les separateurs multiples et les bords', () => {
    assert.equal(formatSlug('  --Power BI &  Excel--  '), 'power-bi-excel')
    assert.equal(formatSlug('A///B'), 'a-b')
  })

  it('est idempotent', () => {
    const once = formatSlug('Analyse marketing & communication numérique')
    assert.equal(formatSlug(once), once)
  })
})

describe('validateHref', () => {
  it('accepte les destinations legitimes', () => {
    const valid = [
      '/contact',
      '#approche',
      'https://example.com',
      'mailto:a@b.co',
      'tel:+15145551234',
    ]
    for (const value of valid) {
      assert.equal(validateHref(value), true, `${value} devrait etre accepte`)
    }
  })

  it('refuse les schemas executables', () => {
    for (const value of ['javascript:alert(1)', 'data:text/html,<script>', 'vbscript:x']) {
      assert.notEqual(validateHref(value), true, `${value} devrait etre refuse`)
    }
  })

  it('refuse une destination vide', () => {
    assert.notEqual(validateHref(''), true)
    assert.notEqual(validateHref(null), true)
  })
})

describe('pagePath et resolveHref', () => {
  it('sert la page d accueil a la racine', () => {
    assert.equal(pagePath('home'), '/')
    assert.equal(pagePath('about'), '/about')
  })

  it('resout un lien vers une page peuplee', () => {
    const link = { type: 'page' as const, page: { id: '1', slug: 'contact' } }
    assert.equal(resolveHref(link as never), '/contact')
  })

  it('renvoie null quand la relation n est pas peuplee', () => {
    assert.equal(resolveHref({ type: 'page', page: '507f1f77bcf86cd799439011' }), null)
  })

  it('resout une destination personnalisee', () => {
    assert.equal(resolveHref({ type: 'custom', url: '/legal' }), '/legal')
    assert.equal(resolveHref({ type: 'custom', url: '  ' }), null)
  })
})

describe('publicPathFor', () => {
  it('preserve les URLs historiques', () => {
    assert.equal(publicPathFor('pages', 'home'), '/')
    assert.equal(publicPathFor('pages', 'engagement'), '/engagement')
    assert.equal(
      publicPathFor('projects', 'tableaux-de-bord-power-bi'),
      '/projects/tableaux-de-bord-power-bi',
    )
    assert.equal(publicPathFor('articles', 'fonder-datakle'), '/blog/fonder-datakle')
  })
})

describe('assainissement des saisies', () => {
  it('retire les caracteres de controle sans toucher aux sauts de ligne', () => {
    const nul = String.fromCharCode(0)
    const bell = String.fromCharCode(7)
    const del = String.fromCharCode(127)
    const input = `Bonjour${nul} ${bell}monde${del}\nligne`
    const output = cleanText(input, 100)

    assert.equal(output.includes(nul), false, 'le caractere NUL doit disparaitre')
    assert.equal(output.includes(bell), false, 'le caractere BEL doit disparaitre')
    assert.equal(output.includes(del), false, 'le caractere DEL doit disparaitre')
    assert.equal(output.includes('\n'), true, 'le saut de ligne doit etre preserve')
    assert.equal(output, 'Bonjour monde\nligne')
  })

  it('borne la longueur', () => {
    assert.equal(cleanText('a'.repeat(500), 10).length, 10)
  })

  it('aplatit les espaces sur une ligne', () => {
    assert.equal(cleanLine('  Trop   d   espaces \n ici ', 100), 'Trop d espaces ici')
  })

  it('valide et normalise les adresses courriel', () => {
    assert.equal(cleanEmail('  JDValcy02@Gmail.COM '), 'jdvalcy02@gmail.com')
    assert.equal(cleanEmail('pas-une-adresse'), null)
    assert.equal(cleanEmail('a@b'), null)
    assert.equal(cleanEmail(42), null)
  })
})

describe('detection de soumission automatisee', () => {
  it('detecte le pot de miel rempli', () => {
    assert.equal(looksAutomated({ honeypot: 'spam', elapsed: 9000 }), true)
  })

  it('detecte une soumission trop rapide', () => {
    assert.equal(looksAutomated({ honeypot: '', elapsed: 100 }), true)
  })

  it('laisse passer une soumission humaine', () => {
    assert.equal(looksAutomated({ honeypot: '', elapsed: 9000 }), false)
    assert.equal(looksAutomated({ honeypot: undefined, elapsed: undefined }), false)
  })
})
