# Fiche 02.10 — États d’écran : loading, loaded, empty, error

## Objectif

Comprendre comment représenter proprement les différents états d’un écran SwiftUI : chargement, contenu chargé, contenu vide et erreur.

---

# 1. L’idée à comprendre

Dans une vraie app, un écran n’affiche pas toujours directement ses données.

Il peut être dans plusieurs états :

```text
loading → les données chargent
loaded  → les données sont disponibles
empty   → il n’y a aucune donnée à afficher
error   → une erreur est survenue
```

Exemple concret : une liste d’utilisateurs.

Au départ, l’app charge les utilisateurs.

Ensuite :

- soit elle affiche la liste ;
- soit elle affiche “Aucun utilisateur” ;
- soit elle affiche une erreur.

SwiftUI est très adapté à cette logique, car l’interface dépend directement de l’état actuel.

---

# 2. Version simple avec plusieurs variables

Tu peux commencer avec des variables simples.

```swift
struct UsersView: View {
    @State private var users: [String] = []
    @State private var isLoading = false
    @State private var errorMessage: String?

    var body: some View {
        VStack {
            if isLoading {
                ProgressView("Chargement...")
            } else if let errorMessage {
                Text(errorMessage)
                    .foregroundStyle(.red)
            } else if users.isEmpty {
                Text("Aucun utilisateur")
                    .foregroundStyle(.secondary)
            } else {
                List(users, id: \.self) { user in
                    Text(user)
                }
            }
        }
    }
}
```

Cette approche fonctionne pour un écran simple.

Mais quand l’écran devient plus complexe, plusieurs variables peuvent devenir difficiles à synchroniser.

---

# 3. Le problème avec plusieurs booléens

Exemple fragile :

```swift
@State private var isLoading = false
@State private var isEmpty = false
@State private var hasError = false
@State private var users: [String] = []
```

Le problème : plusieurs états peuvent être vrais en même temps.

Exemple incohérent :

```text
isLoading = true
hasError = true
isEmpty = true
```

Dans ce cas, l’écran est difficile à comprendre.

Il vaut souvent mieux représenter l’état complet avec une seule enum.

---

# 4. Version propre avec une enum

```swift
struct UsersScreenView: View {
    enum ViewState {
        case loading
        case loaded([String])
        case empty
        case error(String)
    }

    @State private var state: ViewState = .loading

    var body: some View {
        switch state {
        case .loading:
            ProgressView("Chargement...")

        case .loaded(let users):
            List(users, id: \.self) { user in
                Text(user)
            }

        case .empty:
            Text("Aucun utilisateur")
                .foregroundStyle(.secondary)

        case .error(let message):
            Text(message)
                .foregroundStyle(.red)
        }
    }
}
```

Ici, l’écran ne peut être que dans un seul état à la fois.

C’est plus clair :

```text
state = .loading
state = .loaded(users)
state = .empty
state = .error(message)
```

---

# 5. Exemple avec simulation de chargement

```swift
struct UsersScreenView: View {
    enum ViewState {
        case loading
        case loaded([String])
        case empty
        case error(String)
    }

    @State private var state: ViewState = .loading

    var body: some View {
        content
            .task {
                await loadUsers()
            }
    }

    @ViewBuilder
    private var content: some View {
        switch state {
        case .loading:
            ProgressView("Chargement...")

        case .loaded(let users):
            List(users, id: \.self) { user in
                Text(user)
            }

        case .empty:
            Text("Aucun utilisateur")
                .foregroundStyle(.secondary)

        case .error(let message):
            VStack(spacing: 12) {
                Text(message)
                    .foregroundStyle(.red)

                Button("Réessayer") {
                    Task {
                        await loadUsers()
                    }
                }
            }
        }
    }

    private func loadUsers() async {
        state = .loading

        do {
            try await Task.sleep(for: .seconds(1)) // Simulation d’un appel API

            let users = ["Guillaume", "Sarah", "Lucas"]

            if users.isEmpty {
                state = .empty
            } else {
                state = .loaded(users)
            }
        } catch {
            state = .error("Impossible de charger les utilisateurs.")
        }
    }
}
```

