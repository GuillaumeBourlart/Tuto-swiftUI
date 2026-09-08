# Publication et restauration

- **Cours en ligne** : https://mobiversegames.com/Tuto-swiftUI-pages/
- **Adresse GitHub Pages** : https://guillaumebourlart.github.io/Tuto-swiftUI-pages/ (redirige vers le domaine ci-dessus).
- **Sources du cours** : https://github.com/GuillaumeBourlart/Tuto-swiftUI
- **Pages générées publiques** : https://github.com/GuillaumeBourlart/Tuto-swiftUI-pages
- **Lecteur prêt à ouvrir** : https://github.com/GuillaumeBourlart/Tuto-swiftUI/releases/tag/v2026.09.08

Le site est hébergé par GitHub Pages, avec HTTPS. Le domaine `mobiversegames.com` était déjà lié au site utilisateur de ce compte ; [GitHub l’applique aussi aux sites de projet](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/about-custom-domains-and-github-pages). Aucun réglage DNS ni ancien hébergement Cloudflare n’a été modifié.

L’offre de ce compte a refusé Pages sur le dépôt des sources. Un dépôt séparé contient uniquement le lecteur publié. Le propriétaire a ensuite choisi de conserver aussi les sources publiques. Le site est consultable par toute personne possédant son adresse. Les notes et la progression ne sont jamais envoyées aux dépôts.

## Mettre le cours à jour

Il faut Git, Node.js 22, npm, GitHub CLI (`gh`) connecté au compte propriétaire et `rsync`.

1. Clone le dépôt des sources complet, ou récupère ses dernières modifications. Les fiches Markdown à la racine sont indispensables à la construction.
2. Modifie les fiches et, au besoin, le lecteur dans `site/`. Vérifie le contenu :

   ```bash
   npm --prefix site ci
   npm --prefix site test
   npm --prefix site run build
   node site/scripts/verifier-export.cjs
   ```

3. Enregistre tes modifications dans Git et envoie-les sur `main` du dépôt des sources. GitHub Actions reconstruit le lecteur pour vérifier que les sources sont complètes.
4. Depuis la racine du dépôt, lance :

   ```bash
   bash scripts/publier-github-pages.sh
   ```

Le script publie **le dernier commit local**, pas les changements encore non enregistrés. Il reconstruit le cours avec le préfixe `/Tuto-swiftUI-pages` dans un dossier temporaire, vérifie les liens, puis envoie uniquement les pages générées sur `main` du dépôt public. Il conserve le lecteur local `site/out/` et utilise l’authentification GitHub existante sans enregistrer de jeton dans les fichiers du projet.

GitHub Pages sert la racine de `main` du dépôt public. Le fichier `.nojekyll` conserve les fichiers `_next/`. Attends la réussite de [pages build and deployment](https://github.com/GuillaumeBourlart/Tuto-swiftUI-pages/actions) avant de considérer la mise à jour comme publiée. Le site reste à la même adresse.

Un simple envoi des sources sur le dépôt des sources lance les vérifications, mais ne publie pas à lui seul dans l’autre dépôt. Aucun secret de déploiement entre dépôts n’a été ajouté.

## Progression personnelle et suppression du dossier

Le site fonctionne indépendamment du Mac. Supprimer le dossier local ne supprime ni les dépôts GitHub ni le site. Pour retrouver les fichiers plus tard, clone le dépôt des sources ou télécharge ses sources ZIP.

La progression reste dans le navigateur pour chaque adresse. Depuis l’ancienne adresse locale, clique **Exporter ma progression**, conserve le JSON hors du dossier à supprimer, puis utilise **Importer une sauvegarde** sur le site en ligne. Continue ensuite à utiliser la même adresse et exporte régulièrement. Les données ne sont pas synchronisées entre appareils.

Lors de la migration du 8 septembre 2026, l’export local dans Téléchargements était vide : aucune progression existante n’était à transférer.

## Restaurer le lecteur local sans npm

Sur le dépôt des sources, ouvre **Releases**, télécharge **Cours-SwiftUI-lecteur-2026-09-08.zip**, extrais le ZIP et ouvre `Ouvrir le cours.command` sur Mac avec Python 3 installé. Le dossier `site/out/` doit rester à côté du lanceur. Cette archive reste disponible tant que la release est conservée.

Pour une construction plus récente, ouvre **Actions**, choisis une exécution réussie de **Vérifier et construire le cours**, puis télécharge **cours-swiftui-site**. Cet export est conservé 30 jours ; une nouvelle exécution manuelle du workflow permet de le reconstruire.

L’export Actions contient directement `index.html` et ses ressources. Extrais-le et sers ce dossier avec `python3 -m http.server 3000 --bind 127.0.0.1`. Le lecteur est conçu pour HTTP, pas pour ouvrir directement `index.html` avec `file://`.

## Ancienne tentative Sites

L’hébergement actif est GitHub Pages. Une tentative de publication privée Sites a échoué avec HTTP 409 pendant l’enregistrement des callbacks d’authentification. Sa configuration est conservée dans `sauvegardes/ancien-hebergement-sites.json`, sans secret ; elle n’est plus utilisée pour publier ce cours.

Références de cet incident, si nécessaire : site `appgprj_6aa047dbafac81919872174f7bdc4f09`, version `appgprj_6aa047dbafac81919872174f7bdc4f09~appgver_3c1b00c6761c819194ddc1fcba1ff1cf`, publication `appgdep_6aa048e52594819182c37dbf8da87533`.
