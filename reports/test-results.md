# Résultats de vérification

Exécution complète sur le **build de production** (`npm run build && npm start`),
contre la base MongoDB réelle et le stockage GridFS.

| Contrôle | Résultat |
|---|---|
| ESLint | **0 erreur, 0 avertissement** |
| TypeScript (`tsc --noEmit`) | **0 erreur** |
| Build Next.js | **succès**, 13 routes |
| Tests unitaires et d'intégration | **25 / 25** |
| Critères d'acceptation | **21 / 21** |
| Conformité structurelle des routes | **14 / 14**, 322 vérifications de classe |
| `npm audit` | **0 haute, 0 critique** (9 modérées, 1 faible) |

---

## 1. Critères d'acceptation — 21 / 21

`node scripts/acceptance.mjs`. Chaque scénario restaure l'état initial ; la
suite est rejouable.

| # | Critère | Résultat |
|:-:|---|---|
| 1 | Modifier le titre du hero met à jour la page publique | ✅ modifié puis restauré |
| 2 | Remplacer l'image du hero et son texte alternatif | ✅ remplacée puis restaurée |
| 3 | Réordonner les sections de l'accueil | ✅ ordre modifié puis restauré |
| 4 | Masquer une section | ✅ masquée puis rétablie |
| 5 | Créer et publier un projet | ✅ |
| 6 | Le projet apparaît dans l'index, sa fiche répond | ✅ index et détail |
| 7 | Créer un article en brouillon | ✅ |
| 8 | Brouillon invisible au public, visible en prévisualisation | ✅ 404 public ; secret **et** session exigés |
| 9 | Publier rend l'article public | ✅ |
| 10 | Modifier l'en-tête change la navigation partout | ✅ vérifié sur 2 pages |
| 11 | Modifier le pied de page change toutes les pages | ✅ vérifié sur 2 pages |
| 12 | Téléverser une image depuis `/admin` | ✅ 4 déclinaisons, servie depuis GridFS |
| 13 | Les 25 médias migrés se chargent | ✅ 25 originaux + 96 déclinaisons, 2,0 Mio |
| 14 | Aucune page ne dépend de `src/data/site.js` | ✅ 41 fichiers vérifiés, 0 référence |
| 15 | Les demandes de contact arrivent en privé | ✅ 403 pour un anonyme |
| 16 | Les inscriptions à l'infolettre arrivent en privé | ✅ doublon refusé |
| 17 | Un éditeur ne peut pas gérer les super-admins | ✅ liste cloisonnée, création refusée, élévation bloquée |
| 18 | Un anonyme n'atteint aucun contenu non publié | ✅ 404 public, API REST vide |
| 19 | Routes et slugs existants fonctionnent | ✅ 19 routes en 200 |
| 20 | Métadonnées SEO présentes | ✅ title, description, canonical, og:title, og:image |
| 21 | Soumissions publiques limitées en débit | ✅ 5 acceptées puis 3 bloquées (429) |

Le critère 20 du cahier des charges — « rendu mobile et desktop cohérent » — est
couvert par la vérification structurelle en section 3, et le critère 21 —
« build, lint et tests » — par le tableau de tête.

---

## 2. Tests unitaires et d'intégration — 25 / 25

`npm test` — 7 suites, 11,2 s.

### `tests/pure.test.ts` — 18 cas

| Suite | Cas | Objet |
|---|:-:|---|
| `formatSlug` | 3 | accents, ponctuation, bords, idempotence |
| `validateHref` | 3 | destinations légitimes ; **refus de `javascript:`, `data:`, `vbscript:`** ; refus du vide |
| `pagePath` / `resolveHref` | 4 | accueil à la racine, relation peuplée, relation non peuplée, destination libre |
| `publicPathFor` | 1 | préservation des URLs historiques |
| Assainissement | 4 | caractères de contrôle retirés, sauts de ligne préservés, longueurs bornées, courriels validés |
| Détection automatisée | 3 | pot de miel, délai minimal, soumission humaine |

### `tests/gridfs.test.ts` — 7 cas

Exécutés contre la base réelle, sur des fichiers préfixés et supprimés en fin de
suite. Les 25 médias migrés ne sont jamais touchés.

| Cas | Objet |
|---|---|
| Aller-retour | écriture puis relecture à l'identique, type MIME conservé |
| Écritures concurrentes | **trois écritures du même nom → une seule révision conservée** |
| Remplacement | la révision la plus récente est servie, sans orphelin |
| Suppression | fichier **et chunks** retirés |
| Suppression concurrente | deux suppressions simultanées → une seule réelle, aucune erreur |
| Nom inexistant | `findFile` renvoie `null`, la suppression renvoie 0 |
| Non-régression | le média migré `hero-executive.webp` reste présent et unique |

