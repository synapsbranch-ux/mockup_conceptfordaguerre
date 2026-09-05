# Synthèse sécurité et contrôle d'accès

Portfolio Jacques-Daguerre Valcy — Payload CMS 3 sur Next.js 16.

---

## 1. Matrice d'accès

| Ressource | Anonyme | `editor` | `super-admin` |
|---|---|---|---|
| Pages, projets, articles, services, engagements **publiés** | lire | lire + écrire | tout |
| Idem, **brouillons** | ✗ | lire + écrire | tout |
| Médias | lire | téléverser, éditer, supprimer | tout |
| Réglages du site, En-tête, Pied de page | lire | éditer | éditer |
| `contactSubmissions` | ✗ (création via `/api/contact` uniquement) | lire + éditer | tout, y compris supprimer |
| `newsletterSubscribers` | ✗ (création via `/api/newsletter` uniquement) | lire + éditer | tout, y compris supprimer |
| `users` | ✗ | **son propre compte uniquement** | tout |

Vérifié par les scénarios 15 à 18 de `scripts/acceptance.mjs`.

### Comment les brouillons sont protégés

`authenticatedOrPublished` renvoie une clause `Where` — `{ _status: { equals:
'published' } }` — et non un simple booléen. La restriction est donc appliquée
**dans la requête MongoDB** : un visiteur anonyme ne peut atteindre un brouillon
ni par URL, ni par identifiant, ni par filtre sur l'API REST.

### Cloisonnement des rôles

- La création de compte est réservée aux super-administrateurs
  (`usersCreate`). **Aucune inscription publique n'existe.**
- Un éditeur ne voit que son propre compte : `usersRead` renvoie
  `{ id: { equals: user.id } }`. L'existence même des super-administrateurs lui
  est masquée.
- Les champs `role` et `active` portent un contrôle d'accès **au niveau du
  champ** (`superAdminFieldOnly`) : un éditeur ne peut pas s'auto-promouvoir,
  même en forgeant la requête.
- Un super-administrateur ne peut pas supprimer son propre compte.
- Un compte désactivé (`active: false`) est refusé à la connexion par le hook
  `beforeLogin`.

---

## 2. Points d'entrée publics

Trois routes acceptent des données non authentifiées.

| Route | Protection |
|---|---|
| `POST /api/contact` | pot de miel, délai minimal, limitation de débit, validation, assainissement |
| `POST /api/newsletter` | idem, plus unicité de l'adresse |
| `GET /api/preview` | secret **et** session Payload valide, cumulés |
| `POST /api/revalidate` | secret **ou** session Payload valide |

### Pourquoi les formulaires ne passent pas par l'API REST

Les collections `contactSubmissions` et `newsletterSubscribers` déclarent
`create: authenticated`. Un `POST` anonyme sur `/api/contactSubmissions` reçoit
donc **403**. Le public passe par les routes dédiées, qui valident puis écrivent
avec `overrideAccess` — ce qui garantit qu'aucune soumission n'échappe au pot de
miel, au délai minimal ni à la limitation de débit.

### Détection des soumissions automatisées

Deux signaux cumulés :

1. **Pot de miel** — un champ `company` invisible et hors du parcours clavier
   (`tabIndex={-1}`, `aria-hidden`). Un humain ne le remplit jamais.
2. **Délai minimal** — moins de 1,2 s entre l'affichage et l'envoi.

Une soumission détectée reçoit une réponse **identique à un succès**, pour ne
rien apprendre à son auteur.

### Limitation de débit

5 soumissions par tranche de 15 minutes et par appelant, sur chacune des deux
routes. Redis lorsque `REDIS_URL` est défini — compteur partagé entre instances.
Sinon, repli en mémoire, **valable pour une seule instance**.

L'adresse IP n'est jamais stockée en clair : la clé Redis est un condensat
SHA-256 tronqué, et l'adresse n'est ni journalisée ni conservée en base.

Vérifié par le scénario 21 : 5 requêtes acceptées puis 3 bloquées en 429.

---

## 3. Données personnelles

- **Aucune adresse IP ni empreinte de navigateur** n'est conservée avec les
  soumissions. Champs stockés : nom, courriel, organisation, sujet, message,
  consentement, horodatage, statut, notes internes.
