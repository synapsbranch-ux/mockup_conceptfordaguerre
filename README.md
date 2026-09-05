# Jacques-Daguerre Valcy — portfolio et offre Datakle

Site Next.js 16 piloté par **Payload CMS 3**. Chaque élément visible du site
public — textes, images, navigation, mentions légales — est administrable
depuis `/admin`, sans toucher au code.

- **Frontend public** : App Router, composants serveur, API Local Payload.
- **CMS** : Payload 3.88, interface en français, à `/admin`.
- **Base de données** : MongoDB.
- **Médias** : GridFS par défaut, adaptateur S3 disponible.

---

## Démarrage

```bash
npm install
cp .env.example .env        # puis renseigner les valeurs
npm run payload:bootstrap-admin
npm run payload:migrate-content
npm run dev
```

Le site répond sur `http://localhost:3000`, l'administration sur
`http://localhost:3000/admin`.

### Variables d'environnement

Les clés sont décrites dans [.env.example](.env.example). Les indispensables :

| Variable | Rôle |
|---|---|
| `DATABASE_URI` | URI MongoDB complète, **base incluse**. Railway et Atlas exigent `?authSource=admin`. |
| `PAYLOAD_SECRET` | Clé de chiffrement Payload. `openssl rand -hex 32`. |
| `PREVIEW_SECRET` | Protège les liens de prévisualisation et la route de revalidation. `openssl rand -hex 24`. |
| `NEXT_PUBLIC_SERVER_URL` | Origine publique, sans slash final. Sert aux URLs canoniques, à Open Graph, au CORS. |
| `MEDIA_STORAGE_DRIVER` | `gridfs` ou `s3`. |
| `REDIS_URL` | Optionnel. Limitation de débit partagée entre instances. |

**Ne jamais commiter `.env`.** Le fichier est couvert par `.gitignore`.

---

## Commandes

| Commande | Effet |
|---|---|
| `npm run dev` | Serveur de développement. |
| `npm run build` / `npm start` | Build et service en production. |
| `npm run lint` | ESLint. |
| `npm test` | Tests unitaires et d'intégration (25 cas). |
| `npm run verify:routes` | Contrôle structurel des 11 routes publiques et des 404. |
| `npm run payload:generate-types` | Régénère `src/payload-types.ts`. |
| `npm run payload:bootstrap-admin` | Crée les comptes super-administrateurs. |
| `npm run payload:migrate-media` | Téléverse les images sources dans la collection Media. |
| `npm run payload:seed` | Crée ou met à jour pages, projets, articles, services, engagements et globals. |
| `npm run payload:migrate-content` | Enchaîne les deux précédentes. |
| `npm run images:optimize` | Retélécharge et réoptimise les 25 sources Drive. |

`payload:seed` et `payload:migrate-media` sont **idempotents** : les rejouer ne
crée aucun doublon. Ils sollicitent `/api/revalidate` en fin d'exécution pour
purger le cache d'un serveur en cours d'exécution.

### Premier administrateur

```bash
npm run payload:bootstrap-admin
```

Le mot de passe est demandé en saisie masquée. Pour un déploiement automatisé,
`BOOTSTRAP_ADMIN_EMAIL` et `BOOTSTRAP_ADMIN_PASSWORD` permettent de le fournir
sans interaction — à retirer du fichier `.env` une fois les comptes créés.

Aucun mot de passe par défaut n'existe et aucune inscription publique n'est
possible : seul un super-administrateur peut créer un compte.

---

## Architecture

```
src/
  payload.config.ts           Configuration Payload
  payload-types.ts            Types générés — ne pas éditer à la main
  app/
    (payload)/                Admin et API Payload
    (site)/                   Site public
    api/                      contact, newsletter, preview, revalidate
  components/
    blocks/                   Un composant par bloc + RenderBlocks
    site/                     En-tête, pied de page, primitives
    media/CMSImage.tsx        Résolution Media → next/image
    richtext/RichText.tsx     Sérialiseur Lexical
    forms/                    Formulaires client
  payload/
    collections/ globals/ blocks/ fields/ access/ hooks/
    storage/gridfsAdapter.ts  Adaptateur GridFS
    seed/                     Fixtures et seed idempotent
    scripts/                  Amorçage, migration, seed
  lib/                        env, payload, links, seo, sanitize, rateLimit
  styles/globals.css          Feuille de style d'origine, inchangée
seed-assets/daguerre/         25 images sources du seed (hors `public/`)
```

### Contenu

| Collection | Rôle | Brouillons |
|---|---|:-:|
| `pages` | Pages composées de blocs réordonnables | ✅ |
| `projects` | Études de cas, `/projects/[slug]` | ✅ |
| `articles` | Blog, `/blog/[slug]` | ✅ |
| `services` | Offre Datakle | ✅ |
| `commitments` | Engagements sociaux | ✅ |
| `media` | Bibliothèque d'images | – |
| `contactSubmissions` | Demandes reçues, **privé** | – |
| `newsletterSubscribers` | Abonnés, **privé** | – |
| `users` | Comptes CMS | – |

Globals : **Réglages du site**, **En-tête**, **Pied de page**. Une modification
s'applique immédiatement à toutes les pages.

### Blocs

26 blocs typés composent les pages. Chaque bloc porte une case **« Section
visible »** — la décocher masque la section sans perdre son contenu — et une
**variante** choisie dans une liste fermée. Les éditeurs ne saisissent jamais de
HTML, de CSS ni de code.

