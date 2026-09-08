# Cours SwiftUI — transition depuis UIKit

130 fiches, un parcours conseillé et un lecteur avec sauvegarde de progression. Révision pédagogique du 8 septembre 2026, destinée à un développeur ayant déjà livré des apps UIKit.

## Commencer

1. Ouvre [le cours en ligne](https://mobiversegames.com/Tuto-swiftUI-pages/), hébergé sur GitHub Pages. Tu peux aussi récupérer [le lecteur prêt à ouvrir localement](https://github.com/GuillaumeBourlart/Tuto-swiftUI/releases/tag/v2026.09.08).
2. Clique **Commencer mon parcours** : la fiche **00.00** précise ce que tu gardes d’UIKit et l’ordre recommandé.
3. Pour ta question sur les variables qui ouvrent une page, lis **05.04**, puis pratique **05.06** dans Xcode.

Les sources sont sauvegardées dans [GuillaumeBourlart/Tuto-swiftUI](https://github.com/GuillaumeBourlart/Tuto-swiftUI), un dépôt public. Les pages générées sont dans [Tuto-swiftUI-pages](https://github.com/GuillaumeBourlart/Tuto-swiftUI-pages), le dépôt public de publication GitHub Pages. Le site est public ; les notes et la progression restent dans ton navigateur. Supprimer le dossier sur ton Mac ne supprime ni le site ni les dépôts ni l’archive du lecteur.

L’adresse [guillaumebourlart.github.io/Tuto-swiftUI-pages](https://guillaumebourlart.github.io/Tuto-swiftUI-pages/) redirige vers `mobiversegames.com`, domaine déjà configuré pour GitHub Pages sur ce compte.

Pour lire localement, construis le lecteur comme indiqué ci-dessous, puis double-clique sur **`Ouvrir le cours.command`**. Il sert `site/out` sur [http://127.0.0.1:3000](http://127.0.0.1:3000) avec Python 3. Garde sa fenêtre Terminal ouverte ; `Ctrl+C` arrête le serveur.

Tu peux aussi lire directement [le parcours](fiche_00_00_parcours_uikit_vers_swiftui.md) et [la comparaison des navigations](fiche_05_04_navigation_pilotee_par_etat.md) en Markdown.

## Suivi de l’apprentissage

- Statut par fiche : **À faire, En cours, À revoir, Validée**. Une visite ne valide jamais automatiquement.
- Notes enregistrées au fur et à mesure de la saisie.
- **Mémoriser ce passage** sous un titre : repère manuel dans la fiche.
- À l’accueil : **Reprendre**, avancement du parcours et fiches À revoir.
- **Exporter / Importer** : un fichier JSON permet de transférer ou sauvegarder statuts, notes et repères. La fusion conserve pour chaque fiche la version modifiée le plus récemment, notes comprises ; à date identique, la copie locale est conservée.

La progression reste dans le navigateur, pour cette adresse exacte. `localhost:3000`, `127.0.0.1:3000` et une adresse hébergée ont des stockages distincts. Elle n’est pas synchronisée entre appareils. Exporte régulièrement, notamment avant de nettoyer les données du navigateur. Si le stockage est bloqué ou plein, le lecteur affiche une alerte et garde les changements en mémoire : exporte-les avant de fermer.

Avant de changer d’adresse, exporte depuis l’ancienne adresse, puis importe le JSON sur la nouvelle. Conserve les exports dans Téléchargements ou une sauvegarde personnelle, **en dehors du dossier du cours**. Les notes et exports personnels ne sont pas envoyés sur GitHub.

## Retrouver le dossier après sa suppression

Le dépôt contient les 130 fiches, les sources du lecteur, les exemples Swift, les tests et la sauvegarde de la version précédente. Les dépendances et les pages générées se reconstruisent avec Node.js 22 et npm :

```bash
git clone https://github.com/GuillaumeBourlart/Tuto-swiftUI.git
cd Tuto-swiftUI
npm --prefix site ci
npm --prefix site test
npm --prefix site run build
```

Le dépôt étant public, tu peux le cloner sans accès particulier. Sur Mac, ouvre ensuite `Ouvrir le cours.command`. Tu peux aussi récupérer les sources via **Code → Download ZIP** sur GitHub.

La [version du 8 septembre 2026](https://github.com/GuillaumeBourlart/Tuto-swiftUI/releases/tag/v2026.09.08) contient aussi un ZIP du lecteur construit sur GitHub, avec son lanceur Mac. Cette archive reste disponible tant que la version est conservée ; elle permet de lire sans installer npm.

À chaque envoi sur `main` du dépôt des sources, [GitHub Actions](https://github.com/GuillaumeBourlart/Tuto-swiftUI/actions) teste et construit le lecteur sur une machine indépendante. Le résultat `cours-swiftui-site` est téléchargeable pendant 30 jours depuis une exécution réussie. Les sources restent dans le dépôt. Pour actualiser le site public, le script `scripts/publier-github-pages.sh` construit et envoie les pages dans le dépôt public ; GitHub Pages les publie automatiquement. Voir [les instructions de publication](DEPLOIEMENT.md).

## Pratiquer dans Xcode

Les nouveaux exemples ciblent iOS 17 minimum ; leur vérification utilise Xcode 26.6 / Swift 6. Le cours distingue les outils Observation des outils ObservableObject, utiles dans l’existant.

L’[atelier NavigationLab](exemples/NavigationLab/README.md) fournit un fichier `ContentView.swift` autonome à mettre dans un projet iOS App. Les anciennes fiches comportent aussi des extraits qui supposent des types ou services définis ailleurs.

## Bilan et maintenance

- [Bilan de la révision](BILAN_REVISION.md) : points forts, corrections, limites et vérifications.
- [Documentation du lecteur](site/README.md) : développement, reconstruction et tests.
- [Publication et restauration](DEPLOIEMENT.md) : lien en ligne, hébergement et mises à jour.
- `sauvegardes/avant-mise-a-jour-2026-09-08.zip` : fiches et sources du lecteur avant cette révision.

Après une modification des fiches, reconstruis le lecteur pour mettre à jour `site/out`. La progression du navigateur ne fait pas partie des fichiers générés et n’est pas supprimée par une reconstruction.