- Le consentement est obligatoire à la soumission et enregistré.
- Les erreurs serveur ne renvoient jamais le détail au client : il pourrait
  contenir la saisie. Le contenu des messages n'est pas journalisé.
- Les mots de passe sont stockés hachés et salés par Payload ; vérifié en base.

---

## 4. Téléversements

| Contrôle | Valeur |
|---|---|
| Formats acceptés | `image/jpeg`, `image/png`, `image/webp`, `image/avif` |
| **SVG** | **refusé** — peut porter du script |
| Taille maximale | 8 Mo, `abortOnLimit` actif |
| Sortie | WebP pour toutes les déclinaisons |
| Texte alternatif | obligatoire, minimum 5 caractères |

Un média référencé par du contenu publié ne peut pas être supprimé : le hook
`beforeDelete` recherche les références dans toutes les collections et globals,
et bloque avec la liste des contenus concernés.

---

## 5. Injection et contenu éditorial

Les éditeurs **ne peuvent pas saisir de HTML, de CSS ni de code** :

- Les titres sont des segments typés (texte + deux booléens), jamais du HTML.
- Les variantes visuelles sont des listes fermées, jamais des classes libres.
- Les destinations de lien sont validées : seuls `/`, `#`, `mailto:`, `tel:`,
  `http:` et `https:` sont acceptés. `javascript:` et `data:` sont refusés.
- Le sérialiseur Lexical ne rend **que** les types de nœuds attendus. Un nœud
  inconnu est ignoré. Les URLs de lien y sont revalidées au rendu.
- React échappe tout le texte ; aucun `dangerouslySetInnerHTML` ne subsiste
  (le prototype en utilisait un pour les titres de page).

Les saisies publiques sont assainies : caractères de contrôle retirés, longueurs
bornées, espaces normalisés, adresses courriel validées par motif.

---

## 6. Configuration

| Élément | État |
|---|---|
| CORS | restreint à `NEXT_PUBLIC_SERVER_URL` |
| CSRF | même liste d'origines |
| GraphQL Playground | désactivé en production |
| `PAYLOAD_SECRET` | généré localement, jamais commité |
| `.env` | couvert par `.gitignore`, vérifié par `git check-ignore` |
| `.admin-credentials.local` | ignoré, permissions `600` |
| `.env.example` | livré avec toutes les valeurs **vides** |

**Aucun secret de production n'est présent dans le dépôt.** Vérifiable :

```bash
git status --short           # .env absent de la liste
git check-ignore -v .env     # confirme l'exclusion
```

---

## 7. Dépendances

`npm audit` au terme de l'intégration : **0 vulnérabilité haute ou critique.**

Deux arbitrages ont été nécessaires :

- **Next.js.** Payload 3.88 exclut la ligne 15.5 de ses `peerDependencies`, et
  la 15.4.11 — seule version 15 compatible — porte 10 vulnérabilités hautes non
  corrigées (contournement middleware, SSRF via Server Actions, DoS Server
  Components). Next **16.3.4** est la seule version satisfaisant à la fois la
  contrainte Payload et l'absence d'avis connu. Retenue après arbitrage explicite.
- **sharp.** Monté en 0.35.4 pour corriger quatre CVE héritées de libvips.

Restent 9 avis de sévérité modérée et 1 faible, tous transitifs et sans correctif
amont disponible à ce jour.

---

## 8. Limites connues

1. **Limitation de débit en mémoire** si `REDIS_URL` est absent : le compteur
   n'est alors pas partagé entre instances. Renseigner `REDIS_URL` en production
   multi-instances.
2. **L'identification de l'appelant repose sur `X-Forwarded-For`.** Elle n'est
   fiable que derrière un proxy de confiance qui réécrit cet en-tête. Sans quoi
   la limitation de débit est contournable.
3. **Aucun adaptateur de courriel n'est configuré.** Payload journalise les
   courriels en console. La réinitialisation de mot de passe et les
   notifications de formulaire nécessiteront un fournisseur SMTP.
4. **L'espace utilisateur (`/space`) reste une maquette.** Aucune authentification
   client n'est branchée, conformément au périmètre demandé.
5. **Le mode GridFS ne place pas de CDN devant les images.** Voir le README pour
   le compromis et la bascule vers S3.
