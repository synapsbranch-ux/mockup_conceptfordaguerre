'use client'

import { ThemeProvider as NextThemesProvider } from 'next-themes'
import type { ComponentProps } from 'react'

/**
 * Thème clair/sombre des tableaux de bord.
 *
 * Cantonné au groupe `(dashboard)` : le site public conserve son unique thème
 * clair, défini par `globals.css`, et n'est pas concerné.
 *
 * `attribute="class"` pose `.dark` sur `<html>`, ce qu'attend la variante
 * `@custom-variant dark` déclarée dans `dashboard.css`.
 */
export const ThemeProvider = ({
  children,
  ...props
}: ComponentProps<typeof NextThemesProvider>) => (
  <NextThemesProvider
    attribute="class"
    defaultTheme="system"
    enableSystem
    disableTransitionOnChange
    {...props}
  >
    {children}
  </NextThemesProvider>
)
