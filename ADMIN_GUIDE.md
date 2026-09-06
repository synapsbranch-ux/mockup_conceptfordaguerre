# Guide d'administration

Ce guide s'adresse aux personnes qui exploitent le site au quotidien. Il décrit
ce que fait chaque écran, ce que le système garantit tout seul, et les
procédures à connaître avant d'en avoir besoin.

---

## 1. Les deux zones d'administration

Le site a **deux** interfaces réservées, complémentaires :

| Zone | Adresse | Rôle |
|---|---|---|
| Tableau de bord | `/admin` | Pilotage quotidien : compteurs, files d'attente, actions |
| Panneau CMS | `/cms` | Édition de fond : pages, blocs, champs, versions, médias |

Le tableau de bord montre **ce qui appelle une action**. Le CMS sert à
**créer et modifier** le contenu. La plupart des écrans du tableau de bord
renvoient vers la fiche CMS correspondante.

> Le panneau CMS était auparavant sur `/admin`. Les anciens liens profonds
> (`/admin/collections/...`) sont redirigés automatiquement vers `/cms/...`.

---

## 2. Comptes et rôles

### Les trois rôles

| Rôle | Ce qu'il peut faire |
|---|---|
| `customer` | Son espace client uniquement. Rôle attribué automatiquement à toute inscription. |
| `editor` | Tout le tableau de bord et le CMS. Ne peut pas créer de super-administrateur. |
| `super-admin` | Idem, plus l'attribution du rôle `super-admin` et les réglages de facturation. |

**Personne ne choisit son rôle.** Le champ est refusé côté serveur à
l'inscription : une requête qui transporte `role: "super-admin"` crée malgré
tout un compte `customer`. Seul un administrateur peut changer un rôle, depuis
`/admin/clients`.

Un rôle inconnu ou absent est traité comme `customer`. Le privilège n'est
jamais accordé par défaut.

### Protections que vous ne pouvez pas contourner

Ces règles sont appliquées par le serveur, et c'est délibéré :

- **Le site conserve toujours au moins un administrateur actif.** Rétrograder,
  suspendre ou supprimer le dernier est refusé. Un administrateur suspendu ou
  désactivé ne compte pas comme actif — suspendre l'avant-dernier puis
  rétrograder le dernier est donc également refusé.
- **Personne ne modifie son propre rôle ni son propre statut**, y compris un
  super-administrateur. Demandez à un collègue.
- **Seul un super-administrateur attribue le rôle `super-admin`.**

Si une action est refusée, le motif exact s'affiche. Ce n'est pas un bogue.

### Suspendre un compte

Depuis `/admin/clients` :

- **Suspendre** retire l'accès à l'espace client et le droit de publier. La
  personne peut encore se connecter, mais arrive sur une page l'informant de la
  suspension.
- **Bloquer le forum** retire le seul droit de publier dans la communauté. La
  lecture reste possible et l'espace client reste accessible. C'est la sanction
  proportionnée pour un problème de modération.

Les deux actions sont journalisées et notifient la personne concernée.

---

## 3. Relation client

### Demandes de devis (`/admin/devis`)

Cycle de vie : `brouillon` → `envoyée` → `en cours d'étude` → `proposition
envoyée` → `acceptée` / `refusée` → `close`.

Les brouillons appartiennent au client et ne sont pas listés par défaut : ils ne
vous ont pas été transmis. Les transitions interdites sont refusées par le
serveur — on ne peut pas faire passer une demande de « brouillon » à
« acceptée ».

Une demande peut arriver **sans compte**, depuis `/devis`. Elle porte alors une
adresse courriel plutôt qu'un client. Elle pourra être rattachée plus tard au
compte de la personne, si elle s'inscrit avec la même adresse vérifiée.

### Propositions (`/admin/propositions`)

Les propositions se créent et s'éditent dans le CMS.

**Deux règles importantes :**

1. **Les totaux sont calculés par le serveur.** Vous saisissez des lignes
   (désignation, quantité, prix unitaire en **centimes**, taux de taxe). Les
   sous-totaux, remises, taxes et total sont recalculés à chaque
   enregistrement. Il n'y a pas de champ « total » à remplir.

2. **Une proposition envoyée est définitive.** Dès son passage à « envoyée »,
   lignes, remise, devise, conditions et objet sont figés. Toute tentative de
   modification est refusée. Pour corriger, créez une nouvelle version.

   C'est ce qui garantit que le document accepté par le client correspond
   exactement à ce qu'il a accepté.

Quand le client accepte, un **projet est créé automatiquement**, une seule fois.
Une seconde conversion est impossible, même en cas de double clic.