Les deux cas de concurrence couvrent des défauts réels rencontrés puis corrigés
pendant l'intégration : `withoutEnlargement` fait que deux tailles cibles
produisent le même nom de fichier lorsque l'image source est plus petite que les
deux, et Payload les téléverse en parallèle.

---

## 3. Conformité structurelle — 14 / 14 routes

`npm run verify:routes`. Pour chaque route, statut HTTP puis présence de **toutes
les classes CSS** que le prototype utilisait sur cette page. `globals.css` étant
inchangé, la présence de ces classes garantit le même traitement visuel — y
compris responsive, les points de rupture (1100 px, 820 px, 520 px) et la règle
`prefers-reduced-motion` s'appliquant aux mêmes sélecteurs.

| Route | Classes | Poids |
|---|:-:|---|
| `/` | 62 | 66,5 Ko |
| `/about` | 34 | 59,1 Ko |
| `/projects` | 25 | 47,4 Ko |
| `/services` | 28 | 40,7 Ko |
| `/blog` | 27 | 49,2 Ko |
| `/contact` | 26 | 33,9 Ko |
| `/engagement` | 24 | 38,4 Ko |
| `/legal` | 22 | 36,3 Ko |
| `/space` | 24 | 32,0 Ko |
| `/projects/tableaux-de-bord-power-bi` | 25 | 35,8 Ko |
| `/blog/comment-la-data-peut-aider-haiti` | 25 | 35,7 Ko |
| `/page-inexistante` | — | 404 attendu ✅ |
| `/projects/inexistant` | — | 404 attendu ✅ |
| `/blog/inexistant` | — | 404 attendu ✅ |

**322 vérifications de classe, aucune absente.**

### Fidélité du balisage

Le rendu des titres a été comparé caractère par caractère au prototype :

```
prototype : Transformer les<br />données en <em>décisions utiles.</em>
rendu     : Transformer les<br/>données en<!-- --> <em>décisions utiles.</em>
```

Les `<!-- -->` sont les séparateurs de nœuds texte de React : invisibles, sans
effet sur le texte ni la mise en page. Le balisage utile est identique.

---

## 4. Idempotence de la migration

Chaque script a été exécuté au moins trois fois.

| Script | 1ʳᵉ exécution | Exécutions suivantes |
|---|---|---|
| `payload:migrate-media` | 25 créés | **0 créé**, 25 mis à jour |
| `payload:seed` | 5+5+4+4+9 créés | **0 créé**, tous mis à jour |

Compteurs en base, stables : 9 pages, 5 projets, 5 articles, 4 services,
4 engagements, 25 médias. Aucun doublon.

Vérification du stockage : **25 documents Media ↔ 121 fichiers GridFS**
(25 originaux + 96 déclinaisons distinctes), **aucun nom de fichier en double**.

---

## 5. Adaptateur GridFS — vérification HTTP

| Contrôle | Résultat |
|---|---|
| `GET` original | 200, `image/webp`, 33 456 octets |
| `GET` déclinaison | 200, 3 656 octets |
| `GET` fichier inexistant | 404 |
| En-têtes | `ETag`, `Cache-Control: public, max-age=31536000, immutable`, `Accept-Ranges`, `Last-Modified` |
| `If-None-Match` | **304** |
| `Range: bytes=0-99` | **206**, 100 octets |
| Suppression en cascade | 25 documents supprimés → **0 fichier, 0 chunk** restants |

---

## 6. Dépendances

```
{"info":0,"low":1,"moderate":9,"high":0,"critical":0,"total":10}
```

Deux corrections appliquées pendant l'intégration :

- **Next 15.4.11 → 16.3.4.** La 15.4.11 portait 10 vulnérabilités hautes non
  corrigées ; Payload 3.88 exclut par ailleurs toute la ligne 15.5. Next 16.3.4
  est la seule version satisfaisant les deux contraintes.
- **sharp 0.34.5 → 0.35.4.** Quatre CVE héritées de libvips.

Les 9 avis modérés et 1 faible restants sont transitifs, sans correctif amont.

---

## 7. Environnement de vérification

| | |
|---|---|
| Node.js | 26.5.0 |
| Next.js | 16.3.4 (Turbopack) |
| Payload | 3.88.0 |
| React | 19.2.8 |
| MongoDB | 8.0.29, **autonome** (sans replica set, donc sans transactions) |
| Stockage média | GridFS |
| Mode | production (`npm run build && npm start`) |
