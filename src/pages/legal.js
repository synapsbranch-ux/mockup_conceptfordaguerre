import Head from 'next/head'
import Layout, { PageIntro } from '@/components/Layout'

export default function Legal() {
  return (
    <Layout>
      <Head><title>Informations légales | Jacques-Daguerre Valcy</title></Head>
      <PageIntro eyebrow="Informations légales" number="07" title={'Transparence,<br/><em>respect et confiance.</em>'} description="Cette page regroupe les conditions d’utilisation et la politique de confidentialité. Le texte constitue un prototype à faire valider avant publication." />
      <section className="legal-layout shell section-pad-top">
        <nav aria-label="Sommaire juridique"><a href="#conditions">Conditions d’utilisation</a><a href="#confidentialite">Politique de confidentialité</a><a href="#donnees">Données & formulaires</a><a href="#droits">Vos droits</a><a href="#contact-legal">Contact</a></nav>
        <div className="legal-content">
          <div className="legal-warning">Version de travail — à réviser selon la juridiction, les outils réellement utilisés et l’identité légale du responsable.</div>
          <section id="conditions"><span>01</span><h2>Conditions d’utilisation</h2><p>Le contenu de ce site est fourni à titre informatif. Sauf indication contraire, les textes, visuels et éléments de marque appartiennent à leur titulaire et ne peuvent être reproduits sans autorisation.</p><p>Les informations publiées ne constituent pas un avis professionnel adapté à une situation particulière.</p></section>
          <section id="confidentialite"><span>02</span><h2>Politique de confidentialité</h2><p>Le site vise à recueillir uniquement les renseignements nécessaires pour répondre aux demandes, gérer les abonnements et offrir les fonctionnalités choisies par l’utilisateur.</p><p>Les fournisseurs techniques, durées de conservation et mesures de protection seront précisés avant la mise en production.</p></section>
          <section id="donnees"><span>03</span><h2>Données, formulaire et newsletter</h2><p>Le formulaire de contact peut recueillir le nom, le courriel, l’organisation, le sujet et le message. La newsletter recueille l’adresse courriel et la preuve du consentement.</p><p>Aucune inscription ne doit être ajoutée à une liste marketing sans consentement explicite. Chaque message de newsletter offrira une option de désabonnement.</p></section>
          <section id="droits"><span>04</span><h2>Consentement et droits</h2><p>Les utilisateurs pourront retirer leur consentement, demander l’accès ou la correction de leurs renseignements et demander leur suppression lorsque la loi le permet.</p></section>
          <section id="contact-legal"><span>05</span><h2>Responsable et contact</h2><p>L’identité officielle du responsable de la protection des renseignements et l’adresse de contact doivent être confirmées. Pour le prototype : <a href="mailto:jdvalcy02@gmail.com">jdvalcy02@gmail.com</a>.</p></section>
        </div>
      </section>
    </Layout>
  )
}
