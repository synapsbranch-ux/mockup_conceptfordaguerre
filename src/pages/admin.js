import Head from 'next/head'
import Layout from '@/components/Layout'

const drafts = [
  ['Comment la data peut aider Haïti', 'Article', 'Brouillon'],
  ['Tableaux de bord Power BI', 'Projet', 'Publié'],
  ['Présentation Datakle', 'Page', 'À réviser'],
]

export default function Admin() {
  return (
    <Layout>
      <Head><title>Prototype CMS | Jacques-Daguerre Valcy</title></Head>
      <section className="cms-page shell">
        <header className="cms-header"><div><p className="eyebrow">Micro CMS · Prototype</p><h1>Bonjour Jacques-Daguerre.</h1><p>Gérez les pages, projets, articles et médias sans modifier le code.</p></div><button className="button button-dark">+ Nouveau contenu</button></header>
        <div className="cms-stats"><article><span>12</span><p>Contenus</p></article><article><span>05</span><p>Brouillons</p></article><article><span>07</span><p>Publiés</p></article><article><span>38</span><p>Médias</p></article></div>
        <div className="cms-grid">
          <section className="cms-panel"><div className="cms-panel-title"><h2>Contenus récents</h2><button>Tout voir</button></div>{drafts.map(([title, type, status]) => <div className="cms-row" key={title}><div><strong>{title}</strong><span>{type}</span></div><span className={`status status-${status.toLowerCase().replace('à ', '').replace('é', 'e')}`}>{status}</span><button aria-label={`Modifier ${title}`}>•••</button></div>)}</section>
          <aside className="cms-actions"><h2>Actions rapides</h2><button>Rédiger un article <span>↗</span></button><button>Ajouter un projet <span>↗</span></button><button>Gérer les images <span>↗</span></button><button>Prévisualiser le site <span>↗</span></button></aside>
        </div>
        <p className="prototype-caption">Prototype visuel du micro CMS : création, modification, brouillon, publication, suppression et gestion des médias seront reliées au backend choisi.</p>
      </section>
    </Layout>
  )
}
