# Fiche 09.02 — UserDefaults et AppStorage

## Objectif

Comprendre comment sauvegarder de petites valeurs locales avec `UserDefaults` et `@AppStorage`.

Ces outils sont pratiques pour les préférences simples, mais pas pour les données sensibles.

## 1. UserDefaults

`UserDefaults` permet de stocker de petites valeurs persistantes.

```swift
UserDefaults.standard.set(true, forKey: "hasSeenOnboarding")
let hasSeenOnboarding = UserDefaults.standard.bool(forKey: "hasSeenOnboarding")
```

C’est simple, mais si tu l’utilises partout directement, les clés deviennent vite difficiles à maintenir.

## 2. Centraliser les clés

```swift
enum UserDefaultsKeys {
    static let hasSeenOnboarding = "hasSeenOnboarding"
    static let selectedTab = "selectedTab"
    static let preferredTheme = "preferredTheme"
}
```

Utilisation :

```swift
UserDefaults.standard.set(true, forKey: UserDefaultsKeys.hasSeenOnboarding)
```

Ça évite les fautes de frappe dans les clés.

## 3. @AppStorage

`@AppStorage` est la version SwiftUI pratique de `UserDefaults`.

```swift
import SwiftUI

struct OnboardingGateView: View {
    @AppStorage("hasSeenOnboarding") private var hasSeenOnboarding = false
    
    var body: some View {
        if hasSeenOnboarding {
            MainView()
        } else {
            OnboardingView {
                hasSeenOnboarding = true
            }
        }
    }
}
```

Quand la valeur change, SwiftUI met automatiquement l’interface à jour.

## 4. Exemple : dernier onglet sélectionné

```swift
struct MainTabView: View {
    @AppStorage("selectedTab") private var selectedTab = 0
    
    var body: some View {
        TabView(selection: $selectedTab) {
            HomeView()
                .tabItem { Label("Accueil", systemImage: "house") }
                .tag(0)
            
            ProfileView()
                .tabItem { Label("Profil", systemImage: "person") }
                .tag(1)
        }
    }
}
```

L’utilisateur revient automatiquement sur le dernier onglet utilisé.

## 5. Exemple : préférence de thème

```swift
enum AppTheme: String {
    case system
    case light
    case dark
}

struct SettingsView: View {
    @AppStorage("theme") private var theme = AppTheme.system.rawValue
    
    var body: some View {
        Picker("Thème", selection: $theme) {
            Text("Système").tag(AppTheme.system.rawValue)
            Text("Clair").tag(AppTheme.light.rawValue)
            Text("Sombre").tag(AppTheme.dark.rawValue)
        }
    }
}
```

`@AppStorage` stocke facilement des `String`, `Bool`, `Int`, `Double`, etc.

## 6. Ce qu’il ne faut pas stocker dedans

À ne jamais mettre dans `UserDefaults` ou `@AppStorage` :

- access token ;
- refresh token ;
- mot de passe ;
- données bancaires ;
- données privées sensibles.

Même si ce stockage est persistant, il n’est pas fait pour protéger des secrets.

## Résumé

- `UserDefaults` stocke de petites valeurs simples.
- `@AppStorage` est pratique dans SwiftUI.
- Il faut centraliser les clés.
- C’est parfait pour onboarding, thème, dernier onglet ou préférences.
- Les tokens et secrets doivent aller dans le Keychain.
