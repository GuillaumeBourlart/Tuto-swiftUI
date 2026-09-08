# Publication et restauration

- **Cours en ligne** : https://cours-swiftui-guillaume.amused-chub-8467.chatgpt.site
- **Sources privées** : https://github.com/GuillaumeBourlart/Tuto-swiftUI
- **Hébergement** : Sites, accès privé au propriétaire. La connexion au compte propriétaire peut être demandée.
- **Configuration de ce site** : `.openai/hosting.json`, à conserver lors des mises à jour. Elle ne contient aucun secret.

Le serveur `127.0.0.1:3000` dépend du Mac et de son dossier local. Le site hébergé est indépendant : arrêter le serveur ou supprimer le dossier local ne supprime ni ce site ni le dépôt GitHub.

## Mettre le cours à jour

1. Clone le dépôt complet, ou récupère les dernières modifications. Les fichiers Markdown à la racine font partie des sources indispensables.
2. Modifie les fiches et, au besoin, le lecteur dans `site/`.
3. Utilise Node.js 22, puis exécute depuis la racine :

   ```bash
   npm --prefix site ci
   npm --prefix site test
   npm --prefix site run build
   node scripts/preparer-publication.mjs
   ```

4. Enregistre et envoie les sources sur GitHub. GitHub Actions effectue les tests et la construction ; son fichier téléchargeable contient le lecteur statique. Ce workflow ne déploie pas automatiquement sur Sites.
5. Pour actualiser l’adresse hébergée, demande dans Codex de publier ce projet avec Sites en réutilisant le `project_id` existant. Le flux Sites envoie le même état des sources vers son dépôt, prépare une archive du dossier généré `out/`, enregistre la version, puis la publie avec l’accès privé existant. Aucun identifiant d’accès temporaire ne doit être ajouté au dépôt.

`site/out/` est l’export Next.js ; `out/` à la racine est sa copie pour la publication. Ces deux dossiers, les dépendances et les caches sont ignorés par Git. Le script de préparation remplace uniquement la copie générée `out/` à la racine.

## Progression personnelle

La progression est conservée dans le navigateur pour chaque adresse. Elle ne dépend pas du dossier du cours, mais elle n’est pas copiée sur une nouvelle adresse automatiquement et n’est pas synchronisée entre appareils.

Depuis l’ancienne adresse, clique **Exporter ma progression**. Conserve le JSON hors du dossier à supprimer, puis ouvre le cours en ligne et clique **Importer une sauvegarde**. Continue ensuite à utiliser la même adresse. Une mise à jour du site à cette adresse conserve normalement les données du navigateur ; garde néanmoins un export personnel régulier.

## Restaurer sans environnement de développement

Sur GitHub, ouvre **Actions**, choisis une exécution réussie de **Vérifier et construire le cours**, puis télécharge **cours-swiftui-site**. Cet export est conservé 30 jours ; une nouvelle exécution manuelle du workflow permet de le reconstruire à partir du dépôt.

Extrais le ZIP dans un dossier, puis sers ce dossier avec un serveur HTTP statique, par exemple `python3 -m http.server 3000 --bind 127.0.0.1`. Les liens et scripts du lecteur sont conçus pour HTTP, pas pour ouvrir directement `index.html` avec `file://`.
