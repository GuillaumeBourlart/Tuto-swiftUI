# Fiche 02.04 — `@StateObject` en SwiftUI

> **Famille ObservableObject.** Ces outils restent utiles pour lire l’existant et les projets qui les utilisent. Pour le parcours iOS 17+, commence par [choisir les outils d’état (02.12)](fiche_02_12_choisir_etat_et_bindings.md), puis [Observation (02.11)](fiche_02_11_observable_viewmodel_moderne.md). Les règles de cette fiche concernent les objets `ObservableObject`, pas les objets `@Observable`.

## Objectif

Comprendre à quoi sert `@StateObject`, pourquoi il est utilisé avec un ViewModel, et comment il permet à une vue SwiftUI de garder un objet observable en mémoire.

---

# 1. L’idée à comprendre

`@StateObject` sert à créer et conserver un objet observable dans une vue SwiftUI.

Il est souvent utilisé pour créer un ViewModel.

Exemple :

```swift
struct ProfileView: View {
    @StateObject private var viewModel = ProfileViewModel() // La vue crée et garde le ViewModel

    var body: some View {
        Text(viewModel.username)
    }
}
```

À retenir :

```text
@StateObject = cette vue possède cet objet et doit le garder vivant.
```

---

# 2. Pourquoi on en a besoin

Une `View` SwiftUI est une `struct`.

Elle peut être recréée souvent par SwiftUI.

Si tu créais ton ViewModel comme une simple propriété, tu risquerais de le recréer trop souvent.

Pas adapté :

```swift
struct ProfileView: View {
    private var viewModel = ProfileViewModel() // Risque de mauvaise gestion du cycle de vie

    var body: some View {
        Text(viewModel.username)
    }
}
```

Correct :

```swift
struct ProfileView: View {
    @StateObject private var viewModel = ProfileViewModel() // SwiftUI garde l’objet entre les refreshs de body

    var body: some View {
        Text(viewModel.username)
    }
}
```

`@StateObject` dit à SwiftUI :

```text
Crée cet objet une seule fois pour cette vue, puis conserve-le tant que la vue existe.
```

---

# 3. Code minimal avec ViewModel

```swift
import SwiftUI

@MainActor
final class CounterViewModel: ObservableObject {
    @Published var count = 0 // Quand cette valeur change, la vue est mise à jour

    func increment() {
        count += 1
    }
}

struct CounterView: View {
    @StateObject private var viewModel = CounterViewModel() // La vue possède le ViewModel

    var body: some View {
        VStack(spacing: 16) {
            Text("Compteur : \(viewModel.count)")

            Button("Ajouter 1") {
                viewModel.increment()
            }
        }
        .padding()
    }
}
```

Ici :

- `CounterViewModel` contient la logique ;
- `count` est publié avec `@Published` ;
- `CounterView` observe le ViewModel avec `@StateObject` ;
- quand `count` change, SwiftUI met à jour la vue.

---

# 4. `ObservableObject`

Pour être utilisé avec `@StateObject`, ton objet doit généralement respecter `ObservableObject`.

```swift
final class ProfileViewModel: ObservableObject {
    @Published var username = "Guillaume"
}
```

`ObservableObject` signifie :

```text
Cet objet peut prévenir SwiftUI quand certaines de ses valeurs changent.
```

Les valeurs qui doivent déclencher une mise à jour sont souvent marquées avec `@Published`.

---

# 5. `@Published`

`@Published` indique qu’une propriété du ViewModel peut déclencher une mise à jour de la vue.

```swift
final class ProfileViewModel: ObservableObject {
    @Published var username = ""
    @Published var isLoading = false
    @Published var errorMessage: String?
}
```

Si `username`, `isLoading` ou `errorMessage` changent, la vue qui observe ce ViewModel peut être mise à jour.

---

# 6. Exemple réaliste : écran de profil

```swift
@MainActor
final class ProfileViewModel: ObservableObject {
    @Published var username = ""
    @Published var isLoading = false
    @Published var errorMessage: String?

    func loadProfile() async {
        isLoading = true
        errorMessage = nil

        do {
            try await Task.sleep(for: .seconds(1)) // Simulation d’un appel API
            username = "Guillaume"
        } catch {
            errorMessage = "Impossible de charger le profil."
        }

        isLoading = false
    }
}
```

