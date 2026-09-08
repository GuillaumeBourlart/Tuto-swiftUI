# Fiche 03.05 — Loading, Empty et Error Views réutilisables

## Objectif

Comprendre comment créer des vues réutilisables pour afficher un chargement, un état vide ou une erreur dans plusieurs écrans SwiftUI.

---

# 1. L’idée à comprendre

Dans une vraie app, beaucoup d’écrans ont les mêmes états :

```text
Chargement
Aucun résultat
Erreur
```

Au lieu de recoder ces interfaces dans chaque écran, tu peux créer des composants réutilisables :

```swift
LoadingView(message: "Chargement...")
EmptyStateView(title: "Aucun résultat", message: "Essaie une autre recherche.")
ErrorStateView(message: "Impossible de charger les données.") { reload() }
```

Cela rend tes écrans plus propres et garde une interface cohérente dans toute l’app.

---

# 2. LoadingView simple

```swift
struct LoadingView: View {
    let message: String

    var body: some View {
        VStack(spacing: 12) {
            ProgressView()

            Text(message)
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
        .padding()
    }
}
```

Utilisation :

```swift
LoadingView(message: "Chargement du profil...")
```

---

# 3. LoadingView plein écran

```swift
struct FullScreenLoadingView: View {
    let message: String

    var body: some View {
        VStack(spacing: 12) {
            ProgressView()
                .scaleEffect(1.2)

            Text(message)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}
```

Utilisation :

```swift
FullScreenLoadingView(message: "Chargement...")
```

Cette version est utile quand tout l’écran est en chargement.

---

# 4. EmptyStateView

Un état vide explique à l’utilisateur pourquoi il n’y a rien à afficher.

```swift
struct EmptyStateView: View {
    let systemImage: String
    let title: String
    let message: String

    var body: some View {
        VStack(spacing: 12) {
            Image(systemName: systemImage)
                .font(.system(size: 48))
                .foregroundStyle(.secondary)

            Text(title)
                .font(.headline)

            Text(message)
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
        }
        .padding()
        .frame(maxWidth: .infinity)
    }
}
```

Utilisation :

```swift
EmptyStateView(
    systemImage: "tray",
    title: "Aucun élément",
    message: "Les éléments que tu ajouteras apparaîtront ici."
)
```

---

# 5. EmptyStateView avec action

Parfois, l’état vide doit proposer une action.

```swift
struct EmptyStateActionView: View {
    let systemImage: String
    let title: String
    let message: String
    let buttonTitle: String
    let action: () -> Void

    var body: some View {
        VStack(spacing: 12) {
            Image(systemName: systemImage)
                .font(.system(size: 48))
                .foregroundStyle(.secondary)

            Text(title)
                .font(.headline)

            Text(message)
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)

            Button(buttonTitle) {
                action()
            }
            .buttonStyle(.borderedProminent)
            .padding(.top, 4)
        }
        .padding()
        .frame(maxWidth: .infinity)
    }
}
```

Utilisation :

```swift
EmptyStateActionView(
    systemImage: "plus.circle",
    title: "Aucun projet",
    message: "Crée ton premier projet pour commencer.",
    buttonTitle: "Créer un projet"
) {
    print("Créer")
}
```

---

# 6. ErrorStateView

Une vue d’erreur doit expliquer le problème et proposer de réessayer si possible.

```swift
struct ErrorStateView: View {
    let title: String
    let message: String
    let retryTitle: String
    let retryAction: () -> Void

    init(
        title: String = "Une erreur est survenue",
        message: String,
        retryTitle: String = "Réessayer",
        retryAction: @escaping () -> Void
    ) {
        self.title = title
        self.message = message
        self.retryTitle = retryTitle
        self.retryAction = retryAction
    }

    var body: some View {
        VStack(spacing: 12) {
            Image(systemName: "exclamationmark.triangle")
                .font(.system(size: 44))
                .foregroundStyle(.orange)

            Text(title)
                .font(.headline)

            Text(message)
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)

            Button(retryTitle) {
                retryAction()
            }
            .buttonStyle(.borderedProminent)
            .padding(.top, 4)
        }
        .padding()
        .frame(maxWidth: .infinity)
    }
}
```

Utilisation :

```swift
ErrorStateView(
    message: "Impossible de charger les utilisateurs."
) {
    print("Retry")
}
```

---

# 7. Exemple avec un écran complet

```swift
struct UsersView: View {
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
            FullScreenLoadingView(message: "Chargement des utilisateurs...")

        case .loaded(let users):
            List(users, id: \.self) { user in
                Text(user)
            }

        case .empty:
            EmptyStateView(
                systemImage: "person.3",
                title: "Aucun utilisateur",
                message: "Les utilisateurs apparaîtront ici."
            )

        case .error(let message):
            ErrorStateView(message: message) {
                Task {
                    await reload()
                }
            }
        }
    }

    private func reload() async {
        state = .loading
        try? await Task.sleep(for: .seconds(1))
        state = .loaded(["Guillaume", "Sarah"])
    }
}
```

