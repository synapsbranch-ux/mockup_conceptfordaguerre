import type { CSSProperties } from 'react'

/**
 * Marque affichee sur la page de connexion de l'administration.
 *
 * Reprend le monogramme du site. Les couleurs viennent des jetons de theme
 * Payload (`--theme-elevation-*`) et de l'accent defini dans `custom.scss` :
 * le rendu suit donc automatiquement le theme clair ou sombre choisi par
 * l'utilisateur, sans couleur figee.
 */

const wrap: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '14px',
}

const mark: CSSProperties = {
  width: '52px',
  height: '52px',
  borderRadius: '50%',
  border: '1px solid currentColor',
  display: 'grid',
  placeItems: 'center',
  fontSize: '13px',
  fontWeight: 800,
  letterSpacing: '0.08em',
  flexShrink: 0,
}

const name: CSSProperties = {
  fontSize: '13px',
  fontWeight: 700,
  lineHeight: 1.2,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
}

const tagline: CSSProperties = {
  display: 'block',
  marginTop: '4px',
  fontSize: '11px',
  fontWeight: 500,
  letterSpacing: '0.04em',
  textTransform: 'none',
  opacity: 0.62,
}

export const BrandLogo = () => (
  <div style={{ ...wrap, color: 'var(--theme-elevation-800)' }}>
    <span style={{ ...mark, color: 'var(--brand-accent, currentColor)' }}>JD</span>
    <span style={name}>
      Jacques-Daguerre
      <br />
      Valcy
      <span style={tagline}>Administration du site</span>
    </span>
  </div>
)

/** Icone compacte, utilisee dans l'onglet du navigateur et la barre laterale. */
export const BrandIcon = () => (
  <span
    style={{
      ...mark,
      width: '32px',
      height: '32px',
      fontSize: '10px',
      color: 'var(--brand-accent, currentColor)',
    }}
  >
    JD
  </span>
)
