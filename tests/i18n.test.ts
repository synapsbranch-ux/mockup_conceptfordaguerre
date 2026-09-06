import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  DEFAULT_LOCALE,
  LOCALES,
  alternatesFor,
  dictionary,
  htmlLang,
  localeFromPath,
  localePrefix,
  localizedPath,
  normalizeLocale,
  stripLocale,
} from '@/lib/i18n'

/**
 * Bilinguisme : le francais reste SANS prefixe, l'anglais vit sous `/en`.
 *
 * L'enjeu est qu'aucune URL publique existante ne change : `/blog/mon-article`
 * doit rester `/blog/mon-article`, jamais devenir `/fr/blog/mon-article`.
 */

describe('locales', () => {
  it('declare le francais par defaut', () => {
    assert.equal(DEFAULT_LOCALE, 'fr')
    assert.deepEqual([...LOCALES], ['fr', 'en'])
  })

  it('ne prefixe jamais le francais', () => {
    assert.equal(localePrefix('fr'), '')
    assert.equal(localePrefix('en'), '/en')
  })

  it('retombe sur le francais pour toute valeur inconnue', () => {
    for (const value of [undefined, null, '', 'de', 'EN-GB', 42, {}, 'fr-CA']) {
      assert.equal(normalizeLocale(value), 'fr')
    }
    // La casse et les espaces sont tolerees.
    assert.equal(normalizeLocale(' EN '), 'en')
    assert.equal(normalizeLocale('en'), 'en')
  })
})

describe('deduction depuis le chemin', () => {
  it('reconnait un chemin anglais', () => {
    assert.equal(localeFromPath('/en'), 'en')
    assert.equal(localeFromPath('/en/blog'), 'en')
    assert.equal(localeFromPath('/en/forum/ma-discussion'), 'en')
  })

  it('traite tout le reste comme francais', () => {
    assert.equal(localeFromPath('/'), 'fr')
    assert.equal(localeFromPath('/blog'), 'fr')
    // Piege : un slug commencant par « en » n'est pas la locale anglaise.
    assert.equal(localeFromPath('/energie'), 'fr')
    assert.equal(localeFromPath('/blog/energie'), 'fr')
  })
})

describe('retrait du prefixe', () => {
  it('retire /en', () => {
    assert.equal(stripLocale('/en'), '/')
    assert.equal(stripLocale('/en/blog'), '/blog')
    assert.equal(stripLocale('/en/forum/sujet'), '/forum/sujet')
  })

  it('laisse un chemin francais intact', () => {
    assert.equal(stripLocale('/'), '/')
    assert.equal(stripLocale('/blog'), '/blog')
    // Ne doit pas amputer un slug qui commence par « en ».
    assert.equal(stripLocale('/energie'), '/energie')
    assert.equal(stripLocale('/engagement'), '/engagement')
  })
})

describe('construction de chemin', () => {
  it('produit le chemin francais sans prefixe', () => {
    assert.equal(localizedPath('/blog', 'fr'), '/blog')
    assert.equal(localizedPath('/', 'fr'), '/')
    assert.equal(localizedPath('/en/blog', 'fr'), '/blog', 'bascule EN vers FR')
  })

  it('produit le chemin anglais prefixe', () => {
    assert.equal(localizedPath('/blog', 'en'), '/en/blog')
    assert.equal(localizedPath('/', 'en'), '/en')
    assert.equal(localizedPath('/en/blog', 'en'), '/en/blog', 'idempotent')
  })

  it('tolere un chemin sans slash initial', () => {
    assert.equal(localizedPath('blog', 'en'), '/en/blog')
    assert.equal(localizedPath('blog', 'fr'), '/blog')
  })

  it('preserve les URLs historiques', () => {
    // Non negociable : ces chemins existent deja et sont indexes.
    for (const path of ['/', '/blog/mon-article', '/projects/mon-projet', '/about']) {
      assert.equal(localizedPath(path, 'fr'), path)
    }
  })
})

describe('alternates hreflang', () => {
  const site = 'https://exemple.test'

  it('donne les deux langues et un x-default francais', () => {
    const result = alternatesFor('/blog', site)
    assert.equal(result.canonical, 'https://exemple.test/blog')
    assert.equal(result.languages.fr, 'https://exemple.test/blog')
    assert.equal(result.languages.en, 'https://exemple.test/en/blog')
    assert.equal(result.languages['x-default'], result.languages.fr)
  })

  it('traite correctement la racine', () => {
    const result = alternatesFor('/', site)
    assert.equal(result.canonical, 'https://exemple.test')
    assert.equal(result.languages.en, 'https://exemple.test/en')
  })

  it('rend chaque version canonique d elle-meme', () => {
    // Point de SEO decisif : pointer la canonique anglaise vers le francais
    // reviendrait a demander aux moteurs de ne pas indexer l anglais.
    const fr = alternatesFor('/forum', site, 'fr')
    const en = alternatesFor('/forum', site, 'en')

    assert.equal(fr.canonical, 'https://exemple.test/forum')
    assert.equal(en.canonical, 'https://exemple.test/en/forum')

    // Les deux se declarent mutuellement.
    assert.deepEqual(fr.languages, en.languages)
    assert.equal(fr.languages['x-default'], 'https://exemple.test/forum')
  })

  it('accepte indifferemment un chemin deja prefixe', () => {
    const result = alternatesFor('/en/forum', site, 'en')
    assert.equal(result.canonical, 'https://exemple.test/en/forum')
    assert.equal(result.languages.fr, 'https://exemple.test/forum')
  })
})

describe('libelles', () => {
  it('fournit un dictionnaire par locale', () => {
    assert.equal(dictionary('fr').signIn, 'Se connecter')
    assert.equal(dictionary('en').signIn, 'Sign in')
  })

  it('retombe sur le francais pour une locale inconnue', () => {
    assert.equal(dictionary('de' as never).signIn, 'Se connecter')
  })

  it('signale un contenu non traduit uniquement en anglais', () => {
    // Cote francais, la mention n'a pas lieu d'etre.
    assert.equal(dictionary('fr').translationNotice, '')
    assert.ok(dictionary('en').translationNotice.length > 0)
  })

  it('donne l attribut lang du document', () => {
    assert.equal(htmlLang('fr'), 'fr')
    assert.equal(htmlLang('en'), 'en')
  })

  it('couvre les memes cles dans les deux langues', () => {
    const frKeys = Object.keys(dictionary('fr')).sort()
    const enKeys = Object.keys(dictionary('en')).sort()
    assert.deepEqual(frKeys, enKeys, 'aucune cle ne doit manquer d un cote')
  })
})
