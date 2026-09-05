# Contenus restant à valider avec le client

Aucune de ces informations n'a été inventée. Chacune était déjà signalée comme
provisoire dans le prototype, ou manquait purement et simplement. Toutes sont
désormais **éditables dans le CMS** : la mise à jour ne demande aucune
intervention sur le code.

---

## 1. Biographie et parcours

| Information | Où la corriger | État actuel |
|---|---|---|
| Note exacte du MBA | Pages → À propos → bloc « Portrait et biographie » → encart « à compléter » | Encart affiché : « Note exacte du MBA, titre et réalisations chez Desjardins, dates du parcours et courte mention du mentor Yvan Blaise. » |
| Titre et réalisations chez Desjardins | idem | idem |
| Dates du parcours | idem | idem |
| Mention du mentor Yvan Blaise | idem | Mentionné dans l'engagement « Éducation & mentorat », à étoffer si souhaité |
| Légende du diplôme MBA | Pages → À propos → bloc « Jalons » | « MBA spécialisé en analytique d'affaires — détails à confirmer. » |

---

## 2. Datakle

| Information | Où la corriger | État actuel |
|---|---|---|
| Raison sociale officielle | Pages → Services → bloc « Mention administrative » | « Raison sociale officielle et détails administratifs de Datakle à confirmer avant la mise en production. » |
| Détails administratifs | idem | idem |

---

## 3. Coordonnées et réseaux

| Information | Où la corriger | État actuel |
|---|---|---|
| URL LinkedIn | Réglages du site → Réseaux sociaux | vide, affiché « à confirmer » |
| URL GitHub | idem | vide, affiché « à confirmer » |
| URL Medium | idem | vide, affiché « à confirmer » |
| URL YouTube | idem | vide, affiché « à confirmer » |
| URL Instagram | idem | vide, affiché « à confirmer » |
| Lien de prise de rendez-vous (Calendly) | Réglages du site → Contact → « Lien de prise de rendez-vous » | vide ; la page Contact affiche « Lien Calendly à confirmer » |

Renseigner une URL suffit : la mention « à confirmer » disparaît
automatiquement et le lien devient actif.

---

## 4. Informations légales

| Information | Où la corriger | État actuel |
|---|---|---|
| Identité légale du responsable | Pages → Informations légales → bloc « Contenu juridique » → section 05 | « L'identité officielle du responsable de la protection des renseignements et l'adresse de contact doivent être confirmées. » |
| Juridiction applicable | idem → encart « Avertissement » | « Version de travail — à réviser selon la juridiction, les outils réellement utilisés et l'identité légale du responsable. » |
| Fournisseurs techniques | idem → section 02 | « Les fournisseurs techniques, durées de conservation et mesures de protection seront précisés avant la mise en production. » |
| Durées de conservation | idem | idem |
| Date de dernière mise à jour | idem → champ « Dernière mise à jour » | non renseignée |

**Ces textes constituent un prototype et doivent être revus par un
professionnel du droit avant mise en production.**

---

## 5. Projets

| Information | Où la corriger | État actuel |
|---|---|---|
| Résultats chiffrés des 5 projets | Projets → onglet « Étude de cas » → champ « Résultats » | Mention affichée sous chaque résultat : « Résultats chiffrés à confirmer avant publication. » |
| Client ou organisation | Projets → onglet « Présentation » → champ « Client ou organisation » | vide sur les 5 projets, à ne renseigner que si l'information est publiable |
| Date du projet | idem → champ « Date du projet » | vide sur les 5 projets |

Vider le champ « Mention sous les résultats » fait disparaître l'avertissement
une fois les chiffres validés.

---

## 6. Articles du blog

Les cinq articles portent le **texte prototype d'origine**, identique pour
chacun, repris tel quel depuis `src/pages/blog/[slug].js`. Chaque article
affiche l'encart « Brouillon de démonstration · Contenu à enrichir dans le CMS. »

| Article | Slug |
|---|---|
| Comment la data peut aider Haïti | `comment-la-data-peut-aider-haiti` |
| Mon parcours MBA en analytique d'affaires | `mon-parcours-mba` |
| Ce que j'ai appris en fondant Datakle | `fonder-datakle` |
| La visualisation comme outil de décision | `visualisation-outil-decision` |
| Mes projets VBA expliqués simplement | `projets-vba-simplement` |

Les cinq portent également la date affichée « À paraître » (champ « Date
affichée », onglet latéral). La remplacer par une date réelle, ou vider le champ
pour que la date de publication s'affiche automatiquement.

Le chapeau de chaque article mentionne encore « validé dans le micro CMS » —
formulation héritée du prototype, à reformuler maintenant que le CMS est réel.

---

## 7. Autres mentions provisoires

| Mention | Emplacement |
|---|---|
| « Interface de démonstration — authentification à connecter. » | Pages → Espace utilisateur |
| « Les résultats chiffrés seront ajoutés après validation du client. » | Pages → Réalisations → introduction |
| « 05 perspectives à venir » | Pages → Blog → bloc « Tous les articles » → mention à droite du surtitre |
| « DATAKLE / 2026 » | Pied de page → Bandeau visuel |
| « © 2026 Jacques-Daguerre Valcy » | Pied de page → Mentions, et Réglages du site |

---

## 8. Éléments non fournis, volontairement laissés vides

- **Crédits photo.** Le champ « Crédit / photographe » de chaque média est vide :
  l'origine des 25 visuels n'est documentée nulle part dans le dépôt.
- **Configuration analytique.** Réglages du site → Analytique, fournisseur
  « Aucun ». Aucun script de mesure n'est chargé tant qu'un identifiant n'est
  pas renseigné.
- **Adaptateur de courriel.** Aucun fournisseur SMTP configuré ; nécessaire pour
  la réinitialisation de mot de passe et les notifications de formulaire.

---

## 9. Textes alternatifs rédigés pendant la migration

Onze des 25 images n'avaient **aucun** texte alternatif dans le prototype : les
composants les rendaient avec `alt=""`. Les descriptions ont été rédigées à
partir des images elles-mêmes et sont modifiables dans la bibliothèque de
médias. Elles décrivent ce que montre l'image, sans affirmer d'information
biographique non documentée.

Concernées : `hero-executive`, `mba-achievement`, `agronomy-foundation`,
`economics-specialization`, `monitoring-evaluation`, `rigorous-research`,
`analytical-strategy`, `efficiency-optimization`, `decision-support-realtime`,
`powerbi-project`, `access-excel-automation`.

Le détail figure dans [media-migration.md](media-migration.md), colonne « Alt ».
