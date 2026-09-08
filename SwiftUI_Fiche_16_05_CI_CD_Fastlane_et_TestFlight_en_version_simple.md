# Fiche 16.05 — CI/CD, Fastlane et TestFlight en version simple

## Objectif

Comprendre le principe de CI/CD mobile, Fastlane et TestFlight sans rentrer dans une configuration avancée.

Le but est de savoir expliquer le workflow professionnel.

## 1. CI/CD veut dire quoi ?

CI/CD signifie :

```text
Continuous Integration / Continuous Delivery
```

En pratique :

```text
tu push ton code
→ une machine build l’app
→ les tests se lancent
→ une archive peut être générée
→ la build peut partir sur TestFlight
```

## 2. Pourquoi c’est utile ?

La CI/CD évite de tout faire à la main.

Elle permet :

- de vérifier que le projet compile ;
- de lancer les tests ;
- de détecter vite les erreurs ;
- de distribuer une build aux testeurs ;
- de standardiser le process d’équipe.

## 3. Outils fréquents

```text
GitHub Actions
GitLab CI
Bitrise
Jenkins
Fastlane
```

Tu n’as pas besoin de tous les maîtriser. Il faut comprendre le principe.

## 4. Fastlane

Fastlane automatise les tâches iOS répétitives.

Exemples :

```text
build app
lancer tests
gérer screenshots
créer archive
upload TestFlight
upload App Store
```

Commande typique :

```bash
fastlane beta
```

Selon la configuration, cette commande peut lancer :

```text
build → archive → upload TestFlight
```

## 5. TestFlight dans le workflow

TestFlight sert à envoyer une build à des testeurs.

Workflow simple :

```text
merge branche
→ CI build l’app
→ upload TestFlight
→ QA teste
→ bugs corrigés
→ nouvelle build
```

## 6. Ce qu’il faut savoir dire

> Je comprends le principe CI/CD : à chaque push ou merge, une pipeline peut compiler l’app, lancer les tests et préparer une build TestFlight. Je ne suis pas expert Fastlane, mais je sais à quoi ça sert et je peux suivre une configuration existante.

## 7. Ce qui suffit pour ton niveau

À ton niveau, tu dois surtout comprendre :

- ce qu’est une pipeline ;
- pourquoi les tests tournent automatiquement ;
- à quoi sert Fastlane ;
- comment TestFlight s’intègre dans le process ;
- comment lire un échec de build simple.

## Résumé

- CI/CD automatise build, tests et distribution.
- Fastlane automatise les tâches iOS répétitives.
- TestFlight sert à distribuer une app aux testeurs.
- Pas besoin d’être expert, mais il faut comprendre le workflow.
