# Fiche 11.01 — Installer Firebase dans une app SwiftUI

## Objectif

Savoir installer Firebase dans une app SwiftUI et comprendre les fichiers/configurations nécessaires.

## 1. Étapes générales

```text
1. Créer un projet Firebase
2. Ajouter une app iOS dans Firebase
3. Renseigner le Bundle Identifier
4. Télécharger GoogleService-Info.plist
5. Ajouter Firebase via SPM ou CocoaPods
6. Appeler FirebaseApp.configure()
```

## 2. Bundle Identifier

Le Bundle Identifier identifie ton app de manière unique.

Exemple :

```text
com.guillaumebourlart.myapp
```

Il doit correspondre à l’app déclarée dans Firebase et dans Xcode.

## 3. Ajouter le fichier GoogleService-Info.plist

Firebase te donne un fichier :

```text
GoogleService-Info.plist
```

Il faut l’ajouter dans le projet Xcode et vérifier qu’il est bien inclus dans le target de l’app.

Ce fichier contient la configuration Firebase du projet.

⚠️ **Bonne pratique Git** : `GoogleService-Info.plist` n’est pas un secret ultra-sensible (il est embarqué dans le binaire de l’app), **mais** il identifie ton projet Firebase et tu as souvent un fichier **différent par environnement** (dev / prod). On évite donc de committer le mauvais par accident. Deux options propres :

```text
# .gitignore
GoogleService-Info.plist
```

- soit tu l’ignores et chaque dev/CI le récupère à part ;
- soit tu gardes `GoogleService-Info-Dev.plist` et `GoogleService-Info-Prod.plist`, et un **build script** copie le bon selon le scheme.

Et de façon générale : **aucune clé d’API serveur, aucun secret backend** ne doit être committé en clair dans le repo (on les passe par `.xcconfig` ignoré, des variables d’environnement CI, ou un backend proxy). Voir la partie Sécurité.

## 4. Installation avec Swift Package Manager

Dans Xcode :

```text
File
→ Add Package Dependencies
→ coller l’URL du SDK Firebase
→ choisir les produits nécessaires
```

Produits courants :

- FirebaseAuth
- FirebaseFirestore
- FirebaseStorage
- FirebaseMessaging
- FirebaseCrashlytics

## 5. Configuration dans une app SwiftUI

```swift
import SwiftUI
import FirebaseCore

@main
struct MyApp: App {
    init() {
        FirebaseApp.configure()
    }
    
    var body: some Scene {
        WindowGroup {
            AppRootView()
        }
    }
}
```

C’est le minimum pour initialiser Firebase au lancement de l’app.

## 6. Avec AppDelegate si nécessaire

Certaines fonctionnalités, comme les notifications push, peuvent nécessiter un `AppDelegate`.

```swift
final class AppDelegate: NSObject, UIApplicationDelegate {
    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
        FirebaseApp.configure()
        return true
    }
}
```

Puis dans l’app SwiftUI :

```swift
@main
struct MyApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) var appDelegate
    
    var body: some Scene {
        WindowGroup {
            AppRootView()
        }
    }
}
```

## 7. Dev / prod rapidement

Une vraie app peut avoir plusieurs environnements :

```text
Dev → projet Firebase de test
Prod → projet Firebase réel
```

Cela permet de ne pas polluer les vraies données pendant le développement.

## Résumé

- Firebase nécessite un projet Firebase et une app iOS déclarée.
- Le Bundle Identifier doit correspondre.
- `GoogleService-Info.plist` doit être ajouté au target.
- Firebase s’installe via SPM ou CocoaPods.
- `FirebaseApp.configure()` initialise Firebase.
- Pour les push, un AppDelegate peut être nécessaire même en SwiftUI.
