# Fiche 08.02 — Debounce, validation formulaire et Combine dans MVVM

## Objectif

Savoir utiliser Combine pour deux cas très fréquents : recherche avec délai (`debounce`) et validation automatique de formulaire dans un ViewModel MVVM.

## 1. Pourquoi debounce ?

Quand l’utilisateur tape dans un champ de recherche, il ne faut pas lancer une requête API à chaque lettre.

Exemple mauvais :

```text
s → appel API
sw → appel API
swi → appel API
swif → appel API
swift → appel API
```

Avec `debounce`, on attend que l’utilisateur arrête de taper pendant un court délai.

## 2. Recherche avec debounce

```swift
import Combine
import Foundation

@MainActor
final class SearchViewModel: ObservableObject {
    @Published var query = ""
    @Published private(set) var results: [String] = []

    private var cancellables = Set<AnyCancellable>()

    init() {
        $query
            .debounce(for: .milliseconds(400), scheduler: RunLoop.main)
            .removeDuplicates()
            .sink { [weak self] query in
                self?.performSearch(query)
            }
            .store(in: &cancellables)
    }

    private func performSearch(_ query: String) {
        guard !query.isEmpty else {
            results = []
            return
        }

        // Simulation. Dans une vraie app, on déclencherait une Task async.
        results = ["Résultat pour \(query)"]
    }
}
```

SwiftUI :

```swift
struct SearchView: View {
    @StateObject private var viewModel = SearchViewModel()

    var body: some View {
        List(viewModel.results, id: \.self) { result in
            Text(result)
        }
        .searchable(text: $viewModel.query)
    }
}
```

## 3. Debounce avec appel async

Si la recherche appelle une API async, on peut lancer une `Task`.

```swift
@MainActor
final class AsyncSearchViewModel: ObservableObject {
    @Published var query = ""
    @Published private(set) var results: [String] = []
    @Published private(set) var isLoading = false

    private var searchTask: Task<Void, Never>?
    private var cancellables = Set<AnyCancellable>()

    init() {
        $query
            .debounce(for: .milliseconds(400), scheduler: RunLoop.main)
            .removeDuplicates()
            .sink { [weak self] query in
                self?.searchTask?.cancel()
                self?.searchTask = Task {
                    await self?.search(query)
                }
            }
            .store(in: &cancellables)
    }

    private func search(_ query: String) async {
        guard !query.isEmpty else {
            results = []
            return
        }

        isLoading = true
        defer { isLoading = false }

        // Simulation API
        try? await Task.sleep(nanoseconds: 300_000_000)
        results = ["Résultat API : \(query)"]
    }
}
```

Cette approche combine Combine pour écouter le texte, et async/await pour l’appel réseau.

## 4. Validation de formulaire avec Combine

```swift
@MainActor
final class RegisterViewModel: ObservableObject {
    @Published var email = ""
    @Published var password = ""
    @Published var confirmPassword = ""
    @Published var acceptsTerms = false

    @Published private(set) var isFormValid = false

    private var cancellables = Set<AnyCancellable>()

    init() {
        Publishers.CombineLatest4($email, $password, $confirmPassword, $acceptsTerms)
            .map { email, password, confirmPassword, acceptsTerms in
                email.contains("@") &&
                password.count >= 8 &&
                password == confirmPassword &&
                acceptsTerms
            }
            .assign(to: &$isFormValid)
    }
}
```

Vue :

```swift
struct RegisterView: View {
    @StateObject private var viewModel = RegisterViewModel()

    var body: some View {
        Form {
            TextField("Email", text: $viewModel.email)
            SecureField("Mot de passe", text: $viewModel.password)
            SecureField("Confirmer", text: $viewModel.confirmPassword)
            Toggle("J’accepte les conditions", isOn: $viewModel.acceptsTerms)

            Button("Créer mon compte") {
                print("Register")
            }
            .disabled(!viewModel.isFormValid)
        }
    }
}
```

## 5. Quand utiliser Combine ici ?

Combine est utile si :

- plusieurs champs doivent produire un état calculé ;
- tu veux éviter de recalculer manuellement partout ;
- tu fais une recherche avec debounce ;
- tu écoutes un flux de données continu.

Pour une validation très simple, une propriété calculée suffit aussi :

```swift
var isFormValid: Bool {
    email.contains("@") && password.count >= 8
}
```

Il ne faut pas utiliser Combine juste pour faire compliqué.

## Résumé

- `debounce` attend avant de déclencher une action.
- `removeDuplicates` évite de traiter deux fois la même valeur.
- Combine est très utile pour une recherche en direct.
- Combine peut valider automatiquement un formulaire.
- Avec async/await, Combine peut déclencher une `Task`.
- Pour une validation très simple, une propriété calculée peut suffire.