Ici :

- `.task` lance le chargement ;
- `state = .loading` affiche le loader ;
- `state = .loaded(users)` affiche la liste ;
- `state = .empty` affiche un message vide ;
- `state = .error(...)` affiche une erreur.

---

# 6. Utiliser `@ViewBuilder` pour découper le body

Quand un `body` devient trop long, tu peux découper l’affichage dans une propriété.

```swift
@ViewBuilder
private var content: some View {
    switch state {
    case .loading:
        ProgressView()
    case .loaded(let users):
        List(users, id: \.self) { user in
            Text(user)
        }
    case .empty:
        Text("Aucun résultat")
    case .error(let message):
        Text(message)
    }
}
```

Puis dans le `body` :

```swift
var body: some View {
    content
}
```

`@ViewBuilder` permet de retourner différentes vues selon les cas.

---

# 7. Version avec ViewModel

Dans une vraie app, l’état sera souvent dans un ViewModel.

```swift
@MainActor
final class UsersViewModel: ObservableObject {
    enum ViewState {
        case loading
        case loaded([String])
        case empty
        case error(String)
    }

    @Published var state: ViewState = .loading

    func loadUsers() async {
        state = .loading

        do {
            try await Task.sleep(for: .seconds(1))

            let users = ["Guillaume", "Sarah", "Lucas"]

            state = users.isEmpty ? .empty : .loaded(users)
        } catch {
            state = .error("Impossible de charger les utilisateurs.")
        }
    }
}
```

Vue :

```swift
struct UsersView: View {
    @StateObject private var viewModel = UsersViewModel()

    var body: some View {
        content
            .task {
                await viewModel.loadUsers()
            }
    }

    @ViewBuilder
    private var content: some View {
        switch viewModel.state {
        case .loading:
            ProgressView("Chargement...")

        case .loaded(let users):
            List(users, id: \.self) { user in
                Text(user)
            }

        case .empty:
            Text("Aucun utilisateur")
                .foregroundStyle(.secondary)

        case .error(let message):
            VStack(spacing: 12) {
                Text(message)
                    .foregroundStyle(.red)

                Button("Réessayer") {
                    Task {
                        await viewModel.loadUsers()
                    }
                }
            }
        }
    }
}
```

Cette version est plus proche d’une vraie app MVVM.

La vue affiche l’état.

Le ViewModel décide de l’état.

---

# 8. Créer des vues dédiées pour chaque état

Pour garder un écran lisible, tu peux créer des petites vues dédiées.

```swift
struct LoadingView: View {
    let message: String

    var body: some View {
        ProgressView(message)
    }
}
```

```swift
struct EmptyStateView: View {
    let title: String
    let message: String

    var body: some View {
        VStack(spacing: 8) {
            Text(title)
                .font(.headline)

            Text(message)
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
        }
        .padding()
    }
}
```

```swift
struct ErrorStateView: View {
    let message: String
    let retryAction: () -> Void

    var body: some View {
        VStack(spacing: 12) {
            Text(message)
                .foregroundStyle(.red)
                .multilineTextAlignment(.center)

            Button("Réessayer") {
                retryAction()
            }
            .buttonStyle(.borderedProminent)
        }
        .padding()
    }
}
```

Utilisation :

```swift
switch viewModel.state {
case .loading:
    LoadingView(message: "Chargement...")

case .empty:
    EmptyStateView(
        title: "Aucun utilisateur",
        message: "Les utilisateurs apparaîtront ici."
    )

case .error(let message):
    ErrorStateView(message: message) {
        Task {
            await viewModel.loadUsers()
        }
    }

case .loaded(let users):
    List(users, id: \.self) { user in
        Text(user)
    }
}
```

---

# 9. Enum générique réutilisable

Tu peux créer un état générique pour plusieurs écrans.

```swift
enum LoadableState<Value> {
    case idle
    case loading
    case loaded(Value)
    case empty
    case error(String)
}
```

Exemple :

```swift
@Published var state: LoadableState<[User]> = .idle
```

Utilisation :