### Factures (`/admin/factures`)

Mêmes principes : totaux serveur, et **une facture émise ne se réécrit pas**.
Pour corriger, annulez-la — l'historique est conservé — et émettez-en une
nouvelle.

Le **numéro est attribué automatiquement** et ne peut pas être réutilisé, même
si l'émission échoue ensuite. Un trou dans la numérotation est normal et
préférable à un doublon comptable. Le format se règle dans
`/cms/globals/billingSettings`.

Les **notes internes** d'une facture ne figurent jamais sur le PDF ni dans
l'espace client. Vous pouvez y écrire librement.

Les paiements se consignent depuis `/admin/paiements`. Le site **ne traite aucun
encaissement** et ne conserve aucune donnée bancaire : il enregistre un
règlement constaté ailleurs.

### Conversations (`/admin/conversations`)

Les notes internes vivent dans une **collection séparée** (`internalNotes`, via
le CMS), jamais dans le fil de discussion. C'est volontaire : un champ « interne »
sur un document client finit tôt ou tard par fuiter.

Répondre à une conversation fermée la rouvre automatiquement.

---

## 4. Rendez-vous

### Mettre la réservation en service

Trois éléments sont nécessaires, dans cet ordre — sans eux, aucun créneau n'est
proposé :

1. **Un format de rencontre** (`/cms/collections/meetingTypes`) : durée, temps
   tampon, préavis minimal, horizon de réservation, et l'**hôte** dont le
   calendrier est consulté.
2. **Des plages hebdomadaires** (`/cms/collections/availabilityRules`) : jour,
   heures de début et de fin, et **fuseau horaire**.
3. Optionnellement, des **exceptions** (`/cms/collections/availabilityExceptions`)
   pour bloquer une date ou ouvrir une plage exceptionnelle.

L'écran `/admin/disponibilites` récapitule les trois.

### Ce que le système garantit

- **Les heures que vous saisissez sont locales à l'hôte.** « Lundi 9 h » reste
  9 h à Montréal toute l'année : la conversion en UTC est recalculée pour chaque
  date et suit les changements d'heure.
- **Aucun double booking n'est possible.** La contrainte est posée en base, pas
  dans l'interface : deux réservations simultanées du même créneau ne peuvent
  pas aboutir toutes les deux.
- **Annuler libère le créneau**, qui redevient réservable.

### Confirmer

Si le format exige une confirmation manuelle, les demandes arrivent en « à
confirmer » sur `/admin/rendez-vous`. Confirmer envoie un courriel au client
avec une invitation calendrier.

Si l'envoi échoue, **l'interface le dit** : « statut mis à jour, courriel non
envoyé ». Le rendez-vous est bien enregistré ; c'est la notification qui a
échoué. Prévenez alors la personne autrement.

---

## 5. Documents

Trois visibilités :

| Visibilité | Qui y accède |
|---|---|
| Publique | Tout le monde, y compris sans compte. Listée sur `/ressources`. |
| Comptes connectés | Toute personne connectée. |
| Clients désignés | Uniquement les comptes que vous listez. **Valeur par défaut.** |

La valeur par défaut est la plus restrictive : un document ne devient jamais
public par inadvertance.

Un document réservé à d'autres clients est **invisible** pour les autres — pas
seulement masqué : une requête directe sur son identifiant répond « introuvable ».

Le téléversement se fait dans le CMS (`/cms/collections/documents`). Taille
maximale : 25 Mo.

---

## 6. Communauté

### Commentaires (`/admin/commentaires`)

Le mode de modération se règle globalement dans
`/cms/globals/communitySettings`, et peut être surchargé article par article :

- **Publication immédiate** : le commentaire paraît aussitôt.
- **Prémodération** : il attend votre validation.

Actions disponibles : publier, masquer, restaurer, marquer comme indésirable.
Un commentaire masqué n'est pas supprimé.

### Forum (`/admin/forum/...`)

Catégories, discussions et signalements ont chacun leur écran. Vous pouvez
épingler, verrouiller, marquer comme résolue, masquer ou archiver une
discussion.

Les règles du forum et sa présentation sur la page d'accueil se règlent dans
`/cms/globals/communitySettings`. Décocher « Forum ouvert » retire le forum du
site public et ferme la publication **sans rien supprimer**.

### Sécurité du contenu

Tout texte écrit par un visiteur — commentaire, discussion, message — est rendu
en texte, jamais interprété comme du code. Un contenu malveillant s'affiche
littéralement au lieu de s'exécuter. Vous n'avez pas à filtrer manuellement.

