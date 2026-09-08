# Fiche 02.06 — `@EnvironmentObject` en SwiftUI

> **Famille ObservableObject.** Ces outils restent utiles pour lire l’existant et les projets qui les utilisent. Pour le parcours iOS 17+, commence par [choisir les outils d’état (02.12)](fiche_02_12_choisir_etat_et_bindings.md), puis [Observation (02.11)](fiche_02_11_observable_viewmodel_moderne.md). Les règles de cette fiche concernent les objets `ObservableObject`, pas les objets `@Observable`.

## Objectif

Comprendre à quoi sert `@EnvironmentObject`, comment il permet de partager un objet observable dans plusieurs vues, et quand l’utiliser à la place de `@StateObject`, `@ObservedObject` ou `@Binding`.

---

# 1. L’idée à comprendre

`@EnvironmentObject` permet de partager un objet observable dans une partie de l’application sans devoir le passer manuellement de vue en vue.

Sans `@EnvironmentObject`, tu pourrais devoir faire ça :

```swift
HomeView(session: session)
ProfileView(session: session)
SettingsView(session: session)
AccountView(session: session)
```

Avec `@EnvironmentObject`, tu injectes l’objet une fois au-dessus dans la hiérarchie :

```swift
AppRootView()
    .environmentObject(session)
```

Puis les vues qui en ont besoin le récupèrent directement :

```swift
@EnvironmentObject var session: SessionManager
```

À retenir :

```text
@EnvironmentObject = objet partagé accessible par plusieurs vues descendantes.
```

---

# 2. Code minimal

```swift
@MainActor
final class SessionManager: ObservableObject {
    @Published var isLoggedIn = false // État partagé dans l’app

    func login() {
        isLoggedIn = true
    }

    func logout() {
        isLoggedIn = false
    }
}
```

Injection dans la racine :

```swift
@main
struct SwiftUICourseApp: App {
    @StateObject private var session = SessionManager() // Créé une fois au démarrage

    var body: some Scene {
        WindowGroup {
            AppRootView()
                .environmentObject(session) // Rend session disponible aux vues enfants
        }
    }
}
```

Utilisation dans une vue :

```swift
struct ProfileView: View {
    @EnvironmentObject var session: SessionManager // Récupère l’objet injecté plus haut

    var body: some View {
        Button("Se déconnecter") {
            session.logout()
        }
    }
}
```

---

# 3. Exemple avec une racine d’app

`@EnvironmentObject` est souvent utilisé pour une session utilisateur.

```swift
struct AppRootView: View {
    @EnvironmentObject var session: SessionManager

    var body: some View {
        if session.isLoggedIn {
            MainTabView()
        } else {
            LoginView()
        }
    }
}
```

`LoginView` peut modifier la session :

```swift
struct LoginView: View {
    @EnvironmentObject var session: SessionManager

    var body: some View {
        VStack(spacing: 16) {
            Text("Connexion")
                .font(.title)

            Button("Se connecter") {
                session.login()
            }
            .buttonStyle(.borderedProminent)
        }
        .padding()
    }
}
```

`ProfileView` peut aussi y accéder :

```swift
struct ProfileView: View {
    @EnvironmentObject var session: SessionManager

    var body: some View {
        VStack(spacing: 16) {
            Text("Profil")
                .font(.title)

            Button("Se déconnecter") {
                session.logout()
            }
        }
        .padding()
    }
}
```

Ici, `LoginView`, `ProfileView` et `AppRootView` utilisent le même `SessionManager`.

---

# 4. Exemple avec une TabView

```swift
struct MainTabView: View {
    var body: some View {
        TabView {
            HomeView()
                .tabItem {
                    Label("Accueil", systemImage: "house")
                }

            ProfileView()
                .tabItem {
                    Label("Profil", systemImage: "person")
                }
        }
    }
}
```

Même si `MainTabView` ne transmet pas directement `session`, `ProfileView` peut quand même y accéder avec :

```swift
@EnvironmentObject var session: SessionManager
```

Parce que `session` a été injecté plus haut dans :

```swift
AppRootView()
    .environmentObject(session)
```

---

# 5. Quand utiliser `@EnvironmentObject`

Utilise `@EnvironmentObject` pour des objets partagés par plusieurs vues éloignées.

Exemples fréquents :

```swift
SessionManager
AuthManager
UserManager
ThemeManager
CartManager
AppRouter
AppSettings
```

Cas typiques :

- session utilisateur ;
- état de connexion ;
- profil utilisateur courant ;
- panier dans une app e-commerce ;
- thème global ;
- navigation globale ;
- réglages globaux de l’app.

---

# 6. Quand ne pas utiliser `@EnvironmentObject`

N’utilise pas `@EnvironmentObject` pour tout.

Si la donnée appartient à une seule vue :

```swift
@State private var isShowingSheet = false
```

Si la donnée est seulement transmise à une sous-vue proche :

```swift
@Binding var searchText: String
```

Si une sous-vue reçoit un ViewModel précis :

```swift
@ObservedObject var viewModel: ProfileViewModel
```

`@EnvironmentObject` est surtout utile quand passer l’objet manuellement deviendrait lourd ou répétitif.

---

# 7. `@EnvironmentObject` vs `@StateObject`

`@StateObject` crée et possède l’objet.

```swift
@StateObject private var session = SessionManager()
```

