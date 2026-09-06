import type { Metadata } from "next";
import Link from "next/link";

import { SiteShell } from "@/components/site/SiteShell";
import { getSessionUser } from "@/lib/auth/dal";
import { env } from "@/lib/env";
import { getPayloadClient } from "@/lib/payload";
/**
 * Rendu a la requete, jamais pre-rendu.
 *
 * Cette page depend de la session — les ressources reservees aux comptes, le
 * rattachement d'une demande — et de donnees qui changent souvent. La figer au
 * build servirait un etat perime, et rendrait surtout le deploiement dependant
 * de la base : une base momentanement injoignable ferait echouer une mise en
 * production qui aurait autrement abouti.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Ressources",
  description:
    "Guides, modèles et documents en libre accès, publiés au fil des travaux et des accompagnements.",
  alternates: { canonical: `${env.serverURL}/ressources` },
  openGraph: {
    title: "Ressources",
    description: "Guides, modèles et documents en libre accès.",
    url: `${env.serverURL}/ressources`,
    type: "website",
  },
};

const CATEGORY_LABELS: Record<string, string> = {
  guide: "Guide",
  template: "Modèle",
  report: "Rapport",
  contract: "Contrat",
  deliverable: "Livrable",
  invoice: "Facture",
  other: "Document",
};

const humanSize = (bytes: number | null | undefined): string => {
  if (!bytes || bytes <= 0) return "";
  const units = ["o", "ko", "Mo", "Go"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value < 10 && unit > 0 ? 1 : 0)} ${units[unit]}`;
};

/**
 * Ressources en libre accès.
 *
 * Seuls les documents en visibilité **publique** sont listés — la lecture passe
 * par la clause d'accès de la collection, sans re-filtrage applicatif, de sorte
 * qu'une divergence entre l'affichage et l'autorisation ne puisse pas laisser
 * fuiter une ligne.
 *
 * Une personne connectée voit en plus les ressources réservées aux comptes ;
 * c'est la même règle qui décide, pas une branche de code distincte.
 */
const ResourcesPage = async () => {
  const sessionUser = await getSessionUser();
  const payload = await getPayloadClient();

  const documents = await payload.find({
    collection: "documents",
    where: {
      and: [
        { archived: { not_equals: true } },
        // Les documents assignés à un client n'ont rien à faire sur une page
        // publique, même pour leur destinataire : il les retrouve dans son
        // espace.
        { visibility: { not_equals: "assigned" } },
      ],
    },
    sort: "-createdAt",
    limit: 100,
    depth: 0,
    overrideAccess: false,
    ...(sessionUser ? { user: { ...sessionUser, collection: "users" } } : {}),
  });

  return (
    <SiteShell>
      <main id="contenu" className="section-pad">
        <div className="shell">
          <header style={{ maxWidth: "46rem" }}>
            <p className="eyebrow">Ressources</p>
            <h1 className="display-2">
              Des documents <em>librement accessibles</em>
            </h1>
            <p className="lede">
              Guides, modèles et rapports publiés au fil des travaux. Aucun
              compte n’est nécessaire pour les consulter.
            </p>
          </header>

          {documents.docs.length === 0 ? (
            <p className="muted" style={{ marginTop: "3rem" }}>
              Aucune ressource publiée pour le moment.
            </p>
          ) : (
            <ul
              style={{
                listStyle: "none",
                padding: 0,
                marginTop: "3.5rem",
                display: "grid",
                gap: "1rem",
              }}
            >
              {documents.docs.map((document) => (
                <li
                  key={document.id}
                  style={{
                    border: "1px solid var(--line)",
                    borderRadius: "12px",
                    padding: "1.5rem",
                    background: "var(--white)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "1rem",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <h2 style={{ fontSize: "1.05rem", margin: 0 }}>
                        {document.title}
                      </h2>
                      {document.description && (
                        <p
                          className="muted"
                          style={{ marginTop: ".5rem", marginBottom: 0 }}
                        >
                          {document.description}
                        </p>
                      )}
                      <p
                        className="muted"
                        style={{
                          marginTop: ".6rem",
                          marginBottom: 0,
                          fontSize: ".82rem",
                        }}
                      >
                        {CATEGORY_LABELS[document.category as string] ??
                          "Document"}
                        {humanSize(document.filesize)
                          ? ` · ${humanSize(document.filesize)}`
                          : ""}
                        {document.visibility === "authenticated"
                          ? " · réservé aux comptes"
                          : ""}
                      </p>
                    </div>

                    {/* Le téléchargement passe par la route protégée, qui
                        revérifie l'autorisation à chaque requête. */}
                    <a
                      className="btn btn-ghost"
                      href={`/api/documents/${document.id}/telecharger`}
                      style={{ flexShrink: 0 }}
                    >
                      Télécharger
                    </a>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {!sessionUser && (
            <p className="muted" style={{ marginTop: "2.5rem" }}>
              <Link href="/connexion?next=%2Fressources">Connectez-vous</Link>{" "}
              pour accéder aux ressources réservées aux comptes.
            </p>
          )}
        </div>
      </main>
    </SiteShell>
  );
};

export default ResourcesPage;
