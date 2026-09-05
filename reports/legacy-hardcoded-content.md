# Fichiers qui portaient du contenu en dur

État avant migration : **100 % du contenu métier était figé dans le code**.
Ce document recense chaque fichier concerné, ce qu'il contenait, et où ce
contenu se trouve désormais.

---

## 1. Source de données centrale

| Fichier | Contenu | Destination |
|---|---|---|
| `src/data/site.js` | 25 chemins d'images, 5 projets, 5 articles, 6 étapes de parcours, 4 services | Collections `media`, `projects`, `articles`, `services` + bloc `timeline` de la page À propos |

**Supprimé.** Archivé sous forme de fixture typée dans
`src/payload/seed/fixtures/legacy-site.ts`, importée uniquement par le seed et
jamais par une page publique.

---

## 2. Composant de mise en page

| Fichier | Contenu | Destination |
|---|---|---|
| `src/components/Layout.js` | 7 liens de navigation, marque « JD / Jacques-Daguerre Valcy », 2 images éditoriales de pied de page, message « Clarifier / Décider / Agir », bloc infolettre complet, 3 colonnes de liens, 5 réseaux sociaux, courriel, copyright, signature | Globals **En-tête** et **Pied de page** |

**Supprimé.**

---

## 3. Pages du routeur historique

Les onze fichiers ci-dessous ont été remplacés par des pages CMS composées de
blocs. Tous **supprimés**.

| Fichier | Contenu en dur | Destination |
|---|---|---|
| `src/pages/index.js` | Accroche, titre, texte d'intro, 2 boutons, encart « +34% », déclaration « Mon approche », 4 en-têtes de section, texte « D'Haïti au Québec », 4 légendes de galerie, appel final | Page `home`, 8 blocs |
| `src/pages/about.js` | Introduction, biographie (3 paragraphes), encart « à compléter », titre du parcours, 2 paragraphes « Aujourd'hui », 6 valeurs, 2 légendes de jalons | Page `about`, 5 blocs |
| `src/pages/projects.js` | Introduction, libellé « Voir l'étude de cas » | Page `projects`, 2 blocs |
| `src/pages/services.js` | Introduction, texte de mission, section vision, section collaboration, note administrative | Page `services`, 6 blocs |
| `src/pages/blog.js` | Introduction, mention « Article à la une », « Tous les articles », « 05 perspectives à venir » | Page `blog`, 3 blocs |
| `src/pages/contact.js` | Introduction, 3 coordonnées, message de disponibilité, 7 libellés de champ, 6 sujets, message de succès | Page `contact`, 3 blocs |
| `src/pages/engagement.js` | Introduction, citation « Mon pourquoi », **4 engagements**, section « Transmettre », 6 valeurs | Page `engagement`, 5 blocs + collection `commitments` |
| `src/pages/legal.js` | Introduction, avertissement, 5 sections juridiques, sommaire | Page `legal`, 2 blocs |
| `src/pages/space.js` | Introduction, 3 avantages, 2 onglets, 4 libellés de champ, 2 boutons, mention de démonstration | Page `space`, 1 bloc |
| `src/pages/projects/[slug].js` | 4 titres de section, « Technologies », « Projet suivant », lien de retour, mention sur les résultats | Réglages du site → Libellés des gabarits, + champs de la collection `projects` |
| `src/pages/blog/[slug].js` | Chapeau, 3 titres, 3 paragraphes, citation, mention de brouillon, lien de retour | Champs `lead` et `body` des articles, bloc `noticeNote`, + Réglages du site |

---

## 4. Prototype de CMS

| Fichier | Contenu | Destination |
|---|---|---|
| `src/pages/admin.js` | Maquette morte : chiffres statiques (12 contenus, 05 brouillons, 07 publiés, 38 médias), 3 lignes de contenu fictives, 4 boutons sans action | **Remplacé par le véritable panneau Payload** à la même URL `/admin` |

**Supprimé.** C'était la première suppression du chantier, la route étant
occupée.

---

## 5. Fichiers annexes supprimés

| Fichier ou dossier | Motif |
|---|---|
| `src/pages/_app.js`, `src/pages/_document.js` | Remplacés par `src/app/(site)/layout.tsx` |
| `src/pages/api/hello.js` | Boilerplate Next inutilisé |
| `src/styles/Home.module.css` | 278 lignes jamais importées |
| `jsconfig.json` | Remplacé par `tsconfig.json` |
| `next.config.js` | Remplacé par `next.config.mjs` (`withPayload`) |
| `public/All-Texts/` | 34 Ko de textes du template d'origine (CodeBucks) : « Software Engineer @Google », articles sur React et Redux. Sans rapport avec le projet, non référencés |
| `public/images/articles/`, `projects/`, `profile/`, `svgs/` | Visuels du même template, non référencés |
| `public/images/circular-text.png`, `public/dummy.pdf`, `next.svg`, `thirteen.svg`, `vercel.svg` | Résidus non référencés |

---

## 6. Fichiers conservés intacts

| Fichier | Motif |
|---|---|
| `src/styles/globals.css` | **520 lignes, inchangées.** C'est la source de vérité visuelle du site ; l'intégration n'y a pas touché |
| `public/favicon.ico` | Toujours utilisé |
| `scripts/optimize-images.mjs` | Toujours utile pour régénérer les sources ; seul le dossier de sortie a changé |

---

## 7. Images sources

Les 25 fichiers WebP ont été déplacés de `public/images/daguerre/` vers
`seed-assets/daguerre/`. Ils ne sont plus servis publiquement — le site les
consomme depuis GridFS — mais restent disponibles pour rejouer
`npm run payload:migrate-media` sur une base vierge.

---

## 8. Vérification automatisée

Le scénario 14 de `scripts/acceptance.mjs` parcourt `src/app`,
`src/components` et `src/lib` et échoue si un seul fichier référence encore
`data/site` ou `images/daguerre`. Il contrôle également que le HTML rendu ne
pointe vers aucune image locale.

Dernier résultat : **40 fichiers vérifiés, aucune référence.**