Vue :

```swift
struct ProfileView: View {
    @StateObject private var viewModel = ProfileViewModel()

    var body: some View {
        VStack(spacing: 16) {
            if viewModel.isLoading {
                ProgressView("Chargement...")
            } else if let errorMessage = viewModel.errorMessage {
                Text(errorMessage)
                    .foregroundStyle(.red)
            } else {
                Text(viewModel.username)
                    .font(.title)
            }
        }
        .padding()
        .task {
            await viewModel.loadProfile()
        }
    }
}
```

Ici :

- la vue affiche le bon état selon le ViewModel ;
- le ViewModel gère le chargement ;
- la vue reste principalement responsable de l’interface.

---

# 7. Pourquoi `@MainActor` ?

Un ViewModel SwiftUI met souvent à jour l’interface.

Les changements d’interface doivent se faire sur le thread principal.

C’est pour ça qu’on écrit souvent :

```swift
@MainActor
final class ProfileViewModel: ObservableObject {
    @Published var username = ""
}
```

`@MainActor` indique que les propriétés et fonctions de ce ViewModel doivent être utilisées sur le thread principal.

C’est particulièrement utile quand le ViewModel fait des appels `async/await`.

---

# 8. `@StateObject` vs `@State`

`@State` sert plutôt pour des valeurs simples locales.

```swift
@State private var isShowingSheet = false
@State private var searchText = ""
```

`@StateObject` sert pour un objet observable, souvent un ViewModel.

```swift
@StateObject private var viewModel = ProfileViewModel()
```

Résumé :

```text
Valeur simple locale        → @State
Objet observable/ViewModel  → @StateObject
```

---

# 9. `@StateObject` vs `@ObservedObject`

La différence est très importante.

`@StateObject` est utilisé quand la vue crée et possède l’objet.

```swift
struct ProfileView: View {
    @StateObject private var viewModel = ProfileViewModel()
}
```

`@ObservedObject` est utilisé quand l’objet est créé ailleurs et simplement reçu par la vue.

```swift
struct ProfileHeaderView: View {
    @ObservedObject var viewModel: ProfileViewModel
}
```

Résumé :

```text
La vue crée le ViewModel      → @StateObject
La vue reçoit le ViewModel    → @ObservedObject
```

---

# 10. Exemple parent avec `@StateObject`, enfant avec `@ObservedObject`

```swift
@MainActor
final class ProfileViewModel: ObservableObject {
    @Published var username = "Guillaume"
}

struct ProfileView: View {
    @StateObject private var viewModel = ProfileViewModel() // Créé ici

    var body: some View {
        VStack {
            ProfileHeaderView(viewModel: viewModel) // Transmis à la sous-vue
        }
    }
}

struct ProfileHeaderView: View {
    @ObservedObject var viewModel: ProfileViewModel // Reçu ici

    var body: some View {
        Text(viewModel.username)
            .font(.title)
    }
}
```

Ici :

- `ProfileView` possède le ViewModel ;
- `ProfileHeaderView` l’observe seulement ;
- il ne faut pas recréer un nouveau ViewModel dans la sous-vue.

---

# 11. Initialiser un `@StateObject` avec des paramètres

Si ton ViewModel a besoin de paramètres, tu peux l’initialiser dans le `init` de la vue.

```swift
@MainActor
final class UserDetailViewModel: ObservableObject {
    @Published var username = ""

    let userId: String

    init(userId: String) {
        self.userId = userId
    }
}
```

Vue :

```swift
struct UserDetailView: View {
    @StateObject private var viewModel: UserDetailViewModel

    init(userId: String) {
        _viewModel = StateObject(
            wrappedValue: UserDetailViewModel(userId: userId)
        )
    }

    var body: some View {
        Text("User ID : \(viewModel.userId)")
    }
}
```

Le `_viewModel` permet d’initialiser le wrapper `@StateObject`.

