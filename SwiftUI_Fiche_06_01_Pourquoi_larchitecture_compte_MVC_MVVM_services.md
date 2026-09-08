# Fiche 06.01 — Pourquoi l’architecture compte : MVC, MVVM, services

## Objectif

Comprendre pourquoi il faut organiser le code d’une app iOS, même en SwiftUI. L’objectif n’est pas d’appliquer une architecture compliquée, mais d’éviter les vues énormes, difficiles à tester et impossibles à maintenir.

## 1. Le problème d’une View qui fait tout

Dans une petite démo, on peut mettre beaucoup de code dans une vue. Dans une vraie app, ça devient vite illisible.

Exemple à éviter :

```swift
struct LoginView: View {
    @State private var email = ""
    @State private var password = ""
    @State private var isLoading = false
    @State private var errorMessage: String?

    var body: some View {
        VStack {
            // UI
        }
        .onAppear {
            // appel API
            // parsing JSON
            // stockage token
            // navigation
            // logs
        }
    }
}
```

La vue finit par gérer :

- l’affichage ;
- la validation ;
- le réseau ;
- la navigation ;
- la persistance ;
- les erreurs ;
- les tests deviennent difficiles.

## 2. Rôle d’une View

Une View SwiftUI doit surtout :

- afficher l’état ;
- récupérer les actions utilisateur ;
- déclencher des méthodes du ViewModel ;
- rester lisible.

```swift
Button("Connexion") {
    Task {
        await viewModel.login()
    }
}
```

La vue ne devrait pas contenir toute la logique de connexion.

## 3. Rôle d’un ViewModel

Le ViewModel prépare les données pour la vue et gère la logique d’écran.

Il peut contenir :

- `email`, `password` ;
- `isLoading` ;
- `errorMessage` ;
- `isFormValid` ;
- méthode `login()` ;
- appel au service d’auth.

```swift
@MainActor
final class LoginViewModel: ObservableObject {
    @Published var email = ""
    @Published var password = ""
    @Published var isLoading = false
    @Published var errorMessage: String?

    var isFormValid: Bool {
        email.contains("@") && password.count >= 8
    }
}
```

## 4. Rôle d’un service

Un service s’occupe d’un domaine technique ou métier :

- `AuthService` : connexion, inscription, logout ;
- `UserService` : profil utilisateur ;
- `APIClient` : réseau ;
- `StorageService` : upload image ;
- `LocationService` : localisation.

Le service évite de mettre du réseau ou Firebase directement dans le ViewModel.

```swift
protocol AuthServiceProtocol {
    func login(email: String, password: String) async throws -> User
}
```

## 5. MVC rapidement

MVC signifie : Model, View, Controller.

Dans UIKit, on voit souvent :

```text
ViewController
→ gère la vue
→ reçoit les actions
→ appelle les services
→ met à jour l’interface
```

Le risque du MVC UIKit est d’avoir des `UIViewController` énormes.

En SwiftUI, il n’y a pas toujours de `ViewController`, mais on peut reproduire le même problème si les Views deviennent trop grosses.

## 6. MVVM simplement

MVVM signifie : Model, View, ViewModel.

```text
View
→ affiche l’état
→ appelle le ViewModel

ViewModel
→ contient l’état de l’écran
→ gère la logique de présentation
→ appelle les services

Service
→ fait le réseau, Firebase, Core Data, etc.
```

Flux simple :

```text
Button tap
→ ViewModel.login()
→ AuthService.login()
→ ViewModel met à jour isLoading / error / user
→ View se met à jour automatiquement
```

## 7. Architecture utile, pas architecture parfaite

Le but n’est pas de créer 15 couches partout. Pour une petite feature, MVVM + service suffit.

Une architecture est bonne si elle permet :

- de lire facilement le code ;
- de tester la logique ;
- de remplacer un service par un mock ;
- d’éviter les vues énormes ;
- de modifier une feature sans casser toute l’app.

## Résumé

- Une View doit afficher, pas tout gérer.
- Le ViewModel contient l’état et la logique de l’écran.
- Les services gèrent le réseau, Firebase, stockage, localisation, etc.
- MVVM est très adapté à SwiftUI.
- L’objectif est un code lisible, testable et maintenable.