---

## 7. Infolettre

Les abonnés sont dans `/admin/infolettre/abonnes`. **Seuls les abonnés
confirmés** reçoivent une campagne : une inscription non confirmée ne compte
pas.

Les campagnes (`/admin/infolettre/campagnes`) suivent une règle stricte :

- **Une campagne envoyée est définitive.** Ni renvoi, ni retour en brouillon, ni
  modification du contenu. Un double clic ne peut pas produire un second envoi.
- Le nombre de destinataires est **constaté à l'envoi**, jamais estimé d'avance.

Si l'envoi de courriels n'est pas configuré, l'écran le signale avant que vous
ne rédigiez.

---

## 8. Journal d'activité

`/admin/journal` conserve les actions sensibles : changements de rôle,
suspensions, modération, documents, devis, factures, rendez-vous.

Le journal est en **ajout seul** — ni modification ni suppression, y compris
pour un super-administrateur. Un journal qu'on peut réécrire ne prouve rien.

Aucune adresse IP n'y est conservée.

---

## 9. Sauvegarde et restauration

> À lire **avant** d'en avoir besoin. Les procédures ci-dessous supposent
> `mongodump` et `mongorestore` installés localement.

### Sauvegarder

```bash
# Sauvegarde complète, horodatée
mongodump --uri="$DATABASE_URI" --out="sauvegarde-$(date +%Y%m%d-%H%M)"
```

La base contient **tout** : contenu, comptes, documents, et les binaires GridFS
(collections `media.files` / `media.chunks`). Une sauvegarde de la base suffit
donc à tout restaurer.

Conservez-en une copie **hors de l'hébergement**. Une sauvegarde stockée à côté
de la base disparaît avec elle.

### Restaurer

```bash
# Restauration dans la base existante, en écrasant
mongorestore --uri="$DATABASE_URI" --drop sauvegarde-20260906-1200/daguerre_cms
```

`--drop` supprime chaque collection avant de la réécrire. **Vérifiez d'abord la
cible** : lancée sur la production avec une sauvegarde ancienne, la commande
détruit tout ce qui a été fait depuis.

### Vérifier une sauvegarde

Restaurez-la dans une base jetable et comparez les volumes :

```bash
mongorestore --uri="${DATABASE_URI%/*}/verification" sauvegarde-20260906-1200/daguerre_cms
```

Une sauvegarde jamais restaurée n'est pas une sauvegarde.

### Après restauration

Rejouez la création des index qui ne sont pas déclarés dans la configuration :

```bash
npm run db:ensure-indexes
```

Sans cela, la protection contre les doubles réservations et l'unicité des
numéros de facture seraient absentes — silencieusement.

---

## 10. Reprise des comptes existants

Le site est passé de l'authentification native de Payload à Better Auth. Les
empreintes de mots de passe ne sont **pas transposables** entre les deux : les
comptes créés avant la migration ne peuvent pas se connecter avec leur ancien
mot de passe.

Deux voies, au choix :

**A — Connexion Google.** Renseignez `GOOGLE_CLIENT_ID` et
`GOOGLE_CLIENT_SECRET`, listez les adresses concernées dans
`MIGRATION_VERIFIED_EMAILS`, puis :

```bash
npm run auth:migrate            # aperçu, n'écrit rien
npm run auth:migrate -- --apply # applique
```

**B — Nouveaux identifiants.**

```bash
npm run payload:bootstrap-admin
```

Le script rattache de nouveaux identifiants au compte existant. L'identifiant
technique ne change pas : devis, projets, documents et conversations restent
liés.

Faites une sauvegarde avant. Le script est rejouable sans effet de bord.

---

## 11. En cas de problème

| Symptôme | Piste |
|---|---|
| Aucun créneau proposé | Vérifiez format actif, plages hebdomadaires, préavis minimal, et qu'aucune exception ne bloque la période |
| Courriels non reçus | `/admin/parametres` indique si Resend est configuré. Sinon, les envois sont signalés comme non effectués, jamais simulés |
| Bouton Google absent | `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` non renseignés |
| « Dernier administrateur » | Comportement voulu. Promouvez un second compte d'abord |
| Proposition non modifiable | Elle a été envoyée. Créez une nouvelle version |
| Facture non modifiable | Elle a été émise. Annulez-la et émettez-en une nouvelle |
| Numéros de facture non consécutifs | Normal : un numéro réservé n'est jamais réutilisé |

L'écran `/admin/parametres` affiche l'état réel des trois intégrations
(courriels, connexion Google, limitation de débit partagée). Consultez-le avant
de chercher plus loin.
