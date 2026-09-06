import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { normalizePublicOrigin } from '@/lib/env'

describe('normalizePublicOrigin', () => {
  it('accepte une origine bien formee et retire le slash final', () => {
    assert.equal(
      normalizePublicOrigin('https://exemple.fr', 'NEXT_PUBLIC_SERVER_URL'),
      'https://exemple.fr',
    )
    assert.equal(
      normalizePublicOrigin('https://exemple.fr/', 'NEXT_PUBLIC_SERVER_URL'),
      'https://exemple.fr',
    )
    assert.equal(
      normalizePublicOrigin('http://localhost:3000', 'NEXT_PUBLIC_SERVER_URL'),
      'http://localhost:3000',
    )
  })

  /**
   * Le cas qui a mis la connexion hors service en production : `new URL()`
   * accepte la valeur, l'hote devient « https » et le vrai domaine passe dans
   * le chemin — d'ou un `basePath` errone et un `/api/auth/*` en 404.
   */
  it('rejette un schema duplique', () => {
    assert.throws(
      () => normalizePublicOrigin('https://https://exemple.fr', 'NEXT_PUBLIC_SERVER_URL'),
      /NEXT_PUBLIC_SERVER_URL/,
    )
  })

  it('rejette une valeur sans protocole, avec chemin, parametres ou ancre', () => {
    const invalides = [
      'exemple.fr',
      'ftp://exemple.fr',
      'https://exemple.fr/fr',
      'https://exemple.fr?a=1',
      'https://exemple.fr#ancre',
    ]
    for (const value of invalides) {
      assert.throws(
        () => normalizePublicOrigin(value, 'NEXT_PUBLIC_SERVER_URL'),
        `${value} devrait etre rejete`,
      )
    }
  })
})