Les titres du design mêlent retours à la ligne et passages en serif italique
(`données en <em>décisions utiles.</em>`). Plutôt que d'exposer du HTML, ils sont
découpés en **segments** portant deux cases : « mise en avant » et « nouvelle
ligne ». Le rendu est identique au pixel.

---

## Médias

### Mode GridFS (par défaut)

Les binaires — original et quatre déclinaisons (320, 768, 1200, 1920 px) — sont
écrits **en flux** dans GridFS. Jamais de base64. MongoDB ne conserve dans la
collection `media` que les métadonnées et les relations.

Les fichiers sont servis par `/api/media/file/<nom>`, avec `ETag`,
`Cache-Control: immutable`, requêtes conditionnelles `304` et requêtes par plage
`206`. La suppression d'un média retire en cascade tous ses binaires et leurs
chunks.

**Compromis à connaître.** Chaque lecture d'image traverse Node et MongoDB : pas
de CDN natif, coût en RAM et en E/S sur le serveur, base qui grossit avec les
binaires, sauvegardes plus lourdes. Ce mode convient à ce site (25 images,
6 Mio) et évite toute dépendance externe. Dès qu'un CDN devient souhaitable,
passer en S3 ne coûte qu'un changement de variable et un nouveau téléversement.

### Mode S3

```env
MEDIA_STORAGE_DRIVER=s3
S3_BUCKET=...
S3_REGION=...
S3_ENDPOINT=...          # vide pour AWS, renseigné pour R2 / MinIO
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...
S3_FORCE_PATH_STYLE=true # MinIO et S3 auto-hébergés
```

Compatible AWS S3, Cloudflare R2 et MinIO. Le système de fichiers local n'est
utilisé comme stockage permanent dans **aucun** des deux modes.

### Contraintes de téléversement

Formats acceptés : JPEG, PNG, WebP, AVIF. **SVG refusé** — il peut porter du
script. Taille maximale 8 Mo. Le texte alternatif est obligatoire.

Un média référencé par du contenu publié ne peut pas être supprimé : le CMS
affiche la liste des contenus qui l'utilisent.

---

## Brouillons et prévisualisation

1. Enregistrer un brouillon dans l'admin.
2. Cliquer sur **Prévisualiser** : le site s'affiche avec le design réel.
3. Publier.
4. L'onglet **Versions** permet de comparer et de restaurer une version.

Un brouillon n'est jamais accessible à un visiteur anonyme, ni par URL, ni par
l'API REST. La prévisualisation exige **à la fois** le secret et une session
Payload valide.

---

## Cache et revalidation

Les lectures publiques passent par un cache étiqueté par collection. Les hooks
Payload invalident les étiquettes concernées à chaque publication ou
suppression : une modification faite dans l'admin apparaît sans redéploiement.

Les scripts en ligne de commande s'exécutent hors contexte Next et ne peuvent
pas invalider eux-mêmes ; ils sollicitent `/api/revalidate` en fin d'exécution.
Si aucun serveur n'écoute, le prochain démarrage repart d'un cache vide.

En cas de doute sur un contenu qui ne se met pas à jour :

```bash
curl -X POST http://localhost:3000/api/revalidate -H "x-revalidate-secret: $PREVIEW_SECRET"
```

---

## Sécurité

Voir [reports/security-summary.md](reports/security-summary.md) pour le détail.
En résumé : rôles `super-admin` et `editor` cloisonnés, aucune inscription
publique, contenu non publié inaccessible aux anonymes, soumissions publiques
protégées par pot de miel, délai minimal et limitation de débit, CORS et CSRF
restreints à l'origine déclarée, aucune adresse IP conservée.

---

## Vérification

```bash
npm run lint && npx tsc --noEmit && npm run build
npm test                          # 25 cas
npm run verify:routes             # structure des 11 routes + 404
node scripts/acceptance.mjs       # 21 critères d'acceptation
```

`scripts/acceptance.mjs` exige un serveur démarré et le fichier
`.admin-credentials.local`. Il restaure l'état initial à chaque exécution.

---

## Déploiement

1. Renseigner les variables d'environnement, `NEXT_PUBLIC_SERVER_URL` pointant
   sur le domaine public.
2. `npm ci && npm run build`.
3. Au premier déploiement : `npm run payload:bootstrap-admin` puis
   `npm run payload:migrate-content`.
4. `npm start`.

Le dossier `seed-assets/daguerre/` doit rester présent pour pouvoir rejouer la
migration des médias sur une base vierge. Il n'est pas servi publiquement.

### MongoDB autonome

L'instance de production est en mode autonome, donc sans transactions.
`transactionOptions: false` est positionné dans la configuration ; les scripts
de seed sont écrits pour être **rejouables** plutôt que transactionnels.

---

## Rapports

| Fichier | Contenu |
|---|---|
| [reports/media-migration.md](reports/media-migration.md) | Les 25 médias migrés, un par ligne |
| [reports/content-migration.md](reports/content-migration.md) | Entités créées et références résolues |
| [reports/security-summary.md](reports/security-summary.md) | Matrice d'accès et mesures |
| [reports/test-results.md](reports/test-results.md) | Résultats de vérification |
| [reports/tbd.md](reports/tbd.md) | Contenus restant à valider avec le client |
| [reports/legacy-hardcoded-content.md](reports/legacy-hardcoded-content.md) | Fichiers qui portaient du contenu en dur |
