import Head from 'next/head'
import { useState } from 'react'
import Layout from '@/components/Layout'

export default function Space() {
  const [mode, setMode] = useState('login')
  return (
    <Layout>
      <Head><title>Espace utilisateur | Jacques-Daguerre Valcy</title></Head>
      <section className="auth-page shell">
        <div className="auth-intro"><p className="eyebrow">Espace utilisateur</p><h1>Votre veille data,<br /><em>au même endroit.</em></h1><p>Enregistrez vos articles, accédez aux contenus réservés et gérez votre abonnement à la newsletter.</p><div className="auth-benefits"><span>01 · Articles favoris</span><span>02 · Contenus réservés</span><span>03 · Préférences newsletter</span></div></div>
        <div className="auth-card">
          <div className="auth-tabs"><button className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>Connexion</button><button className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')}>Créer un compte</button></div>
          <form onSubmit={(event) => event.preventDefault()}>
            {mode === 'register' && <label>Nom<input placeholder="Votre nom" /></label>}
            <label>Courriel<input type="email" placeholder="vous@courriel.com" /></label><label>Mot de passe<input type="password" placeholder="••••••••" /></label>
            {mode === 'register' && <label className="checkbox"><input type="checkbox" /><span>J’accepte les conditions et la politique de confidentialité.</span></label>}
            <button className="button button-dark" type="submit">{mode === 'login' ? 'Se connecter' : 'Créer mon compte'} ↗</button>
          </form>
          <p className="prototype-caption">Interface de démonstration — authentification à connecter.</p>
        </div>
      </section>
    </Layout>
  )
}
