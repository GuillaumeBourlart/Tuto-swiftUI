# Fiche 14.03 — Tester un service avec mock

## Objectif

Comprendre comment tester un service sans dépendre d’un vrai backend, de Firebase ou d’une connexion réseau.

Le principe : on met un protocole devant le service, puis on injecte un mock dans les tests.

## 1. Pourquoi mocker un service ?

Un test doit être rapide, stable et prévisible.

Si ton test dépend d’une vraie API :

- il peut échouer si internet coupe ;
- il peut échouer si le serveur change ;
- il peut être lent ;
- il peut créer de vraies données.

Avec un mock, tu contrôles exactement la réponse.

## 2. Définir un protocole

```swift
struct User: Equatable {
    let id: String
    let name: String
}

protocol UserServicing {
    func fetchCurrentUser() async throws -> User
}
```

Le ViewModel dépend du protocole, pas d’un service concret.

```swift
@MainActor
final class ProfileViewModel: ObservableObject {
    @Published private(set) var user: User?
    @Published private(set) var errorMessage: String?

    private let userService: UserServicing

    init(userService: UserServicing) {
        self.userService = userService
    }

    func loadUser() async {
        do {
            user = try await userService.fetchCurrentUser()
        } catch {
            errorMessage = "Impossible de charger le profil."
        }
    }
}
```

## 3. Créer un mock de succès

```swift
struct UserServiceSuccessMock: UserServicing {
    func fetchCurrentUser() async throws -> User {
        User(id: "1", name: "Guillaume")
    }
}
```

Test :

```swift
@MainActor
final class ProfileViewModelTests: XCTestCase {
    func testLoadUserSuccess() async {
        let viewModel = ProfileViewModel(userService: UserServiceSuccessMock())

        await viewModel.loadUser()

        XCTAssertEqual(viewModel.user, User(id: "1", name: "Guillaume"))
        XCTAssertNil(viewModel.errorMessage)
    }
}
```

## 4. Créer un mock d’erreur

```swift
struct UserServiceFailureMock: UserServicing {
    func fetchCurrentUser() async throws -> User {
        throw URLError(.badServerResponse)
    }
}
```

Test :

```swift
@MainActor
final class ProfileViewModelFailureTests: XCTestCase {
    func testLoadUserFailure() async {
        let viewModel = ProfileViewModel(userService: UserServiceFailureMock())

        await viewModel.loadUser()

        XCTAssertNil(viewModel.user)
        XCTAssertEqual(viewModel.errorMessage, "Impossible de charger le profil.")
    }
}
```

## 5. Mock configurable

Tu peux aussi créer un seul mock configurable.

```swift
final class UserServiceMock: UserServicing {
    var result: Result<User, Error>

    init(result: Result<User, Error>) {
        self.result = result
    }

    func fetchCurrentUser() async throws -> User {
        try result.get()
    }
}
```

Utilisation :

```swift
let mock = UserServiceMock(result: .success(User(id: "1", name: "Guillaume")))
let viewModel = ProfileViewModel(userService: mock)
```

## 6. Ce que ça prouve en entretien

Ce pattern montre que tu comprends :

- les protocoles ;
- l’injection de dépendance ;
- les tests unitaires ;
- l’architecture testable ;
- la séparation entre ViewModel et service réel.

## Résumé

- Un service réel ne doit pas être obligatoire dans les tests.
- On définit un protocole.
- Le ViewModel dépend du protocole.
- Les tests injectent un mock de succès ou d’erreur.
- C’est une base très importante pour une app professionnelle.
