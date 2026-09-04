import Head from 'next/head'
import { useState } from 'react'
import Layout, { PageIntro } from '@/components/Layout'

export default function Contact() {
  const [sent, setSent] = useState(false)
  const submit = (event) => { event.preventDefault(); setSent(true) }
  return (
    <Layout>
      <Head><title>Contact | Jacques-Daguerre Valcy</title></Head>
      <PageIntro eyebrow="Contact" number="06" title={'Parlons de votre<br/><em>prochaine décision.</em>'} description="Un projet de visualisation, d’automatisation ou une question data à clarifier ? Décrivez le contexte, nous partirons du besoin réel." />
      <section className="contact-layout shell">
        <aside className="contact-aside">
          <div><span>Courriel</span><a href="mailto:jdvalcy02@gmail.com">jdvalcy02@gmail.com</a></div>
          <div><span>Rendez-vous</span><p>Lien Calendly à confirmer</p></div>
          <div><span>Réseaux</span><p>LinkedIn et autres liens à fournir</p></div>
          <div className="availability"><i /> Disponible pour de nouvelles collaborations</div>
        </aside>
        <form className="contact-form" onSubmit={submit}>
          <div className="field-pair"><label>Votre nom<input name="name" required placeholder="Nom complet" /></label><label>Votre courriel<input type="email" name="email" required placeholder="vous@entreprise.com" /></label></div>
          <label>Organisation<input name="organisation" placeholder="Nom de l’organisation" /></label>
          <label>Sujet<select name="subject" defaultValue=""><option value="" disabled>Choisir un sujet</option><option>Analyse de données</option><option>Tableau de bord</option><option>Automatisation</option><option>Solution Web & data</option><option>Collaboration Datakle</option><option>Autre</option></select></label>
          <label>Parlez-moi du projet<textarea name="message" required rows="6" placeholder="Contexte, besoin, échéancier…" /></label>
          <label className="checkbox"><input type="checkbox" required /> <span>J’accepte que mes informations soient utilisées pour répondre à cette demande.</span></label>
          <button className="button button-dark" type="submit">Envoyer la demande ↗</button>
          {sent && <p className="success-message" role="status">Message simulé avec succès. Le formulaire sera connecté au service d’envoi pendant le développement.</p>}
        </form>
      </section>
    </Layout>
  )
}
