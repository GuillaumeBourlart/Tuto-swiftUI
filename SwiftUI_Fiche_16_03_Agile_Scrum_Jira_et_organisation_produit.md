# Fiche 16.03 — Agile, Scrum, Jira et organisation produit

## Objectif

Comprendre le vocabulaire d’organisation qu’on retrouve dans beaucoup d’équipes iOS : Agile, Scrum, sprint, ticket, backlog, PO, QA et critères d’acceptation.

Ce n’est pas du code, mais c’est très demandé en entreprise.

## 1. Agile

Agile est une manière de travailler par petites itérations plutôt que de tout prévoir pendant des mois.

L’idée :

```text
développer une petite partie
→ tester
→ recevoir du feedback
→ améliorer
```

## 2. Scrum en version simple

Scrum est une méthode Agile très utilisée.

Vocabulaire :

```text
Sprint → période de travail, souvent 1 ou 2 semaines
Daily → point rapide quotidien
Backlog → liste des tâches à faire
Sprint planning → choix des tâches du sprint
Review → démonstration du travail fait
Retrospective → amélioration de l’organisation d’équipe
```

## 3. Ticket / User Story

Un ticket décrit une tâche à faire.

Exemple :

```text
En tant qu’utilisateur,
je veux pouvoir me connecter avec mon email,
afin d’accéder à mon compte.
```

C’est une user story.

## 4. Critères d’acceptation

Les critères d’acceptation disent quand la tâche est terminée.

Exemple :

```text
- L’utilisateur peut saisir email et mot de passe
- Le bouton est désactivé si les champs sont vides
- Un loader apparaît pendant la connexion
- Une erreur s’affiche si la connexion échoue
- L’utilisateur est redirigé vers Home si la connexion réussit
```

Avant de coder, il faut comprendre ces critères.

## 5. Rôles fréquents

```text
PO / Product Owner → priorise les besoins produit
Designer UI/UX → fournit les maquettes
Backend developer → fournit les API
QA → teste l’app
Tech Lead → aide sur les choix techniques
Scrum Master → facilite l’organisation Agile
```

En tant que développeur iOS, tu échanges souvent avec produit, design, backend et QA.

## 6. Jira / Linear / Trello

Jira est un outil pour suivre les tickets.

Un ticket peut passer par des statuts :

```text
To Do → In Progress → Code Review → QA → Done
```

Ton objectif : garder ton ticket à jour et signaler les blocages rapidement.

## 7. Ce qu’on attend de toi

En entreprise, on attend souvent que tu sois capable de :

- comprendre un ticket ;
- poser une question si ce n’est pas clair ;
- découper une tâche trop grosse ;
- prévenir si tu es bloqué ;
- faire une PR propre ;
- tester ton travail avant de demander une review.

## Résumé

- Agile travaille par petites itérations.
- Scrum utilise souvent des sprints, daily, planning, review et retrospective.
- Un ticket doit avoir un objectif clair et des critères d’acceptation.
- Le développeur iOS travaille avec PO, QA, backend et design.
