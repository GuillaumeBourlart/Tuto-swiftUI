# Fiche 06.02 — MVVM dans SwiftUI avec ViewModel

> **Repère de version.** Le cours contient les deux familles d’observation. `@State` gère aussi un objet `@Observable` depuis iOS 17 ; `@StateObject` concerne `ObservableObject`. Consulte la [carte de décision 02.12](fiche_02_12_choisir_etat_et_bindings.md). MVVM est un choix d’organisation, pas une obligation du framework.

## Objectif

Savoir créer une feature SwiftUI avec MVVM : une View, un ViewModel, un état d’écran, un appel async et une gestion loading/error.

## 1. Structure simple

Pour une feature `Profile`, on peut avoir :

```text
Features/Profile/
├── ProfileView.swift
├── ProfileViewModel.swift
└── Profile.swift
```

La View affiche. Le ViewModel prépare l’état.

## 2. Model

```swift
struct Profile: Identifiable, Equatable {
    let id: String
    let name: String
    let email: String
}
```

Le modèle représente les données utiles à l’app.

## 3. État d’écran

```swift
enum ProfileState: Equatable {
    case idle
    case loading
    case loaded(Profile)
    case error(String)
}
```

Un enum évite d’avoir trop de booléens :

```swift
var isLoading: Bool
var profile: Profile?
var errorMessage: String?
```

Avec un enum, l’écran est dans un état clair.

## 4. ViewModel

```swift
import Foundation

@MainActor
final class ProfileViewModel: ObservableObject {
    @Published private(set) var state: ProfileState = .idle

    func loadProfile() async {
        state = .loading

        do {
            // Simulation d’un appel réseau
            try await Task.sleep(nanoseconds: 500_000_000)

            let profile = Profile(
                id: "1",
                name: "Guillaume",
                email: "guillaume@email.com"
            )

            state = .loaded(profile)
        } catch {
            state = .error("Impossible de charger le profil.")
        }
    }
}
```

`@MainActor` garantit que les mises à jour de l’UI se font sur le bon thread.

`private(set)` permet à la vue de lire `state`, mais pas de le modifier directement.

## 5. View SwiftUI

```swift
import SwiftUI

struct ProfileView: View {
    @StateObject private var viewModel = ProfileViewModel()

    var body: some View {
        Group {
            switch viewModel.state {
            case .idle, .loading:
                ProgressView("Chargement...")

            case .loaded(let profile):
                VStack(spacing: 12) {
                    Text(profile.name)
                        .font(.title.bold())

                    Text(profile.email)
                        .foregroundStyle(.secondary)
                }

            case .error(let message):
                VStack(spacing: 12) {
                    Text(message)
                        .foregroundStyle(.red)

                    Button("Réessayer") {
                        Task {
                            await viewModel.loadProfile()
                        }
                    }
                }
            }
        }
        .navigationTitle("Profil")
        .task {
            await viewModel.loadProfile()
        }
    }
}
```

La View ne sait pas comment charger le profil. Elle sait seulement afficher l’état.

## 6. ViewModel avec service injecté

Dans une vraie app, le ViewModel appelle un service.

```swift
protocol ProfileServiceProtocol {
    func fetchProfile() async throws -> Profile
}

final class MockProfileService: ProfileServiceProtocol {
    func fetchProfile() async throws -> Profile {
        Profile(id: "1", name: "Guillaume", email: "guillaume@email.com")
    }
}
```

ViewModel :

```swift
@MainActor
final class ProfileViewModel: ObservableObject {
    @Published private(set) var state: ProfileState = .idle

    private let profileService: ProfileServiceProtocol

    init(profileService: ProfileServiceProtocol = MockProfileService()) {
        self.profileService = profileService
    }

    func loadProfile() async {
        state = .loading

        do {
            let profile = try await profileService.fetchProfile()
            state = .loaded(profile)
        } catch {
            state = .error("Impossible de charger le profil.")
        }
    }
}
```

Cette version est plus testable.

## 7. @StateObject ou @ObservedObject ?

Dans la vue qui crée le ViewModel :

```swift
@StateObject private var viewModel = ProfileViewModel()
```

Dans une sous-vue qui reçoit un ViewModel déjà créé :

```swift
@ObservedObject var viewModel: ProfileViewModel
```

`@StateObject` conserve l’objet. `@ObservedObject` observe un objet créé ailleurs.

## En UIKit (rappel)

En UIKit, MVVM existe déjà, mais le binding est **manuel**. Le ViewModel expose l’état (souvent un `ObservableObject` avec `@Published`, ou de simples closures `onChange`), et le `UIViewController` **s’abonne** pour redessiner l’UI lui-même dans une méthode `render()`.

ViewModel + abonnement Combine :

```swift
import Combine

final class ProfileViewModel {
    @Published private(set) var state: ProfileState = .idle

    func loadProfile() {
        state = .loading
        Task { @MainActor in
            do {
                let profile = try await profileService.fetchProfile()
                state = .loaded(profile)
            } catch {
                state = .error("Impossible de charger le profil.")
            }
        }
    }
}
```

```swift
final class ProfileViewController: UIViewController {
    private let viewModel = ProfileViewModel()
    private var cancellables = Set<AnyCancellable>()

    override func viewDidLoad() {
        super.viewDidLoad()
        // On s'abonne, puis on met l'UI à jour à la main
        viewModel.$state
            .receive(on: DispatchQueue.main)
            .sink { [weak self] state in self?.render(state) }
            .store(in: &cancellables)
        viewModel.loadProfile()
    }

    private func render(_ state: ProfileState) {
        switch state {
        case .idle, .loading:
            activityIndicator.startAnimating()
        case .loaded(let profile):
            activityIndicator.stopAnimating()
            nameLabel.text = profile.name
            emailLabel.text = profile.email
        case .error(let message):
            activityIndicator.stopAnimating()
            errorLabel.text = message
        }
    }
}
```

Mentalité : en UIKit tu décris **les étapes** (« quand l’état change, exécute `render()` qui modifie chaque vue »). En SwiftUI tu décris **le résultat** : le `body` est une fonction de l’état, recalculée automatiquement.

👉 En SwiftUI : pas de `sink` ni de `render()` — `@Published` / `@Observable` redessine le `body` tout seul quand l’état change.

## Résumé

- MVVM sépare affichage et logique d’écran.
- La View affiche l’état du ViewModel.
- Le ViewModel expose des propriétés `@Published`.
- Les appels async se font souvent dans le ViewModel.
- Un enum d’état rend l’écran plus clair.
- L’injection de service rend le ViewModel testable.
