import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { DEFAULT_REDIRECT, safeRedirect } from '@/lib/auth/redirect'
import { DEFAULT_ROLE, isStaffRole, isSuperAdminRole, normalizeRole } from '@/lib/auth/roles'

describe('safeRedirect', () => {
  it('accepte un chemin interne', () => {
    assert.equal(safeRedirect('/espace-client/factures'), '/espace-client/factures')
    assert.equal(safeRedirect('/forum?tri=recent'), '/forum?tri=recent')
    assert.equal(safeRedirect('/blog/mon-article#section'), '/blog/mon-article#section')
  })

  it('refuse une origine externe', () => {
    for (const value of [
      'https://evil.test',
      'http://evil.test/path',
      '//evil.test',
      '///evil.test',
      'evil.test',
    ]) {
      assert.equal(safeRedirect(value), DEFAULT_REDIRECT, `${value} devrait etre refuse`)
    }
  })

  it('refuse les contournements par antislash et par encodage', () => {
    for (const value of ['/\\evil.test', '\\\\evil.test', '%2f%2fevil.test', '/%5cevil.test']) {
      assert.equal(safeRedirect(value), DEFAULT_REDIRECT, `${value} devrait etre refuse`)
    }
  })

  it('refuse un schema executable', () => {
    for (const value of ['javascript:alert(1)', '/javascript:alert(1)', 'data:text/html,x']) {
      assert.equal(safeRedirect(value), DEFAULT_REDIRECT, `${value} devrait etre refuse`)
    }
  })

  it('refuse une valeur vide, absente ou non textuelle', () => {
    for (const value of ['', '   ', null, undefined, 42, {}, []]) {
      assert.equal(safeRedirect(value), DEFAULT_REDIRECT)
    }
  })

  it('refuse une sequence de pourcentage invalide', () => {
    assert.equal(safeRedirect('/%E0%A4%A'), DEFAULT_REDIRECT)
  })

  it('honore la destination de repli fournie', () => {
    assert.equal(safeRedirect('https://evil.test', '/admin'), '/admin')
  })
})

describe('normalisation des roles', () => {
  it('retombe sur customer pour toute valeur inconnue', () => {
    for (const value of [undefined, null, '', 'root', 'ADMIN', 'super_admin', 7, {}]) {
      assert.equal(normalizeRole(value), DEFAULT_ROLE)
    }
    assert.equal(DEFAULT_ROLE, 'customer')
  })

  it('conserve les roles connus', () => {
    assert.equal(normalizeRole('customer'), 'customer')
    assert.equal(normalizeRole('editor'), 'editor')
    assert.equal(normalizeRole('super-admin'), 'super-admin')
  })

  it('distingue le personnel des clients', () => {
    assert.equal(isStaffRole('editor'), true)
    assert.equal(isStaffRole('super-admin'), true)
    assert.equal(isStaffRole('customer'), false)
    assert.equal(isStaffRole('inconnu'), false)

    assert.equal(isSuperAdminRole('super-admin'), true)
    assert.equal(isSuperAdminRole('editor'), false)
  })
})