`@EnvironmentObject` récupère un objet injecté plus haut.

```swift
@EnvironmentObject var session: SessionManager
```

Résumé :

```text
Créer et garder l’objet       → @StateObject
Lire un objet partagé injecté → @EnvironmentObject
```

Dans une app, tu peux utiliser les deux ensemble :

```swift
@StateObject private var session = SessionManager()

AppRootView()
    .environmentObject(session)
```

Puis dans les vues :

```swift
@EnvironmentObject var session: SessionManager
```

---

# 8. `@EnvironmentObject` vs `@ObservedObject`

`@ObservedObject` est transmis explicitement :

```swift
ProfileView(viewModel: profileViewModel)
```

`@EnvironmentObject` est récupéré automatiquement depuis l’environnement :

```swift
@EnvironmentObject var session: SessionManager
```

Résumé :

```text
Objet passé directement à une vue       → @ObservedObject
Objet global partagé dans une hiérarchie → @EnvironmentObject
```

---

# 9. Preview avec `@EnvironmentObject`

Si une vue utilise `@EnvironmentObject`, la preview doit fournir l’objet.

```swift
#Preview {
    ProfileView()
        .environmentObject(SessionManager())
}
```

Si tu oublies `.environmentObject(...)`, la preview peut planter au lancement.

Exemple complet :

```swift
#Preview("Connecté") {
    let session = SessionManager()
    session.isLoggedIn = true

    return AppRootView()
        .environmentObject(session)
}
```

Si cette syntaxe pose problème dans Xcode, crée une vue wrapper :

```swift
#Preview {
    AppRootPreviewWrapper()
}

struct AppRootPreviewWrapper: View {
    @StateObject private var session = SessionManager()

    var body: some View {
        AppRootView()
            .environmentObject(session)
            .onAppear {
                session.isLoggedIn = true
            }
    }
}
```

---

# 10. Exemple avec un thème global

`@EnvironmentObject` peut aussi servir pour un thème d’app.

```swift
@MainActor
final class ThemeManager: ObservableObject {
    @Published var isDarkModeEnabled = false
}
```

Injection :

```swift
@main
struct SwiftUICourseApp: App {
    @StateObject private var theme = ThemeManager()

    var body: some Scene {
        WindowGroup {
            AppRootView()
                .environmentObject(theme)
        }
    }
}
```

Utilisation :

```swift
struct ThemeSettingsView: View {
    @EnvironmentObject var theme: ThemeManager

    var body: some View {
        Toggle("Dark mode", isOn: $theme.isDarkModeEnabled)
            .padding()
    }
}
```

---

# 11. Exemple avec un panier

```swift
@MainActor
final class CartManager: ObservableObject {
    @Published var items: [String] = []

    var count: Int {
        items.count
    }

    func add(_ item: String) {
        items.append(item)
    }
}
```

Vue produit :

```swift
struct ProductView: View {
    @EnvironmentObject var cart: CartManager

    var body: some View {
        Button("Ajouter au panier") {
            cart.add("Produit")
        }
    }
}
```

Vue tabbar :

```swift
struct MainTabView: View {
    @EnvironmentObject var cart: CartManager

    var body: some View {
        TabView {
            ProductView()
                .tabItem {
                    Label("Produits", systemImage: "bag")
                }

            Text("Articles : \(cart.count)")
                .tabItem {
                    Label("Panier", systemImage: "cart")
                }
                .badge(cart.count)
        }
    }
}
```

Ici, plusieurs vues utilisent le même `CartManager`.

---

# 12. Points à connaître

## L’objet doit être injecté plus haut

Si une vue déclare :

```swift
@EnvironmentObject var session: SessionManager
```

Alors une vue au-dessus doit faire :

```swift
.environmentObject(session)
```

Sinon l’app peut planter au runtime.

---

## `@EnvironmentObject` crée une dépendance implicite

Avec `@ObservedObject`, tu vois la dépendance dans l’init :

```swift
ProfileView(viewModel: viewModel)
```

Avec `@EnvironmentObject`, la dépendance est moins visible :

```swift
ProfileView()
```

mais la vue a quand même besoin de :

```swift
@EnvironmentObject var session: SessionManager
```

Donc utilise `@EnvironmentObject` pour les vrais objets globaux, pas pour tout.

---

## Évite les EnvironmentObjects trop énormes

Un seul objet global qui contient tout peut devenir difficile à maintenir.

Pas idéal :

```swift
AppManager
  auth
  profile
  settings
  notifications
  cart
  theme
  API
  navigation
```

Préférable : plusieurs objets spécialisés si nécessaire.

Exemple :

```swift
SessionManager
ThemeManager
CartManager
AppRouter
```

---

# Résumé

À retenir :

- `@EnvironmentObject` permet de récupérer un objet partagé injecté plus haut ;
- il évite de passer le même objet manuellement à beaucoup de vues ;
- l’objet doit respecter `ObservableObject` ;
- ses propriétés importantes sont souvent en `@Published` ;
- on crée souvent l’objet avec `@StateObject` dans la racine ;
- on l’injecte avec `.environmentObject(...)` ;
- on le lit avec `@EnvironmentObject` dans les vues enfants ;
- si tu oublies l’injection, l’app ou la preview peut planter ;
- utilise-le pour des objets réellement partagés comme session, thème, panier ou router.

