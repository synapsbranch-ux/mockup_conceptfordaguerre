# Prototype — Jacques-Daguerre Valcy

Prototype Next.js du portfolio professionnel de Jacques-Daguerre Valcy et de l’offre de services Datakle.

## Pages et modules

- Accueil
- À propos
- Réalisations et fiches projet dynamiques
- Services Datakle
- Blog et articles dynamiques
- Contact
- Engagement social
- Informations légales
- Prototype d’espace utilisateur
- Prototype de micro CMS
- Newsletter et liens sociaux dans le pied de page

Vingt-cinq images sélectionnées dans le dossier Google Drive du projet sont stockées localement dans `public/images/daguerre`. Elles sont redimensionnées, débarrassées des métadonnées inutiles et converties en WebP. Les champs qui demandent encore une validation client sont explicitement signalés dans l’interface.

## Lancer le projet

```bash
npm install
npm run dev
```

Puis ouvrir `http://localhost:3000`.

Pour télécharger de nouveau les 25 sources Drive et régénérer les images WebP :

```bash
npm run images:optimize
```

## Vérifier la version de production

```bash
npm run build
npm start
```

## État du prototype

Les formulaires, l’authentification, le CMS, la newsletter et Calendly sont représentés visuellement. Ils devront être connectés aux services retenus pendant la phase de développement.
