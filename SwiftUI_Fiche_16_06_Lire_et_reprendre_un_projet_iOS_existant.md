# Fiche 16.06 — Lire et reprendre un projet iOS existant

## Objectif

Savoir comment aborder un projet iOS existant quand tu arrives en entreprise.

Dans un vrai job, tu ne crées pas toujours une app de zéro. Tu dois souvent comprendre une base de code déjà en place.

## 1. Méthode en 10 étapes

```text
1. Lire le README
2. Installer les dépendances
3. Lancer le projet
4. Identifier le point d’entrée
5. Comprendre l’architecture
6. Suivre un écran simple
7. Lire les services principaux
8. Mettre un breakpoint
9. Faire une petite modification
10. Ouvrir une PR propre
```

## 2. Lire le README

Le README peut expliquer :

- comment installer le projet ;
- quelles dépendances utiliser ;
- quelle version Xcode ;
- quelles variables de config ;
- comment lancer les tests ;
- comment faire une build.

Ne saute pas cette étape.

## 3. Identifier le point d’entrée

SwiftUI :

```swift
@main
struct MyApp: App {
    var body: some Scene {
        WindowGroup {
            AppRootView()
        }
    }
}
```

UIKit :

```text
AppDelegate
SceneDelegate
RootViewController
```

Le but est de comprendre quel écran s’affiche en premier.

## 4. Comprendre l’architecture

Regarde les dossiers :

```text
Features/
Core/
Shared/
Services/
Data/
Resources/
Tests/
```

Cherche :

- Views ;
- ViewModels ;
- Services ;
- Models ;
- Navigation ;
- API client ;
- Auth ;
- persistance locale.

## 5. Suivre le flux d’un écran

Exemple login :

```text
LoginView
→ LoginViewModel
→ AuthService
→ APIClient / Firebase
→ AuthState
→ Navigation vers Home
```

Essaie toujours de suivre un flux complet de l’UI jusqu’à la donnée.

## 6. Utiliser un breakpoint

Mets un breakpoint dans :

- l’action d’un bouton ;
- le ViewModel ;
- le service ;
- le callback API ;
- la navigation.

Ça permet de comprendre le projet plus vite que lire tous les fichiers.

## 7. Faire une petite modification

Avant de toucher une grosse feature, fais une modification simple :

- changer un label ;
- corriger une validation ;
- ajouter un log ;
- ajuster une cellule ;
- ajouter un test simple.

Tu valides ainsi que tu as compris le build, la structure et le process PR.

## Résumé

- Commence par README, dépendances et lancement.
- Identifie le point d’entrée de l’app.
- Comprends l’architecture par dossier.
- Suis un flux complet UI → ViewModel → service.
- Utilise les breakpoints pour apprendre rapidement.
