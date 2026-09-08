# Fiche 02.08 — `@AppStorage` en SwiftUI

## Objectif

Comprendre à quoi sert `@AppStorage`, comment sauvegarder une petite valeur utilisateur, et dans quels cas l’utiliser à la place de `@State`, `UserDefaults` ou une vraie base locale.

---

# 1. L’idée à comprendre

`@AppStorage` permet de sauvegarder une petite valeur dans `UserDefaults` directement depuis SwiftUI.

Exemple :

```swift
@AppStorage("hasSeenOnboarding") private var hasSeenOnboarding = false
```

Cette valeur est automatiquement persistée.

Donc si l’utilisateur ferme l’app puis la relance, la valeur est conservée.

À retenir :

```text
@State      → valeur temporaire dans une vue
@AppStorage → petite valeur sauvegardée entre les lancements de l’app
```

---

# 2. Code minimal

```swift
struct OnboardingExampleView: View {
    @AppStorage("hasSeenOnboarding") private var hasSeenOnboarding = false // Sauvegardé dans UserDefaults

    var body: some View {
        VStack(spacing: 16) {
            if hasSeenOnboarding {
                Text("Onboarding déjà vu")
            } else {
                Text("Bienvenue dans l’onboarding")
            }

            Button("Marquer comme vu") {
                hasSeenOnboarding = true // La valeur est sauvegardée automatiquement
            }
        }
        .padding()
    }
}
```

Ici, `hasSeenOnboarding` reste à `true` même après fermeture et relance de l’app.

---

# 3. À quoi sert la clé ?

Dans :

```swift
@AppStorage("hasSeenOnboarding") private var hasSeenOnboarding = false
```

`"hasSeenOnboarding"` est la clé utilisée dans `UserDefaults`.

C’est le nom sous lequel la valeur est enregistrée.

Si tu changes la clé, SwiftUI ne retrouvera plus l’ancienne valeur.

Exemple :

```swift
@AppStorage("selectedTheme") private var selectedTheme = "system"
```

Ici, la valeur est stockée sous la clé `selectedTheme`.

---

# 4. Exemple : afficher ou cacher l’onboarding

Cas très courant : afficher l’onboarding seulement la première fois.

```swift
struct AppRootView: View {
    @AppStorage("hasSeenOnboarding") private var hasSeenOnboarding = false

    var body: some View {
        if hasSeenOnboarding {
            MainTabView()
        } else {
            OnboardingView()
        }
    }
}
```

Puis dans l’onboarding :

```swift
struct OnboardingView: View {
    @AppStorage("hasSeenOnboarding") private var hasSeenOnboarding = false

    var body: some View {
        VStack(spacing: 16) {
            Text("Bienvenue")
                .font(.largeTitle)

            Text("Découvre les principales fonctionnalités de l’app.")
                .multilineTextAlignment(.center)

            Button("Commencer") {
                hasSeenOnboarding = true
            }
            .buttonStyle(.borderedProminent)
        }
        .padding()
    }
}
```

Quand l’utilisateur appuie sur “Commencer”, la valeur est sauvegardée et l’app peut afficher `MainTabView`.

---

# 5. Exemple : préférence de thème

Tu peux sauvegarder un choix de thème.

```swift
struct ThemeSettingsView: View {
    @AppStorage("selectedTheme") private var selectedTheme = "system"

    var body: some View {
        Picker("Thème", selection: $selectedTheme) {
            Text("Système").tag("system")
            Text("Clair").tag("light")
            Text("Sombre").tag("dark")
        }
        .pickerStyle(.segmented)
        .padding()
    }
}
```

La valeur `selectedTheme` est conservée après redémarrage de l’app.

Tu peux ensuite t’en servir dans la racine de l’app :

```swift
struct AppRootView: View {
    @AppStorage("selectedTheme") private var selectedTheme = "system"

    var body: some View {
        MainTabView()
            .preferredColorScheme(colorScheme)
    }

    private var colorScheme: ColorScheme? {
        switch selectedTheme {
        case "light":
            return .light
        case "dark":
            return .dark
        default:
            return nil // nil = suivre le système
        }
    }
}
```

---

# 6. Exemple : dernier onglet sélectionné

`@AppStorage` peut sauvegarder le dernier onglet ouvert.

```swift
struct MainTabView: View {
    @AppStorage("selectedTab") private var selectedTab = 0

    var body: some View {
        TabView(selection: $selectedTab) {
            HomeView()
                .tabItem {
                    Label("Accueil", systemImage: "house")
                }
                .tag(0)

            SettingsView()
                .tabItem {
                    Label("Réglages", systemImage: "gear")
                }
                .tag(1)
        }
    }
}
```

Si l’utilisateur quitte l’app sur l’onglet Réglages, tu peux le ramener sur cet onglet au prochain lancement.

