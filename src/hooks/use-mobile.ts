import * as React from 'react'

const MOBILE_BREAKPOINT = 768

const QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`

/**
 * Vrai sur les fenêtres étroites.
 *
 * Implémenté avec `useSyncExternalStore` plutôt qu'avec un `useEffect` qui
 * appellerait `setState` : la valeur est lue directement depuis la source
 * (`matchMedia`), ce qui évite un rendu en cascade au montage et fournit
 * naturellement une valeur de repli côté serveur.
 */
const subscribe = (onChange: () => void): (() => void) => {
  const list = window.matchMedia(QUERY)
  list.addEventListener('change', onChange)
  return () => list.removeEventListener('change', onChange)
}

const getSnapshot = (): boolean => window.matchMedia(QUERY).matches

/** Côté serveur, aucune fenêtre : on suppose un affichage large. */
const getServerSnapshot = (): boolean => false

export function useIsMobile(): boolean {
  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
