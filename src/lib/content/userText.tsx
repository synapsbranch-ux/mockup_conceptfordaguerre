import type { ReactNode } from 'react'

/**
 * Rendu du texte soumis par les utilisateurs — commentaires, discussions,
 * réponses, messages.
 *
 * Le contenu est stocké et rendu en **texte brut**, transformé en nœuds React.
 * Aucun `dangerouslySetInnerHTML` n'intervient nulle part dans cette chaîne :
 * React échappe chaque chaîne de caractères, donc un contenu comme
 * `<img src=x onerror=alert(1)>` s'affiche littéralement au lieu de s'exécuter.
 * C'est ce qui ferme le XSS stocké à la racine, plutôt que de dépendre d'une
 * liste de balises autorisées qu'il faudrait maintenir.
 *
 * Un sous-ensemble minimal de mise en forme est reconnu — paragraphes, listes,
 * citations et liens — mais il est **construit en JSX**, jamais interprété
 * comme du HTML.
 */

/** Schémas d'URL autorisés dans un lien écrit par un utilisateur. */
const SAFE_URL = /^(https?:\/\/|mailto:)/i

/** Découpe un texte en segments, en isolant les URLs. */
const linkify = (text: string, keyPrefix: string): ReactNode[] => {
  const parts = text.split(/(\bhttps?:\/\/[^\s<>"']+|\bmailto:[^\s<>"']+)/gi)

  return parts.map((part, index) => {
    if (!SAFE_URL.test(part)) return part

    // `noopener noreferrer` : la page cible ne doit pas pouvoir manipuler
    // l'onglet d'origine ni lire son référent.
    return (
      <a
        key={`${keyPrefix}-l${index}`}
        href={part}
        target="_blank"
        rel="noopener noreferrer nofollow ugc"
        className="underline underline-offset-2"
      >
        {part}
      </a>
    )
  })
}

type Block =
  | { kind: 'paragraph'; lines: string[] }
  | { kind: 'quote'; lines: string[] }
  | { kind: 'list'; items: string[] }

/** Regroupe les lignes en blocs : paragraphes, citations, listes. */
const toBlocks = (text: string): Block[] => {
  const blocks: Block[] = []
  const lines = text.replace(/\r\n/g, '\n').split('\n')

  for (const raw of lines) {
    const line = raw.trimEnd()
    const previous = blocks[blocks.length - 1]

    if (line.trim() === '') {
      // Ligne vide : ferme le bloc courant.
      if (previous) blocks.push({ kind: 'paragraph', lines: [] })
      continue
    }

    const listItem = /^\s*[-*•]\s+(.*)$/.exec(line)
    if (listItem) {
      if (previous?.kind === 'list') previous.items.push(listItem[1])
      else blocks.push({ kind: 'list', items: [listItem[1]] })
      continue
    }

    const quote = /^\s*>\s?(.*)$/.exec(line)
    if (quote) {
      if (previous?.kind === 'quote') previous.lines.push(quote[1])
      else blocks.push({ kind: 'quote', lines: [quote[1]] })
      continue
    }

    if (previous?.kind === 'paragraph' && previous.lines.length > 0) previous.lines.push(line)
    else blocks.push({ kind: 'paragraph', lines: [line] })
  }

  return blocks.filter(
    (block) =>
      (block.kind === 'list' && block.items.length > 0) ||
      (block.kind !== 'list' && block.lines.length > 0),
  )
}

/**
 * Rend un texte utilisateur en nœuds React sûrs.
 * `text` peut venir directement de la base : aucune confiance ne lui est
 * accordée, et rien n'est interprété comme du balisage.
 */
export const UserText = ({ text, className }: { text: string; className?: string }) => {
  const blocks = toBlocks(typeof text === 'string' ? text : '')

  if (blocks.length === 0) return null

  return (
    <div className={className}>
      {blocks.map((block, index) => {
        if (block.kind === 'list') {
          return (
            <ul key={index} className="my-3 list-disc space-y-1 pl-5">
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>{linkify(item, `${index}-${itemIndex}`)}</li>
              ))}
            </ul>
          )
        }

        if (block.kind === 'quote') {
          return (
            <blockquote
              key={index}
              className="border-border text-muted-foreground my-3 border-l-2 pl-4 italic"
            >
              {block.lines.map((line, lineIndex) => (
                <p key={lineIndex}>{linkify(line, `${index}-${lineIndex}`)}</p>
              ))}
            </blockquote>
          )
        }

        return (
          <p key={index} className="my-3 whitespace-pre-line first:mt-0 last:mb-0">
            {block.lines.map((line, lineIndex) => (
              <span key={lineIndex}>
                {lineIndex > 0 && '\n'}
                {linkify(line, `${index}-${lineIndex}`)}
              </span>
            ))}
          </p>
        )
      })}
    </div>
  )
}

/** Extrait un aperçu sur une ligne, sans balisage. */
export const excerptOf = (text: string, length = 160): string => {
  const flat = (typeof text === 'string' ? text : '').replace(/\s+/g, ' ').trim()
  return flat.length > length ? `${flat.slice(0, length - 1)}…` : flat
}
