'use client'

import { useRowLabel } from '@payloadcms/ui'

type HeadlineRow = {
  text?: string | null
  emphasized?: boolean | null
  newLine?: boolean | null
}

/**
 * Étiquette de ligne dans l'admin : montre le texte du segment et signale
 * d'un coup d'œil l'emphase et le retour à la ligne.
 */
export const HeadlineRowLabel = () => {
  const { data, rowNumber } = useRowLabel<HeadlineRow>()
  const index = String((rowNumber ?? 0) + 1).padStart(2, '0')
  const text = data?.text?.trim()
  if (!text) return <span>{`Segment ${index}`}</span>
  const marks = [data?.newLine ? '↵' : null, data?.emphasized ? 'italique' : null]
    .filter(Boolean)
    .join(' · ')
  return <span>{`${index}. ${text}${marks ? `  (${marks})` : ''}`}</span>
}
