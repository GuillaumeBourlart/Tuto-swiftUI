# Fiche 17.01 — Structure du mini projet final

## Objectif

Définir la structure d’un mini projet final qui rassemble les notions utiles pour un poste SwiftUI : UI, MVVM, API, Firebase, persistance, tests et debug.

Le projet final ne doit pas être énorme. Il doit prouver que tu sais construire une app propre.

## 1. Idée du projet

Exemple de projet final :

```text
Mini app de catalogue avec authentification
```

Fonctionnalités :

- login/register ;
- home avec liste chargée depuis une API ;
- écran détail ;
- favoris locaux ;
- profil utilisateur ;
- upload image de profil ;
- notification simple ;
- tests ViewModel/service ;
- Crashlytics / logs.

## 2. Structure des dossiers

```text
App/
├── MyApp.swift
├── AppRootView.swift

Features/
├── Auth/
│   ├── LoginView.swift
│   ├── RegisterView.swift
│   ├── AuthViewModel.swift
│   └── AuthService.swift
├── Home/
│   ├── HomeView.swift
│   ├── HomeViewModel.swift
│   └── ItemRowView.swift
├── Detail/
├── Profile/
├── Favorites/

Shared/
├── DesignSystem/
├── Components/
├── Models/

Core/
├── Networking/
├── Persistence/
├── Firebase/
├── Keychain/
├── Logging/
```

Cette structure est simple, lisible et proche d’un vrai projet.

## 3. Flux principal

```text
AppRootView
→ si connecté : MainTabView
→ sinon : AuthView
```

Exemple :

```swift
struct AppRootView: View {
    @StateObject private var authState = AuthState()

    var body: some View {
        Group {
            if authState.isAuthenticated {
                MainTabView()
            } else {
                LoginView()
            }
        }
        .environmentObject(authState)
    }
}
```

## 4. Architecture d’une feature

Exemple Home :

```text
HomeView
→ HomeViewModel
→ ItemsServiceProtocol
→ APIClient
→ URLSession / Alamofire
```

Le ViewModel gère :

- loading ;
- données ;
- erreur ;
- refresh ;
- action utilisateur.

## 5. Données locales

Persistance prévue :

```text
AppStorage → onboarding ou préférence simple
Keychain → tokens
Core Data → favoris ou cache local
```

Pas besoin d’une base locale énorme. Un système de favoris suffit pour montrer la compétence.

## 6. Firebase

Firebase peut servir pour :

- Auth ;
- Firestore profil utilisateur ;
- Storage image de profil ;
- Crashlytics ;
- FCM en intro.

Le projet doit montrer que tu sais intégrer un backend réel.

## 7. Tests prévus

Minimum utile :

```text
AuthViewModelTests
HomeViewModelTests
APIClientTests avec mock
ValidationTests
```

Pas besoin de tout tester. Il faut tester les logiques importantes.

## Résumé

- Le projet final doit rester petit mais complet.
- Il doit montrer SwiftUI, MVVM, API, auth, Firebase, persistance, tests et debug.
- Une structure par feature rend le projet lisible.
- Les favoris locaux et l’auth suffisent à montrer une app réaliste.
