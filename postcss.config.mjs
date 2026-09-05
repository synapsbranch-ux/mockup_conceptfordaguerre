/**
 * Tailwind v4 via son greffon PostCSS.
 *
 * Tailwind n'est chargé que par `src/styles/dashboard.css`, lui-même importé
 * uniquement par les layouts des tableaux de bord. Les pages publiques ne
 * traversent jamais cette feuille : `src/styles/globals.css` reste la seule
 * source de style du site public, inchangée.
 */
const config = {
  plugins: {
    '@tailwindcss/postcss': {},
  },
}

export default config