---

# 7. Types compatibles

`@AppStorage` fonctionne bien avec des types simples :

```swift
@AppStorage("username") private var username = ""
@AppStorage("launchCount") private var launchCount = 0
@AppStorage("isPremium") private var isPremium = false
@AppStorage("volume") private var volume = 0.5
@AppStorage("selectedTheme") private var selectedTheme = "system"
```

Types courants :

- `String` ;
- `Int` ;
- `Double` ;
- `Bool` ;
- `URL` ;
- `Data`.

Pour des données complexes, ce n’est généralement pas le bon outil.

---

# 8. Quand utiliser `@AppStorage`

Utilise `@AppStorage` pour de petites préférences utilisateur.

Exemples :

```text
Onboarding déjà vu
Thème choisi
Dernier onglet sélectionné
Préférence de notification locale
Tri choisi dans une liste
Mode compact activé
Nombre de lancements de l’app
```

Exemples de variables :

```swift
@AppStorage("hasSeenOnboarding") private var hasSeenOnboarding = false
@AppStorage("sortOption") private var sortOption = "date"
@AppStorage("useCompactMode") private var useCompactMode = false
```

---

# 9. Quand ne pas utiliser `@AppStorage`

N’utilise pas `@AppStorage` pour :

- des tokens sensibles ;
- un mot de passe ;
- des données utilisateur privées ;
- des listes complexes ;
- des objets liés entre eux ;
- un cache API important ;
- des données qui doivent être requêtées/filtrées ;
- des données qui nécessitent des migrations.

Pour ces cas :

```text
Token sensible              → Keychain
Données complexes locales   → SwiftData ou Core Data
Cache structuré             → base locale ou cache disque dédié
Session complète            → AuthManager / SessionManager
```

---

# 10. `@AppStorage` vs `@State`

`@State` disparaît quand la vue disparaît ou quand l’app est relancée.

```swift
@State private var searchText = ""
```

`@AppStorage` sauvegarde la valeur dans `UserDefaults`.

```swift
@AppStorage("searchText") private var searchText = ""
```

Résumé :

```text
Valeur temporaire locale                  → @State
Petite valeur à conserver après relance   → @AppStorage
```

---

# 11. `@AppStorage` vs `UserDefaults`

Sans `@AppStorage`, tu pourrais écrire :

```swift
UserDefaults.standard.set(true, forKey: "hasSeenOnboarding")
let hasSeenOnboarding = UserDefaults.standard.bool(forKey: "hasSeenOnboarding")
```

Avec `@AppStorage`, SwiftUI simplifie le code :

```swift
@AppStorage("hasSeenOnboarding") private var hasSeenOnboarding = false
```

Et la vue se met à jour automatiquement quand la valeur change.

`@AppStorage` est donc une intégration SwiftUI pratique autour de `UserDefaults`.

---

# 12. Centraliser les clés

Évite de répéter des chaînes de caractères partout.

Pas idéal :

```swift
@AppStorage("hasSeenOnboarding") private var hasSeenOnboarding = false
@AppStorage("hasSeenOnboarding") private var onboardingSeen = false
```

Préférable :

```swift
enum AppStorageKeys {
    static let hasSeenOnboarding = "hasSeenOnboarding"
    static let selectedTheme = "selectedTheme"
    static let selectedTab = "selectedTab"
}
```

Puis :

```swift
@AppStorage(AppStorageKeys.hasSeenOnboarding) private var hasSeenOnboarding = false
```

Cela évite les fautes de frappe dans les clés.

---

# 13. Points à connaître

## `@AppStorage` est lié à `UserDefaults`

Ce n’est pas une base de données.

C’est pratique pour de petites valeurs, pas pour stocker toute l’app.

---

## Ne stocke pas de données sensibles avec `@AppStorage`

`UserDefaults` n’est pas fait pour stocker des secrets.

Pour un access token ou refresh token, utilise plutôt le Keychain.

---

## Changer une clé revient à perdre l’accès à l’ancienne valeur

Si tu remplaces :

```swift
@AppStorage("selectedTheme")
```

par :

```swift
@AppStorage("theme")
```

ce n’est plus la même valeur stockée.

---

# Résumé

À retenir :

- `@AppStorage` sauvegarde une petite valeur dans `UserDefaults` ;
- la valeur est conservée après fermeture de l’app ;
- c’est pratique pour onboarding, thème, dernier onglet, préférences simples ;
- `@AppStorage` fonctionne surtout avec des types simples ;
- pour une valeur temporaire, utilise `@State` ;
- pour un token sensible, utilise le Keychain ;
- pour des données complexes, utilise SwiftData, Core Data ou une autre persistance adaptée ;
- centralise les clés pour éviter les fautes de frappe.

