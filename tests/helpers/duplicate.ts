/**
 * Reconnait un refus d'unicite en base.
 *
 * Payload n'expose pas l'erreur MongoDB brute : il l'enveloppe dans une
 * `ValidationError` dont le message est traduit (« Le champ suivant n'est pas
 * valide : ... »). Un test qui ne chercherait que « duplicate key » passerait
 * donc a cote d'un refus pourtant bien applique — et laisserait croire qu'un
 * index est inoperant.
 */
export const isDuplicateKeyError = (error: unknown): boolean => {
  const code = (error as { code?: number })?.code
  const name = String((error as Error)?.name ?? '')
  const message = String((error as Error)?.message ?? '').toLowerCase()

  return (
    code === 11000 ||
    name === 'ValidationError' ||
    message.includes('duplicate') ||
    message.includes('unique') ||
    message.includes('pas valide')
  )
}
