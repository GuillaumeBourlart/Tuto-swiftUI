# Fiche 14.02 — Tester un ViewModel

## Objectif

Savoir tester un ViewModel SwiftUI sans lancer l’interface.

C’est une compétence très utile en entretien, car elle montre que ton architecture est propre et testable.

## 1. ViewModel à tester

Exemple simple de ViewModel de login :

```swift
import Foundation
import Observation

@MainActor
@Observable
final class LoginViewModel {
    var email = ""
    var password = ""
    var errorMessage: String?

    var isFormValid: Bool {
        email.contains("@") && password.count >= 8
    }

    func validate() {
        if email.isEmpty || password.isEmpty {
            errorMessage = "Tous les champs sont obligatoires."
        } else if !isFormValid {
            errorMessage = "Email ou mot de passe invalide."
        } else {
            errorMessage = nil
        }
    }
}
```

## 2. Tester la validation

```swift
import XCTest
@testable import MyApp

@MainActor
final class LoginViewModelTests: XCTestCase {
    func testEmptyFieldsAreInvalid() {
        let viewModel = LoginViewModel()

        viewModel.email = ""
        viewModel.password = ""
        viewModel.validate()

        XCTAssertFalse(viewModel.isFormValid)
        XCTAssertEqual(viewModel.errorMessage, "Tous les champs sont obligatoires.")
    }

    func testValidFormHasNoError() {
        let viewModel = LoginViewModel()

        viewModel.email = "user@test.com"
        viewModel.password = "password123"
        viewModel.validate()

        XCTAssertTrue(viewModel.isFormValid)
        XCTAssertNil(viewModel.errorMessage)
    }
}
```

`@MainActor` est utile si ton ViewModel est aussi `@MainActor`.

## 3. Tester les états d’écran (et l’asynchrone, pour de vrai)

Un ViewModel réel expose souvent un état… et **charge ses données de façon asynchrone**. C’est exactement ça qu’il faut tester.

```swift
enum ViewState: Equatable {
    case idle
    case loading
    case loaded
    case error(String)
}
```

⚠️ **Piège du faux test** : si le ViewModel est synchrone…

```swift
// ❌ Trompeur : loadProfile() est synchrone, ne touche aucune dépendance,
// et passe instantanément de .loading à .loaded.
func loadProfile() {
    state = .loading
    state = .loaded
}
```

…alors le test associé donne une **fausse confiance** : il ne vérifie jamais l’asynchronisme, ni l’état `.loading`, ni la branche d’erreur. En vrai, un chargement dépend d’un service et peut **échouer**. On injecte donc une dépendance et on rend la méthode `async` :

```swift
protocol ProfileLoading {
    func fetchProfile() async throws -> String
}

@MainActor
@Observable
final class ProfileViewModel {
    private(set) var state: ViewState = .idle
    private let service: ProfileLoading

    init(service: ProfileLoading) {
        self.service = service
    }

    func loadProfile() async {
        state = .loading
        do {
            _ = try await service.fetchProfile()
            state = .loaded
        } catch {
            state = .error("Impossible de charger le profil.")
        }
    }
}
```

Mock contrôlable (succès **ou** échec) :

```swift
struct ProfileServiceMock: ProfileLoading {
    var shouldFail = false

    func fetchProfile() async throws -> String {
        if shouldFail { throw URLError(.timedOut) }
        return "Profil de Guillaume"
    }
}
```

Tests : on vérifie l’état de départ, le **succès**, et surtout la **branche d’erreur** (que le faux test synchrone ne couvrait jamais) :

```swift
@MainActor
final class ProfileViewModelTests: XCTestCase {
    func testSuccessEndsInLoaded() async {
        let viewModel = ProfileViewModel(service: ProfileServiceMock(shouldFail: false))

        XCTAssertEqual(viewModel.state, .idle) // état initial
        await viewModel.loadProfile()
        XCTAssertEqual(viewModel.state, .loaded)
    }

    func testFailureEndsInError() async {
        let viewModel = ProfileViewModel(service: ProfileServiceMock(shouldFail: true))

        await viewModel.loadProfile()
        XCTAssertEqual(viewModel.state, .error("Impossible de charger le profil."))
    }
}
```

> Astuce : pour vérifier aussi le passage par `.loading`, on peut enregistrer la suite des états via un spy ou `withObservationTracking`. L’essentiel : tester les **deux branches** (succès et erreur), pas seulement le happy-path.

## 4. Tester avec un service mock

ViewModel :

```swift
protocol AuthServicing {
    func login(email: String, password: String) async throws
}

@MainActor
@Observable
final class LoginAsyncViewModel {
    private(set) var isLoading = false
    private(set) var errorMessage: String?

    private let authService: AuthServicing

    init(authService: AuthServicing) {
        self.authService = authService
    }

    func login(email: String, password: String) async {
        isLoading = true
        errorMessage = nil

        do {
            try await authService.login(email: email, password: password)
        } catch {
            errorMessage = "Connexion impossible."
        }

        isLoading = false
    }
}
```

Mock :

```swift
struct AuthServiceMock: AuthServicing {
    let shouldFail: Bool

    func login(email: String, password: String) async throws {
        if shouldFail {
            throw URLError(.badServerResponse)
        }
    }
}
```

Test :

```swift
@MainActor
final class LoginAsyncViewModelTests: XCTestCase {
    func testLoginFailureShowsError() async {
        let viewModel = LoginAsyncViewModel(
            authService: AuthServiceMock(shouldFail: true)
        )

        await viewModel.login(email: "user@test.com", password: "password123")

        XCTAssertFalse(viewModel.isLoading)
        XCTAssertEqual(viewModel.errorMessage, "Connexion impossible.")
    }
}
```

## Résumé

- Un ViewModel se teste sans afficher l’UI.
- On teste les champs calculés, les erreurs et les états.
- Les dépendances doivent être injectées pour pouvoir utiliser des mocks.
- Les tests de ViewModel prouvent que ton MVVM est propre.
