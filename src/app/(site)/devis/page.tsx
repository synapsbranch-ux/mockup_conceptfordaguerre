import type { Metadata } from "next";
import Link from "next/link";

import { GuestQuoteForm } from "@/components/forms/GuestQuoteForm";
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
  title: "Demander un devis",
  description:
    "Décrivez votre besoin et recevez une proposition adaptée. Aucun compte n’est nécessaire pour envoyer une demande.",
  alternates: { canonical: `${env.serverURL}/devis` },
  openGraph: {
    title: "Demander un devis",
    description: "Décrivez votre besoin et recevez une proposition adaptée.",
    url: `${env.serverURL}/devis`,
    type: "website",
  },
};

/** Demande de devis, ouverte aux visiteurs comme aux clients. */
const PublicQuotePage = async () => {
  const [sessionUser, payload] = await Promise.all([
    getSessionUser(),
    getPayloadClient(),
  ]);

  const services = await payload.find({
    collection: "services",
    where: {
      and: [
        { _status: { equals: "published" } },
        { archived: { not_equals: true } },
      ],
    },
    sort: "order",
    limit: 50,
    depth: 0,
    overrideAccess: true,
  });

  return (
    <SiteShell>
      <main id="contenu" className="section-pad">
        <div className="shell">
          <header style={{ maxWidth: "46rem" }}>
            <p className="eyebrow">Devis</p>
            <h1 className="display-2">
              Décrivez <em>votre besoin</em>
            </h1>
            <p className="lede">
              Quelques lignes suffisent pour démarrer. Vous recevrez une réponse
              par courriel, et une proposition détaillée si le projet s’y prête.
            </p>
          </header>

          {sessionUser && (
            <p className="muted" style={{ marginTop: "1.5rem" }}>
              Vous êtes connecté :{" "}
              <Link href="/espace-client/devis/nouveau">
                passez par votre espace client
              </Link>{" "}
              pour suivre la demande, l’enregistrer en brouillon et y joindre
              des documents.
            </p>
          )}

          <div style={{ maxWidth: "46rem", marginTop: "3rem" }}>
            <GuestQuoteForm
              services={services.docs.map((service) => ({
                id: String(service.id),
                title: service.title,
              }))}
            />
          </div>
        </div>
      </main>
    </SiteShell>
  );
};

export default PublicQuotePage;
