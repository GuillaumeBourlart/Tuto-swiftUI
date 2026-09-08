# Fiche 07.05 — Auth REST propriétaire : login, token, refresh, logout

## Objectif

Comprendre comment fonctionne une authentification propriétaire via API REST côté app iOS : login, register, access token, refresh token, stockage Keychain, refresh et logout.

## 1. Firebase Auth vs auth propriétaire

Avec Firebase Auth, tu utilises le SDK Firebase.

Avec une API propriétaire, ton app parle au backend avec HTTP :

```text
POST /login
POST /register
POST /refresh-token
POST /logout
GET /me
```

Donc tu utilises `URLSession` ou Alamofire.

## 2. Access token et refresh token

```text
access token  → utilisé pour appeler l’API privée
refresh token → utilisé pour obtenir un nouvel access token
```

L’access token expire vite. Le refresh token dure souvent plus longtemps.

Les tokens ne doivent pas être stockés dans `UserDefaults` ou `AppStorage`. On utilise Keychain.

## 3. Modèles

```swift
struct LoginRequest: Encodable {
    let email: String
    let password: String
}

struct AuthResponse: Decodable {
    let accessToken: String
    let refreshToken: String
    let user: UserDTO
}

struct UserDTO: Decodable {
    let id: String
    let email: String
}
```

## 4. AuthService

```swift
protocol AuthServiceProtocol {
    func login(email: String, password: String) async throws -> UserDTO
    func refreshToken() async throws
    func logout() async throws
}
```

Implémentation simplifiée :

```swift
final class AuthService: AuthServiceProtocol {
    private let apiClient: APIClient
    private let keychain: KeychainServiceProtocol

    init(apiClient: APIClient, keychain: KeychainServiceProtocol) {
        self.apiClient = apiClient
        self.keychain = keychain
    }

    func login(email: String, password: String) async throws -> UserDTO {
        let body = LoginRequest(email: email, password: password)

        let response: AuthResponse = try await apiClient.request(
            Endpoint(path: "/login", method: .post, requiresAuth: false),
            body: body
        )

        try keychain.save(response.accessToken, key: "accessToken")
        try keychain.save(response.refreshToken, key: "refreshToken")

        return response.user
    }

    func refreshToken() async throws {
        // POST /refresh-token avec le refresh token
    }

    func logout() async throws {
        // /logout renvoie souvent un 204 No Content (corps VIDE).
        // Décoder un corps vide ferait planter JSONDecoder : on utilise donc
        // un appel qui ne décode pas de réponse (voir `send` ci-dessous).
        // On nettoie le Keychain quoi qu'il arrive (même si le réseau échoue).
        try? await apiClient.send(
            Endpoint(path: "/logout", method: .post, requiresAuth: true)
        )

        try keychain.delete(key: "accessToken")
        try keychain.delete(key: "refreshToken")
    }
}
```

⚠️ **Piège classique** : faire `try await apiClient.request(...) as EmptyResponse` sur un `204 No Content` lève une erreur de décodage, parce que `JSONDecoder` ne peut pas décoder un corps vide. Pour les endpoints sans réponse, l’APIClient a besoin d’une méthode qui **n’essaie pas de décoder** :

```swift
extension APIClient {
    // Variante sans décodage : pour les endpoints qui renvoient 204 / corps vide.
    func send(_ endpoint: Endpoint, body: Encodable? = nil) async throws {
        let url = baseURL.appendingPathComponent(endpoint.path)
        var request = URLRequest(url: url)
        request.httpMethod = endpoint.method.rawValue
        if endpoint.requiresAuth, let token = tokenProvider() {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        if let body { request.httpBody = try encoder.encode(AnyEncodable(body)) }

        let (_, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse, 200..<300 ~= http.statusCode else {
            throw APIError.invalidResponse
        }
        // On ignore volontairement le corps : rien à décoder.
    }
}
```

L’exemple montre surtout le flux. En pratique, l’API exacte dépend du backend.

## 5. AuthState global

L’app doit savoir si l’utilisateur est connecté.

```swift
@MainActor
@Observable
final class AuthState {
    private(set) var isAuthenticated = false
    private(set) var currentUser: UserDTO?

    private let authService: AuthServiceProtocol

    init(authService: AuthServiceProtocol) {
        self.authService = authService
    }

    func login(email: String, password: String) async {
        do {
            let user = try await authService.login(email: email, password: password)
            currentUser = user
            isAuthenticated = true
        } catch {
            isAuthenticated = false
        }
    }

    func logout() async {
        try? await authService.logout()
        currentUser = nil
        isAuthenticated = false
    }
}
```

## 6. Redirection dans AppRootView

```swift
struct AppRootView: View {
    // @Observable : on possède l'objet avec @State (remplace @StateObject)
    @State private var authState: AuthState

    var body: some View {
        if authState.isAuthenticated {
            MainTabView()
                .environment(authState)   // remplace .environmentObject
        } else {
            LoginView()
                .environment(authState)
        }
    }
}
```

Le root décide quel flow afficher. Côté écrans enfants, on lit l’objet avec `@Environment(AuthState.self) private var authState` (voir fiche 02.11 sur `@Observable`).

## 7. Refresh token en principe

Quand une requête renvoie `401 Unauthorized` :

```text
1. L’APIClient détecte 401
2. Il appelle /refresh-token
3. Il sauvegarde le nouveau access token
4. Il retente la requête initiale
5. Si refresh échoue → logout
```

Tu n’as pas besoin de connaître toutes les variantes, mais il faut comprendre cette logique.

⚠️ Piège réel : si plusieurs requêtes échouent en `401` **en même temps**, elles vont toutes déclencher un refresh en parallèle → double refresh, tokens invalidés mutuellement. En production on **sérialise** le refresh (un seul à la fois, les autres attendent son résultat) — c’est le pattern « single-flight », souvent implémenté avec un `actor`. (Couvert en détail dans la partie réseau de production.)

## 8. Discours entretien

Tu peux dire :

> “J’ai surtout utilisé Firebase Auth. Pour une auth propriétaire, côté iOS le principe est clair : appels REST via URLSession ou Alamofire, récupération des tokens, stockage Keychain, AuthState global, refresh token et logout propre.”

## Résumé

- Une auth propriétaire passe par une API REST.
- L’app reçoit souvent un access token et un refresh token.
- Les tokens doivent être stockés dans Keychain.
- L’access token sert aux requêtes privées.
- Le refresh token permet de renouveler la session.
- `AuthState` permet de piloter login/app principale/logout.
