import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { isValidElement } from 'react'
import type { ReactElement, ReactNode } from 'react'

import { UserText, excerptOf } from '@/lib/content/userText'

/**
 * Rendu du contenu soumis par les utilisateurs.
 *
 * La suite s'execute sous `--conditions=react-server` (exige par Payload), ou
 * `react-dom/server` n'expose pas `renderToStaticMarkup`. On verifie donc la
 * propriete structurelle, qui est de toute facon la garantie reelle :
 *
 *  1. aucun noeud produit ne porte `dangerouslySetInnerHTML` — c'est la seule
 *     porte par laquelle du balisage pourrait etre injecte ;
 *  2. le texte brut ressort en **chaine de caracteres**, transmise comme
 *     enfant. React echappe systematiquement les chaines au rendu, donc un
 *     contenu piege s'affiche au lieu de s'executer ;
 *  3. aucun lien n'est fabrique pour un schema executable.
 *
 * Cette approche vaut mieux qu'une inspection du HTML : elle verifie l'absence
 * du mecanisme dangereux, et pas seulement l'absence d'une charge connue.
 */

type Node = ReactNode

/** Parcourt l'arbre d'elements et collecte chaque noeud. */
const walk = (node: Node, visit: (node: Node) => void): void => {
  visit(node)
  if (Array.isArray(node)) {
    for (const child of node) walk(child, visit)
    return
  }
  if (isValidElement(node)) {
    const props = (node as ReactElement<Record<string, unknown>>).props
    const children = props?.children as Node
    if (children !== undefined) walk(children, visit)
  }
}

const treeOf = (text: string): Node => UserText({ text }) as Node

const collectStrings = (text: string): string[] => {
  const found: string[] = []
  walk(treeOf(text), (node) => {
    if (typeof node === 'string') found.push(node)
  })
  return found
}

const collectElements = (text: string): ReactElement<Record<string, unknown>>[] => {
  const found: ReactElement<Record<string, unknown>>[] = []
  walk(treeOf(text), (node) => {
    if (isValidElement(node)) found.push(node as ReactElement<Record<string, unknown>>)
  })
  return found
}

describe('rendu du texte utilisateur', () => {
  it('n emploie jamais dangerouslySetInnerHTML', () => {
    const hostile = [
      '<script>alert(1)</script>',
      '<img src=x onerror=alert(1)>',
      '<iframe src="https://evil.test"></iframe>',
      '<svg/onload=alert(1)>',
      '- <b>gras</b>\n> <i>cite</i>',
    ]

    for (const text of hostile) {
      for (const element of collectElements(text)) {
        assert.equal(
          element.props.dangerouslySetInnerHTML,
          undefined,
          `dangerouslySetInnerHTML present pour : ${text}`,
        )
      }
    }
  })

  it('conserve le balisage hostile comme texte, jamais comme element', () => {
    const strings = collectStrings('<script>alert(1)</script>')
    // La charge doit se retrouver telle quelle dans une chaine : elle sera
    // echappee par React, donc affichee et non executee.
    assert.ok(
      strings.some((value) => value.includes('<script>alert(1)</script>')),
      'le texte brut doit etre transmis comme chaine',
    )
    // Et aucun element de type `script` ne doit exister dans l'arbre.
    assert.ok(!collectElements('<script>alert(1)</script>').some((el) => el.type === 'script'))
  })

  it('ne fabrique pas de lien pour un schema executable', () => {
    for (const text of ['javascript:alert(1)', 'data:text/html,<b>x</b>', 'vbscript:x']) {
      const anchors = collectElements(text).filter((el) => el.type === 'a')
      assert.equal(anchors.length, 0, `un lien a ete cree pour : ${text}`)
    }
  })

  it('cree un lien sur pour une URL http et mailto', () => {
    const anchors = collectElements('Voir https://example.com et ecrire a mailto:a@b.co').filter(
      (el) => el.type === 'a',
    )
    assert.equal(anchors.length, 2)
    for (const anchor of anchors) {
      const rel = String(anchor.props.rel ?? '')
      assert.match(rel, /noopener/)
      assert.match(rel, /noreferrer/)
      assert.match(rel, /nofollow/)
      assert.equal(anchor.props.target, '_blank')
    }
  })

  it('structure listes et citations en elements dedies', () => {
    const types = collectElements('- premier\n- second\n\n> une citation').map((el) => el.type)
    assert.ok(types.includes('ul'))
    assert.ok(types.includes('li'))
    assert.ok(types.includes('blockquote'))
  })

  it('ne rend rien pour un contenu vide', () => {
    assert.equal(treeOf(''), null)
    assert.equal(treeOf('   \n  '), null)
  })

  it('tolere une valeur non textuelle', () => {
    assert.equal(UserText({ text: null as never }), null)
    assert.equal(UserText({ text: 42 as never }), null)
  })
})

describe('extrait', () => {
  it('aplatit et borne', () => {
    assert.equal(excerptOf('  bonjour\n\n  le   monde  '), 'bonjour le monde')
    const long = excerptOf('a'.repeat(300), 50)
    assert.equal(long.length, 50)
    assert.ok(long.endsWith('…'))
  })

  it('tolere une valeur non textuelle', () => {
    assert.equal(excerptOf(undefined as never), '')
  })
})
