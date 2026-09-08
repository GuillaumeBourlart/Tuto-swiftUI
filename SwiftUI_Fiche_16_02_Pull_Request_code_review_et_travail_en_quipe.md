# Fiche 16.02 — Pull Request, code review et travail en équipe

## Objectif

Comprendre comment fonctionne une Pull Request et comment travailler proprement avec une équipe iOS.

En entreprise, tu ne pousses généralement pas directement sur la branche principale.

## 1. Pull Request / Merge Request

Une Pull Request sert à proposer tes changements à l’équipe.

```text
feature/login-screen
→ Pull Request
→ review
→ corrections éventuelles
→ merge dans develop ou main
```

Sur GitLab, on dit souvent Merge Request. Le principe est le même.

## 2. Contenu d’une bonne PR

Une PR doit expliquer :

- pourquoi elle existe ;
- ce qui a été changé ;
- comment tester ;
- les points à surveiller.

Exemple :

```text
Objectif :
Ajout de l’écran de connexion SwiftUI.

Changements :
- Création de LoginView
- Création de LoginViewModel
- Validation email/password
- Gestion loading/error

Tests :
- Test manuel du formulaire
- Test du bouton désactivé si formulaire invalide
- Test erreur mauvais mot de passe
```

## 3. Code review

La code review sert à améliorer le code avant fusion.

Un reviewer peut demander :

- simplification ;
- meilleure organisation ;
- renommage ;
- ajout de test ;
- correction d’un bug ;
- meilleure gestion d’erreur.

Ce n’est pas une attaque personnelle. C’est normal en équipe.

## 4. Répondre à une review

Bonne attitude :

```text
- comprendre le commentaire
- poser une question si ce n’est pas clair
- corriger proprement
- répondre calmement
- pousser un nouveau commit
```

Exemple de réponse :

```text
Corrigé, j’ai déplacé la validation dans le ViewModel et ajouté un test unitaire.
```

## 5. Taille d’une PR

Une PR doit rester raisonnable.

Mauvais :

```text
1 PR avec login + profil + navigation + refactor complet + Firebase
```

Mieux :

```text
PR 1 → LoginView + ViewModel
PR 2 → AuthService
PR 3 → Navigation après login
```

Plus une PR est petite, plus elle est facile à relire.

## 6. Checklist avant PR

```text
- Le projet compile
- L’écran fonctionne manuellement
- Les tests passent si présents
- Pas de print inutile
- Pas de secret dans le code
- Code formaté
- Noms compréhensibles
- PR expliquée clairement
```

## Résumé

- Une PR propose ton code à la review.
- La review améliore la qualité et limite les bugs.
- Une bonne PR est claire, testable et pas trop grosse.
- Il faut savoir recevoir les retours calmement et corriger proprement.