C’est une syntaxe normale quand tu dois construire un `StateObject` avec un paramètre.

---

# 12. Injection de dépendance simple

Dans une app plus propre, ton ViewModel peut recevoir un service.

```swift
protocol ProfileServiceProtocol {
    func fetchUsername() async throws -> String
}

final class MockProfileService: ProfileServiceProtocol {
    func fetchUsername() async throws -> String {
        "Guillaume"
    }
}

@MainActor
final class ProfileViewModel: ObservableObject {
    @Published var username = ""

    private let service: ProfileServiceProtocol

    init(service: ProfileServiceProtocol) {
        self.service = service
    }

    func loadProfile() async {
        do {
            username = try await service.fetchUsername()
        } catch {
            username = "Erreur"
        }
    }
}
```

Vue :

```swift
struct ProfileView: View {
    @StateObject private var viewModel: ProfileViewModel

    init(service: ProfileServiceProtocol = MockProfileService()) {
        _viewModel = StateObject(
            wrappedValue: ProfileViewModel(service: service)
        )
    }

    var body: some View {
        Text(viewModel.username)
            .task {
                await viewModel.loadProfile()
            }
    }
}
```

Cette approche permet plus tard de remplacer `MockProfileService` par :

- un vrai service API ;
- un service Firebase ;
- un mock pour les tests ;
- un fake pour les previews.

---

# 13. Preview avec `@StateObject`

Si la vue crée son propre ViewModel avec `@StateObject`, tu peux la prévisualiser directement.

```swift
#Preview {
    ProfileView()
}
```

Si tu veux injecter un service de preview :

```swift
#Preview {
    ProfileView(service: MockProfileService())
}
```

L’intérêt est de ne pas dépendre d’une vraie API ou de Firebase dans la preview.

---

# 14. Points à connaître

## Ne crée pas un ViewModel avec `@ObservedObject` si la vue doit le posséder

Pas idéal :

```swift
struct ProfileView: View {
    @ObservedObject var viewModel = ProfileViewModel()
}
```

Préférable :

```swift
struct ProfileView: View {
    @StateObject private var viewModel = ProfileViewModel()
}
```

Si la vue crée l’objet, utilise `@StateObject`.

---

## Évite de mettre la logique métier dans la vue

Pas idéal :

```swift
struct ProfileView: View {
    @State private var username = ""

    var body: some View {
        Text(username)
            .task {
                // Appel API directement ici
                // Parsing
                // Gestion erreurs
                // Trop de logique dans la vue
            }
    }
}
```

Préférable :

```swift
struct ProfileView: View {
    @StateObject private var viewModel = ProfileViewModel()

    var body: some View {
        Text(viewModel.username)
            .task {
                await viewModel.loadProfile()
            }
    }
}
```

La vue affiche.

Le ViewModel prépare les données d’affichage.

---

## `@StateObject` garde l’objet tant que la vue reste au même endroit

SwiftUI peut relire le `body`, mais le ViewModel n’est pas recréé à chaque fois.

C’est l’un des intérêts principaux de `@StateObject`.

---

# 15. Note sur `@Observable`

Dans les versions récentes de SwiftUI, Apple propose aussi le système d’observation avec `@Observable`.

Mais `ObservableObject`, `@Published`, `@StateObject` et `@ObservedObject` restent très importants à comprendre, car ils sont encore très présents dans beaucoup de projets iOS existants.

Dans ce cours, on apprend d’abord cette approche classique, puis on pourra voir `@Observable` plus tard.

---

# Résumé

À retenir :

- `@StateObject` sert à créer et conserver un objet observable dans une vue ;
- il est souvent utilisé pour un ViewModel ;
- l’objet doit généralement respecter `ObservableObject` ;
- les propriétés qui déclenchent l’UI sont souvent marquées avec `@Published` ;
- si la vue crée le ViewModel, utilise `@StateObject` ;
- si la vue reçoit le ViewModel, utilise plutôt `@ObservedObject` ;
- un ViewModel SwiftUI est souvent marqué `@MainActor` ;
- `@StateObject` est une base importante pour MVVM en SwiftUI.

