# Fiche 01.01 — Structure d’une app SwiftUI

## Objectif

Comprendre où démarre une app SwiftUI, comment la première vue est affichée, et quel rôle jouent `@main`, `App`, `WindowGroup` et la vue racine.

---

# 1. L’idée à comprendre

Une app SwiftUI démarre dans une structure marquée avec `@main`.

Cette structure respecte le protocole `App`.

Dans son `body`, elle déclare une scène avec `WindowGroup`.

`WindowGroup` affiche la première vue de l’application.

Schéma simple :

```text
@main
  ↓
App
  ↓
WindowGroup
  ↓
Vue racine
  ↓
Le reste de l’app
```

---

# 2. Code minimal

```swift
import SwiftUI

@main // Point d’entrée de l’application
struct SwiftUICourseApp: App { // Structure principale de l’app
    var body: some Scene { // Une app SwiftUI retourne une Scene, pas une View
        WindowGroup { // Fenêtre principale de l’app
            AppRootView() // Première vue affichée
        }
    }
}
```

---

# 3. Les éléments importants

## `@main`

`@main` indique que cette structure est le point de départ de l’application.

Il ne peut y avoir qu’un seul `@main` dans une app.

---

## `App`

`App` est le protocole qui décrit une application SwiftUI.

Quand tu écris :

```swift
struct SwiftUICourseApp: App
```

Tu dis que `SwiftUICourseApp` représente ton application.

---

## `body: some Scene`

Le `body` d’une app SwiftUI retourne une `Scene`.

Une `Scene` représente un espace d’affichage de ton app.

Sur iPhone, dans la majorité des cas, tu peux retenir que cette scène contient l’écran principal de l’app.

---

## `WindowGroup`

`WindowGroup` contient la première vue affichée.

Exemple :

```swift
WindowGroup {
    AppRootView()
}
```

Ici, SwiftUI lance l’app en affichant `AppRootView`.

---

## `AppRootView`

`AppRootView` n’est pas obligatoire, mais c’est un bon nom pour la vue racine.

Tu pourrais garder `ContentView`, mais `AppRootView` est plus clair quand cette vue sert à décider quel écran afficher au démarrage.

Par exemple :

```swift
struct AppRootView: View {
    var body: some View {
        MainTabView()
    }
}
```

---

# 4. Exemple avec une vraie racine d’app

Dans une vraie app, la vue racine sert souvent à choisir entre plusieurs flows :

- écran de connexion ;
- écran principal ;
- onboarding ;
- écran de chargement initial.

Exemple simplifié :

```swift
struct AppRootView: View {
    @State private var isLoggedIn = false

    var body: some View {
        if isLoggedIn {
            MainTabView() // App principale
        } else {
            LoginView(isLoggedIn: $isLoggedIn) // Flow de connexion
        }
    }
}
```

Ici, `AppRootView` décide quelle partie de l’app afficher selon l’état `isLoggedIn`.

Dans une vraie app, cet état viendrait plutôt d’un `AuthViewModel`, d’un `SessionManager`, de Firebase Auth ou d’une API propriétaire.

---

# 5. Exemple avec une TabView

```swift
struct MainTabView: View {
    var body: some View {
        TabView {
            HomeView()
                .tabItem {
                    Label("Accueil", systemImage: "house")
                }

            SettingsView()
                .tabItem {
                    Label("Réglages", systemImage: "gear")
                }
        }
    }
}
```

`MainTabView` représente ici l’interface principale de l’app après connexion.

---

# 6. Structure de fichiers simple

Pour commencer proprement :

```text
App/
  SwiftUICourseApp.swift
  AppRootView.swift

Features/
  Home/
    HomeView.swift
  Settings/
    SettingsView.swift
```

Cette structure suffit pour une petite app SwiftUI.

Plus tard, on pourra ajouter :

```text
Core/
  Networking/
  Storage/
  DesignSystem/

Features/
  Auth/
  Profile/
  Settings/
```

---

# 7. Cas particulier : ajouter un AppDelegate

Même dans une app SwiftUI, tu peux parfois avoir besoin d’un `AppDelegate`.

C’est utile pour certains SDK ou certaines fonctionnalités système, par exemple Firebase Cloud Messaging.

Exemple :

```swift
import SwiftUI
import UIKit

final class AppDelegate: NSObject, UIApplicationDelegate {
    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
        print("AppDelegate lancé")
        return true
    }
}

@main
struct SwiftUICourseApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) var appDelegate // Lie AppDelegate à SwiftUI

    var body: some Scene {
        WindowGroup {
            AppRootView()
        }
    }
}
```

À retenir : tu peux avoir une app SwiftUI moderne tout en gardant un `AppDelegate` si une fonctionnalité en a besoin.

---

# En UIKit (rappel)

En UIKit, le démarrage n'était pas déclaratif : tu câblais la fenêtre toi-même. Avec un projet récent (depuis iOS 13), c'est `AppDelegate` (cycle de vie app) + `SceneDelegate` (cycle de vie de la fenêtre).

```swift
@main // équivalent de l'ancien UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {
    func application(_ application: UIApplication,
                     didFinishLaunchingWithOptions options: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        return true
    }
}
```

```swift
class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession,
               options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }
        let window = UIWindow(windowScene: windowScene)
        window.rootViewController = AppRootViewController() // 100 % code, pas de Storyboard
        self.window = window
        window.makeKeyAndVisible()
    }
}
```

Si tu utilisais un Storyboard, le `rootViewController` était défini dans `Main.storyboard` (clé « Main Interface » du projet) au lieu d'être instancié à la main.

La différence clé : en UIKit tu crées et configures la `UIWindow` et sa vue racine de façon **impérative**. En SwiftUI tu **déclares** simplement `struct App` + `WindowGroup`, et le système gère la fenêtre pour toi.

👉 En SwiftUI : `@main struct MyApp: App { var body: some Scene { WindowGroup { AppRootView() } } }` remplace tout le câblage `AppDelegate` + `SceneDelegate` + `UIWindow`.

---

# Résumé

Une app SwiftUI démarre généralement comme ça :

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

À retenir :

- `@main` marque le point d’entrée de l’app ;
- `App` décrit l’application ;
- `body` retourne une `Scene` ;
- `WindowGroup` contient la première vue ;
- `AppRootView` est une bonne racine pour décider quoi afficher au lancement ;
- un `AppDelegate` peut encore être ajouté si nécessaire.