L’écran reste lisible parce que chaque état complexe est déplacé dans un composant.

---

# 8. Exemple avec ViewModel

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
            let users = ["Guillaume", "Sarah"]
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
        switch viewModel.state {
        case .loading:
            FullScreenLoadingView(message: "Chargement...")

        case .loaded(let users):
            List(users, id: \.self) { user in
                Text(user)
            }

        case .empty:
            EmptyStateView(
                systemImage: "person.3",
                title: "Aucun utilisateur",
                message: "Aucun utilisateur n’a encore été trouvé."
            )

        case .error(let message):
            ErrorStateView(message: message) {
                Task {
                    await viewModel.loadUsers()
                }
            }
        }
    }
}
```

---

# 9. Où ranger ces composants ?

Comme ils sont souvent utilisés partout :

```text
Shared/
  Components/
    States/
      LoadingView.swift
      FullScreenLoadingView.swift
      EmptyStateView.swift
      ErrorStateView.swift
```

Si un état vide est spécifique à une feature, il peut rester dans la feature.

Exemple :

```text
Features/
  Animals/
    Views/
      NoAnimalsView.swift
```

---

# 10. Preview

```swift
#Preview {
    VStack(spacing: 24) {
        LoadingView(message: "Chargement...")

        EmptyStateView(
            systemImage: "tray",
            title: "Aucun élément",
            message: "Les éléments apparaîtront ici."
        )

        ErrorStateView(
            message: "Impossible de charger les données."
        ) {}
    }
    .padding()
}
```

---

# En UIKit (rappel)

En UIKit, tu gérais ces états en montrant/cachant des sous-vues à la main, de façon impérative.

Loading avec un `UIActivityIndicatorView` :

```swift
let spinner = UIActivityIndicatorView(style: .large)
spinner.translatesAutoresizingMaskIntoConstraints = false
view.addSubview(spinner)
NSLayoutConstraint.activate([
    spinner.centerXAnchor.constraint(equalTo: view.centerXAnchor),
    spinner.centerYAnchor.constraint(equalTo: view.centerYAnchor)
])
spinner.startAnimating()
// ... à la fin :
spinner.stopAnimating()
spinner.removeFromSuperview()
```

État vide / erreur : tu créais une vue custom (label + image + bouton) que tu ajoutais et retirais selon l'état, avec un `isHidden` ou un `removeFromSuperview()`.

Depuis iOS 17, `UIViewController` expose `contentUnavailableConfiguration`, qui standardise ces états :

```swift
// Loading
contentUnavailableConfiguration = UIContentUnavailableConfiguration.loading()

// Aucun résultat
var empty = UIContentUnavailableConfiguration.empty()
empty.image = UIImage(systemName: "person.3")
empty.text = "Aucun utilisateur"
empty.secondaryText = "Les utilisateurs apparaîtront ici."
contentUnavailableConfiguration = empty

// Erreur custom avec bouton "Réessayer"
var error = UIContentUnavailableConfiguration.empty()
error.image = UIImage(systemName: "exclamationmark.triangle")
error.text = "Une erreur est survenue"
var button = UIButton.Configuration.borderedProminent()
button.title = "Réessayer"
error.button = button
error.buttonProperties.primaryAction = UIAction { _ in self.reload() }
contentUnavailableConfiguration = error

// Revenir au contenu normal
contentUnavailableConfiguration = nil
```

Différence clé de mentalité : en UIKit tu **manipules** des vues (ajoute, retire, masque) selon un état que tu suis toi-même ; en SwiftUI tu **décris** quoi afficher pour chaque état et le framework recalcule la vue.

👉 En SwiftUI : ce sont de simples sous-vues (`ProgressView`, `ContentUnavailableView`) qu'un `switch state` choisit de manière déclarative.

---

# 11. Points à connaître

## Un état vide doit expliquer quoi faire

Pas très utile :

```text
Aucun élément
```

Mieux :

```text
Aucun favori
Ajoute des éléments en favoris pour les retrouver ici.
```

---

## Une erreur doit être compréhensible

Évite d’afficher directement une erreur technique à l’utilisateur.

Pas idéal :

```text
URLError -1009
```

Mieux :

```text
Impossible de charger les données. Vérifie ta connexion puis réessaie.
```

---

## Le retry doit être simple à brancher

Un `ErrorStateView` doit recevoir une closure :

```swift
let retryAction: () -> Void
```

Comme ça, chaque écran décide quoi relancer.

---

# Résumé

À retenir :

- crée des vues réutilisables pour loading, empty et error ;
- cela évite de répéter le même code dans tous les écrans ;
- `LoadingView` affiche un chargement ;
- `EmptyStateView` explique pourquoi il n’y a rien ;
- `ErrorStateView` affiche une erreur et peut proposer un retry ;
- ces composants vont souvent dans `Shared/Components/States` ;
- un bon état vide ou erreur doit aider l’utilisateur à comprendre quoi faire.

