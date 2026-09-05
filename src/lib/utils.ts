import { clsx } from 'clsx'
import type { ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Fusionne des classes Tailwind en resolvant les conflits.
 * Utilise uniquement par les tableaux de bord : le site public n'emploie pas
 * Tailwind et conserve ses classes ecrites a la main.
 */
export const cn = (...inputs: ClassValue[]): string => twMerge(clsx(inputs))
