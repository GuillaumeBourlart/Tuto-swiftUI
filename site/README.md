# Lecteur du cours SwiftUI

Site Next.js 14 / React 18 / TypeScript / Tailwind, exporté statiquement. Il lit les fiches Markdown du dossier parent ; le registre `lib/sommaire.ts` et `lib/learning-path.ts` définissent la bibliothèque et le parcours conseillé. Les dépendances et le fichier lock existants sont conservés.

## Lire le cours

Le [lecteur prêt à ouvrir](https://github.com/GuillaumeBourlart/Tuto-swiftUI/releases/tag/v2026.09.08) est sauvegardé sur GitHub. La publication en ligne reste bloquée par une erreur du service Sites ; voir [publication et restauration](../DEPLOIEMENT.md) pour l’état précis et la reprise.

Le script `../Ouvrir le cours.command` sert `out/` avec Python sur **http://127.0.0.1:3000**. Il ouvre la version construite, sans dépendance npm au moment de la lecture. Une seule instance du serveur doit utiliser ce port.

## Développer et construire

Depuis ce dossier, avec un Node.js fonctionnel :

```bash
npm ci
npm run dev -- --hostname 127.0.0.1
```

Les dépendances sont déjà présentes sur ce Mac : ne réinstalle que si nécessaire. Sur ce poste, Node via nvm fonctionne ; l’ancien Node Homebrew peut échouer à cause de sa bibliothèque ICU. Si `npm` utilise le mauvais runtime, active ton environnement nvm avant ces commandes.

```bash
npm test
npm run typecheck
npm run build
```

L’export est dans `out/`, y compris `/exemples/NavigationLab/ContentView.swift`. Pour mettre à jour l’atelier, synchronise le bloc de la fiche 05.06 et `public/exemples/NavigationLab/ContentView.swift` avec le fichier canonique `../exemples/NavigationLab/ContentView.swift` ; le script Swift vérifie cette égalité.

Les fontes système évitent une dépendance réseau lors du build. `npm run start` sert la version statique avec Python, comme le lanceur. Il n’utilise pas `next start`, incompatible avec cet export statique.

## Sauvegarde de progression

`localStorage`, clé `swiftui-cours.progress.v1`, schéma version 1 : `entries[slug]` contient statut, notes, repère et date de modification ; `lastVisited` contient la dernière fiche. Les écritures sont déclenchées après hydratation, jamais lors du rendu serveur. Une page visitée devient En cours seulement si aucune entrée n’existe encore.

Export/import JSON validé (taille, version, statuts, identifiants, notes et dates). Les fiches inconnues sont ignorées. La fusion retient la version la plus récente de chaque fiche et protège une copie locale plus récente. Les onglets du même navigateur se mettent à jour via l’événement `storage`. Cela ne constitue pas une synchronisation entre appareils ni une fusion caractère par caractère des notes.

Un fichier invalide est refusé ; un stockage inaccessible ou invalide n’est pas écrasé silencieusement. Les changements restent en mémoire avec une alerte et peuvent être exportés. Si la clé locale est corrompue, conserve un export et une copie brute de la clé avant toute réparation manuelle des données du navigateur.

## Vérifications

`npm test` contrôle l’aller-retour JSON, la fusion, les cas invalides, les liens Markdown locaux, l’unicité du registre et le parcours. `npm run typecheck` contrôle TypeScript. `npm run build` contrôle la génération des pages.

Depuis le dossier parent :

```bash
python3 scripts/verifier_exemples.py
```

Vérification des types de six ensembles d’exemples Swift autonomes, cible simulateur iOS 17, Swift 6, avec le Xcode installé. Cela ne compile pas tous les anciens extraits du cours et ne remplace pas les essais sur simulateur.

## Ajouter une fiche

Ajoute le Markdown dans le dossier parent et son entrée dans `lib/sommaire.ts`. Ajoute son slug au parcours seulement si elle fait partie de la progression conseillée. Les liens Markdown vers les fiches sont convertis vers les pages du lecteur ; les titres de section portent des repères stables dérivés de leur texte. Modifier un titre déjà mémorisé peut invalider son ancien repère.

L’hébergement Sites est configuré à la racine dans `../.openai/hosting.json`. Après le build, `node ../scripts/preparer-publication.mjs` copie l’export vers `../out/` pour la publication. Pour reconstruire depuis un dépôt, il faut inclure **le dossier parent avec les fiches**, pas uniquement `site/`. Importe ta progression sur la nouvelle adresse après un export local.
