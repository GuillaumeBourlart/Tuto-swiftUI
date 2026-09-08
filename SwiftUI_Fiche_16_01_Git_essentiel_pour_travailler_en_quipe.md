# Fiche 16.01 — Git essentiel pour travailler en équipe

## Objectif

Connaître les commandes Git indispensables pour travailler sur un projet iOS en équipe.

Tu n’as pas besoin d’être expert Git, mais tu dois être à l’aise avec le workflow classique : branche, commit, push, pull request.

## 1. Workflow classique

```text
clone projet
→ créer une branche
→ coder
→ commit
→ push
→ pull request
→ review
→ merge
```

## 2. Commandes de base

```bash
git clone https://github.com/company/app-ios.git
```

Récupère le projet distant sur ton ordinateur.

```bash
git status
```

Montre les fichiers modifiés.

```bash
git add .
```

Prépare tous les fichiers modifiés pour le commit.

```bash
git commit -m "Add login screen"
```

Crée un point d’historique avec un message.

```bash
git push
```

Envoie tes commits sur le serveur distant.

```bash
git pull
```

Récupère les changements des autres.

## 3. Branches

Créer une branche :

```bash
git checkout -b feature/login-screen
```

Changer de branche :

```bash
git checkout main
```

Lister les branches :

```bash
git branch
```

Une branche permet de travailler sans casser `main` ou `develop`.

## 4. Remote

```bash
git remote -v
```

Affiche l’URL du dépôt distant.

Exemple :

```text
origin  https://github.com/company/app-ios.git
```

`origin` est souvent le nom du dépôt distant principal.

## 5. Voir les changements

```bash
git diff
```

Montre les modifications avant commit.

```bash
git log --oneline
```

Affiche l’historique des commits.

## 6. Merge et conflits

Un conflit arrive quand deux personnes modifient la même zone de code.

Méthode simple :

```text
1. Lire les deux versions
2. Garder le bon code
3. Supprimer les marqueurs de conflit
4. Relancer les tests/build
5. Commit la résolution
```

Marqueurs typiques :

```text
<<<<<<< HEAD
Ton code
=======
Code distant
>>>>>>> branch-name
```

## 7. Bonnes pratiques simples

- fais des commits petits et clairs ;
- évite les messages “fix” ou “test” sans contexte ;
- pull avant de commencer une grosse tâche ;
- ne commit pas les secrets ;
- vérifie ton diff avant commit ;
- ne travaille pas directement sur `main`.

## Résumé

- `clone` récupère un projet.
- `add` prépare les fichiers.
- `commit` enregistre un changement.
- `pull` récupère les changements distants.
- `push` envoie tes commits.
- `branch` isole ton travail.
- Une pull request sert à faire relire ton code.
