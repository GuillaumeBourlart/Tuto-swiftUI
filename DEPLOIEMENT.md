# Publication et restauration

- **Adresse prévue, pas encore publiée** : https://cours-swiftui-guillaume.amused-chub-8467.chatgpt.site
- **Sources privées** : https://github.com/GuillaumeBourlart/Tuto-swiftUI
- **Lecteur prêt à ouvrir** : https://github.com/GuillaumeBourlart/Tuto-swiftUI/releases/tag/v2026.09.08
- **Hébergement** : Sites, accès privé au propriétaire. La connexion au compte propriétaire peut être demandée.
- **Configuration de ce site** : `.openai/hosting.json`, à conserver lors des mises à jour. Elle ne contient aucun secret.

Le serveur `127.0.0.1:3000` dépend du Mac et de son dossier local. Une fois publié, le site hébergé sera indépendant. Supprimer le dossier local ne supprime pas le dépôt ni le lecteur sauvegardé sur GitHub.

## État de la publication au 8 septembre 2026

Les 172 fichiers initiaux ont été envoyés et comparés à leur copie GitHub. La [construction sur GitHub](https://github.com/GuillaumeBourlart/Tuto-swiftUI/actions/runs/34258519119) a réussi : 9 tests et génération des 130 fiches. Le lecteur de la release provient de cette construction indépendante.

Sites a enregistré la version 1, mais les deux tentatives de publication privée ont échoué avec une erreur interne **HTTP 409 Conflict**, pendant l’enregistrement des callbacks d’authentification. Aucun lien en ligne fonctionnel n’est confirmé. L’accès est resté privé au seul propriétaire.

Informations pour reprendre ou transmettre l’incident au support :

- Site : `appgprj_6aa047dbafac81919872174f7bdc4f09`.
- Version enregistrée : `appgprj_6aa047dbafac81919872174f7bdc4f09~appgver_3c1b00c6761c819194ddc1fcba1ff1cf`.
- Dernière publication échouée : `appgdep_6aa048e52594819182c37dbf8da87533`.
- Erreur renvoyée : `409, message='Conflict'`, service `/service/siwc/sites/clients/oaiapp_A6XFUVblOiztiSyeyXdhBlh0/callbacks`.

Réutiliser ce site et sa version existante pour reprendre la publication lorsque le service est rétabli. Ne pas créer un nouveau site pour contourner cette erreur. Le dépôt GitHub et la release restent utilisables pendant ce blocage.

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

Le plus simple : sur GitHub, ouvre **Releases**, puis télécharge **Cours-SwiftUI-lecteur-2026-09-08.zip**. Extrais le ZIP et ouvre `Ouvrir le cours.command` sur Mac avec Python 3 installé. Le dossier `site/out/` doit rester à côté du lanceur. L’archive de cette release n’a pas la limite de conservation de 30 jours des artifacts Actions.

Pour une construction plus récente, ouvre **Actions**, choisis une exécution réussie de **Vérifier et construire le cours**, puis télécharge **cours-swiftui-site**. Cet export est conservé 30 jours ; une nouvelle exécution manuelle du workflow permet de le reconstruire à partir du dépôt.

Extrais le ZIP dans un dossier, puis sers ce dossier avec un serveur HTTP statique, par exemple `python3 -m http.server 3000 --bind 127.0.0.1`. Les liens et scripts du lecteur sont conçus pour HTTP, pas pour ouvrir directement `index.html` avec `file://`.
