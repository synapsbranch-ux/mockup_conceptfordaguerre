/** Utilitaires de construction des fixtures de seed. */

export type HeadlineSegment = {
  text: string
  emphasized?: boolean
  newLine?: boolean
}

/**
 * Segment de titre.
 * `em` applique le style serif italique, `br` place le segment sur une
 * nouvelle ligne. Les segments d'une même ligne sont assemblés par le rendu
 * avec une espace simple : ne jamais saisir d'espace de bord ici.
 */
export const seg = (
  text: string,
  options?: { em?: boolean; br?: boolean },
): HeadlineSegment => ({
  text,
  emphasized: options?.em ?? false,
  newLine: options?.br ?? false,
})

// --- Construction de contenu Lexical ----------------------------------------

type LexicalNode = Record<string, unknown>

const textNode = (text: string, format = 0): LexicalNode => ({
  type: 'text',
  detail: 0,
  format,
  mode: 'normal',
  style: '',
  text,
  version: 1,
})

const blockNode = (type: string, children: LexicalNode[], extra: LexicalNode = {}): LexicalNode => ({
  type,
  format: '',
  indent: 0,
  version: 1,
  direction: 'ltr',
  children,
  ...extra,
})

export const paragraph = (text: string): LexicalNode =>
  blockNode('paragraph', [textNode(text)], { textFormat: 0, textStyle: '' })

export const heading = (text: string, tag: 'h2' | 'h3' = 'h2'): LexicalNode =>
  blockNode('heading', [textNode(text)], { tag })

export const blockquote = (text: string): LexicalNode =>
  blockNode('quote', [textNode(text)])

/** Enveloppe une liste de nœuds dans une racine Lexical valide. */
export const lexical = (children: LexicalNode[]) => ({
  root: {
    type: 'root',
    format: '',
    indent: 0,
    version: 1,
    direction: 'ltr' as const,
    children,
  },
})

/** Raccourci : un document Lexical composé uniquement de paragraphes. */
export const lexicalParagraphs = (...texts: string[]) => lexical(texts.map(paragraph))

// --- Références résolues à l'exécution du seed ------------------------------

/** Marqueur remplacé par l'identifiant du média portant cette clé. */
export type MediaRef = { __media: string }
/** Marqueur remplacé par l'identifiant de la page portant ce slug. */
export type PageRef = { __page: string }

export const media = (key: string): MediaRef => ({ __media: key })
export const pageRef = (slug: string): PageRef => ({ __page: slug })

/** Lien vers une page du site. */
export const pageLink = (label: string, slug: string) => ({
  label,
  type: 'page' as const,
  page: pageRef(slug),
  newTab: false,
})

/** Lien vers une destination libre (chemin, ancre, mailto, URL). */
export const customLink = (label: string, url: string, newTab = false) => ({
  label,
  type: 'custom' as const,
  url,
  newTab,
})

/** Un bloc de mise en page tel qu'exprimé dans les fixtures. */
export type SeedBlock = { blockType: string; visible?: boolean } & Record<string, unknown>
