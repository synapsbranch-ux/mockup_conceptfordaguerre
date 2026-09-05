/**
 * Injecte un document JSON-LD dans la page.
 *
 * Le contenu est produit cote serveur par `src/lib/structuredData.ts` a partir
 * du CMS, puis serialise par `JSON.stringify` : aucune saisie d'editeur ne peut
 * s'echapper de la chaine JSON, et le type `application/ld+json` n'est jamais
 * execute par le navigateur.
 */
export const StructuredData = ({ json }: { json: string }) => (
  <script
    type="application/ld+json"
    // Charge utile JSON generee par le serveur, jamais du HTML.
    dangerouslySetInnerHTML={{ __html: json.replace(/</g, '\\u003c') }}
  />
)