```swift
switch viewModel.state {
case .idle:
    EmptyView()
case .loading:
    ProgressView()
case .loaded(let users):
    UsersListView(users: users)
case .empty:
    EmptyStateView(title: "Aucun résultat", message: "Essaie une autre recherche.")
case .error(let message):
    Text(message)
}
```

C’est utile si plusieurs écrans ont la même logique de chargement.

---

# 10. Cas avec données déjà chargées puis refresh

Parfois, tu ne veux pas remplacer tout l’écran par un loader pendant un refresh.

Exemple : une liste déjà affichée se met à jour en arrière-plan.

Dans ce cas, tu peux séparer :

```swift
@Published var users: [String] = []
@Published var isRefreshing = false
@Published var errorMessage: String?
```

Pourquoi ?

Parce que l’écran peut être dans cet état :

```text
Données visibles + refresh en cours
```

Une enum simple `loading/loaded/error` peut être trop limitée pour ce cas.

Donc il faut adapter selon le besoin.

---

# 11. Quand utiliser une enum d’état

Utilise une enum quand l’écran doit être dans un seul état principal à la fois.

Exemples :

```text
loading OU loaded OU empty OU error
```

C’est parfait pour :

- chargement initial ;
- écran détail ;
- résultat de recherche ;
- liste simple ;
- écran profil ;
- appel API unique.

---

# 12. Quand garder plusieurs propriétés

Garde plusieurs propriétés quand les états peuvent exister ensemble.

Exemple :

```text
Liste affichée + refresh en cours
Liste affichée + toast d’erreur
Formulaire rempli + validation en cours
Contenu chargé + bannière d’information
```

Dans ces cas, il est normal d’avoir :

```swift
@Published var users: [User] = []
@Published var isRefreshing = false
@Published var toastMessage: String?
```

---

# En UIKit (rappel)

En UIKit, on utilise la même enum d’état, mais on l’applique à la main dans le `UIViewController` : une méthode `render(state:)` fait un `switch` et montre/cache chaque sous-vue selon le cas.

```swift
enum ViewState {
    case loading
    case loaded([String])
    case empty
    case error(String)
}

final class UsersViewController: UIViewController {
    private let activityIndicator = UIActivityIndicatorView(style: .large)
    private let emptyLabel = UILabel()
    private let tableView = UITableView()

    private var state: ViewState = .loading {
        didSet { render(state: state) }   // on rappelle render à chaque changement
    }

    private func render(state: ViewState) {
        // 1. tout cacher
        activityIndicator.stopAnimating()
        emptyLabel.isHidden = true
        tableView.isHidden = true

        // 2. ne montrer que ce qui correspond à l’état
        switch state {
        case .loading:
            activityIndicator.startAnimating()
        case .loaded(let users):
            tableView.isHidden = false
            applySnapshot(users)          // diffable data source
        case .empty:
            emptyLabel.text = "Aucun utilisateur"
            emptyLabel.isHidden = false
        case .error(let message):
            emptyLabel.text = message
            emptyLabel.isHidden = false
        }
    }
}
```

Différence clé de mentalité : en UIKit, c’est **impératif** — tu dois toi-même cacher les anciennes vues avant d’afficher la bonne, sinon deux états restent visibles en même temps. En SwiftUI, c’est **déclaratif** : le `switch` est dans le `body`, et le framework reconstruit l’écran à partir de l’état (rien à cacher à la main).

👉 En SwiftUI : le `switch state { ... }` est directement dans le `body`, sans `render(state:)` ni gestion manuelle de `isHidden`.

---

# Résumé

À retenir :

- un écran réel a souvent plusieurs états : loading, loaded, empty, error ;
- plusieurs booléens peuvent créer des états incohérents ;
- une enum permet de représenter clairement un seul état principal ;
- `switch state` est très pratique dans SwiftUI ;
- `@ViewBuilder` aide à découper un affichage conditionnel ;
- dans une vraie app MVVM, l’état est souvent dans le ViewModel ;
- tu peux créer des vues réutilisables pour loading, empty et error ;
- une enum est idéale pour un chargement initial simple ;
- plusieurs propriétés peuvent être préférables si plusieurs états doivent coexister.

