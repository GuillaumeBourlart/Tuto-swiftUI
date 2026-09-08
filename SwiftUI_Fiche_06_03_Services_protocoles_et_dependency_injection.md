# Fiche 06.03 — Services, protocoles et dependency injection

## Objectif

Comprendre comment séparer la logique technique dans des services, utiliser des protocoles et injecter les dépendances dans les ViewModels. C’est une base essentielle pour rendre une app testable.

## 1. Pourquoi créer des services ?

Un service regroupe une responsabilité claire.

Exemples :

```text
AuthService      → login, register, logout
UserService      → profil utilisateur
APIClient        → appels réseau génériques
KeychainService  → stockage sécurisé
LocationService  → localisation
ImageService     → upload/download image
```

Sans services, on finit par mettre du réseau, Firebase ou Core Data directement dans les Views.

## 2. Exemple sans protocole

```swift
final class AuthService {
    func login(email: String, password: String) async throws -> User {
        // appel Firebase ou API
        User(id: "1", email: email)
    }
}
```

C’est simple, mais difficile à remplacer dans les tests.

## 3. Ajouter un protocole

```swift
struct User: Equatable {
    let id: String
    let email: String
}

protocol AuthServiceProtocol {
    func login(email: String, password: String) async throws -> User
    func logout() async throws
}
```

Le ViewModel dépend du protocole, pas de l’implémentation concrète.

## 4. Implémentation réelle

```swift
final class AuthService: AuthServiceProtocol {
    func login(email: String, password: String) async throws -> User {
        // Ici : Firebase Auth, API REST, Alamofire, URLSession...
        User(id: "1", email: email)
    }

    func logout() async throws {
        // Déconnexion réelle
    }
}
```

## 5. Mock pour les tests

```swift
final class MockAuthService: AuthServiceProtocol {
    var shouldFail = false

    func login(email: String, password: String) async throws -> User {
        if shouldFail {
            throw NSError(domain: "Auth", code: 1)
        }

        return User(id: "mock-id", email: email)
    }

    func logout() async throws { }
}
```

Le mock permet de tester le ViewModel sans appeler Firebase ou une vraie API.

## 6. Injection dans un ViewModel

```swift
@MainActor
final class LoginViewModel: ObservableObject {
    @Published var email = ""
    @Published var password = ""
    @Published private(set) var isLoading = false
    @Published var errorMessage: String?

    private let authService: AuthServiceProtocol

    init(authService: AuthServiceProtocol) {
        self.authService = authService
    }

    func login() async {
        isLoading = true
        errorMessage = nil

        do {
            let user = try await authService.login(email: email, password: password)
            print("Connecté : \(user.email)")
        } catch {
            errorMessage = "Connexion impossible."
        }

        isLoading = false
    }
}
```

Le ViewModel ne sait pas si le service utilise Firebase, URLSession ou un mock.

## 7. Utilisation dans la View

```swift
struct LoginView: View {
    @StateObject private var viewModel: LoginViewModel

    init(authService: AuthServiceProtocol = AuthService()) {
        _viewModel = StateObject(
            wrappedValue: LoginViewModel(authService: authService)
        )
    }

    var body: some View {
        VStack {
            TextField("Email", text: $viewModel.email)
            SecureField("Mot de passe", text: $viewModel.password)

            Button("Connexion") {
                Task {
                    await viewModel.login()
                }
            }
        }
        .padding()
    }
}
```

L’injection peut être faite dans l’init de la vue, dans un container, ou depuis une racine d’app.

## 8. Éviter les singletons partout

Un singleton peut être pratique :

```swift
AuthService.shared
```

Mais si tout dépend de singletons, les tests deviennent plus compliqués.

Préférer :

```swift
init(authService: AuthServiceProtocol)
```

Cela rend le code plus flexible.

## Résumé

- Un service isole une responsabilité technique ou métier.
- Un protocole permet de dépendre d’une abstraction.
- L’injection de dépendance rend le ViewModel testable.
- Un mock remplace le vrai service pendant les tests.
- Évite de mettre Firebase, API ou Core Data directement dans la View.
