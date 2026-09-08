# Fiche 06.04 — Organisation des dossiers par feature

## Objectif

Savoir organiser un projet SwiftUI de façon lisible pour une vraie app. L’objectif est de retrouver rapidement les fichiers, isoler les features et éviter un dossier géant rempli de vues mélangées.

## 1. Pourquoi organiser par feature ?

Un projet iOS peut vite contenir beaucoup de fichiers : vues, ViewModels, services, modèles, composants, tests, assets, extensions.

Une organisation par type peut donner :

```text
Views/
ViewModels/
Models/
Services/
```

C’est simple au début, mais quand le projet grossit, tous les fichiers sont éloignés de leur feature.

Une organisation par feature regroupe ce qui appartient au même écran ou domaine.

## 2. Structure recommandée

```text
MyApp/
├── App/
│   ├── MyApp.swift
│   └── AppRootView.swift
│
├── Features/
│   ├── Auth/
│   │   ├── LoginView.swift
│   │   ├── LoginViewModel.swift
│   │   ├── RegisterView.swift
│   │   └── AuthService.swift
│   │
│   ├── Home/
│   │   ├── HomeView.swift
│   │   ├── HomeViewModel.swift
│   │   └── HomeService.swift
│   │
│   └── Profile/
│       ├── ProfileView.swift
│       ├── ProfileViewModel.swift
│       └── ProfileService.swift
│
├── Shared/
│   ├── Components/
│   ├── DesignSystem/
│   └── Extensions/
│
└── Core/
    ├── Network/
    ├── Storage/
    ├── Auth/
    └── Utils/
```

## 3. Dossier App

Le dossier `App` contient l’entrée de l’application.

```text
App/
├── MyApp.swift
├── AppRootView.swift
└── MainTabView.swift
```

`AppRootView` décide souvent si on affiche :

- login ;
- onboarding ;
- app principale ;
- écran de maintenance ;
- chargement session.

## 4. Dossier Features

Chaque feature contient ses fichiers principaux.

```text
Features/Auth/
├── LoginView.swift
├── LoginViewModel.swift
├── RegisterView.swift
├── ForgotPasswordView.swift
└── AuthService.swift
```

Si une feature devient très grosse, tu peux créer des sous-dossiers :

```text
Features/Auth/
├── Views/
├── ViewModels/
├── Models/
└── Services/
```

Mais au début, inutile de trop découper.

## 5. Dossier Shared

`Shared` contient ce qui est réutilisable dans plusieurs features.

```text
Shared/
├── Components/
│   ├── PrimaryButton.swift
│   ├── EmptyStateView.swift
│   └── LoadingView.swift
│
├── DesignSystem/
│   ├── AppColors.swift
│   ├── AppSpacing.swift
│   └── AppTypography.swift
│
└── Extensions/
    ├── View+Extensions.swift
    └── String+Extensions.swift
```

Une règle simple : si c’est utilisé par plusieurs features, ça peut aller dans `Shared`.

## 6. Dossier Core

`Core` contient les briques techniques globales.

```text
Core/
├── Network/
│   ├── APIClient.swift
│   └── APIError.swift
│
├── Storage/
│   ├── KeychainService.swift
│   └── LocalFileService.swift
│
├── Auth/
│   └── AuthSession.swift
│
└── Utils/
    └── Logger.swift
```

Ces fichiers ne sont pas liés à un seul écran.

## 7. Exemple concret pour Login

```text
Features/Auth/Login/
├── LoginView.swift
├── LoginViewModel.swift
└── LoginValidation.swift
```

`LoginView` : affiche.

`LoginViewModel` : gère l’état et appelle le service.

`LoginValidation` : optionnel si la validation devient longue.

## 8. Piège à éviter

Ne crée pas trop de dossiers vides ou inutiles.

Mauvais réflexe :

```text
Domain/
Data/
Presentation/
UseCases/
Repositories/
Entities/
Mappers/
DTO/
```

Pour une petite app, ça peut devenir trop lourd.

Commence simple, puis structure davantage si le projet grossit.

## Résumé

- Organiser par feature rend le projet plus lisible.
- `App` contient l’entrée de l’app.
- `Features` contient les écrans et leur logique.
- `Shared` contient les composants réutilisables.
- `Core` contient les briques techniques globales.
- Il faut éviter la sur-architecture dès le départ.
