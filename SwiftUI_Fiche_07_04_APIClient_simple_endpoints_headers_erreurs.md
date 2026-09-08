# Fiche 07.04 — APIClient simple : endpoints, headers, erreurs

## Objectif

Savoir centraliser les appels réseau dans un `APIClient` simple et professionnel. Le but est d’éviter de répéter `URLSession`, les headers, le décodage JSON et la gestion des erreurs dans tous les services.

## 1. Pourquoi un APIClient ?

Sans `APIClient`, chaque service peut répéter :

```swift
let (data, response) = try await URLSession.shared.data(for: request)
// vérifier status code
// décoder JSON
// gérer erreur
```

Un `APIClient` permet de regrouper cette logique.

## 2. Erreurs réseau typées

```swift
enum APIError: Error, Equatable {
    case invalidURL
    case invalidResponse
    case unauthorized                       // 401
    case clientError(status: Int, message: String?) // 400, 403, 404, 422...
    case serverError(status: Int)           // 5xx
    case decodingError
    case unknown(status: Int)
}
```

C’est mieux que de renvoyer seulement `URLError` partout. Surtout, **ne mets pas tous les codes d’erreur dans un seul `unknown`** : un `404`, un `403` ou un `422` doivent rester distincts pour pouvoir afficher un message utile (ressource introuvable, accès refusé, formulaire invalide…).

## 3. Endpoint simple

```swift
enum HTTPMethod: String {
    case get = "GET"
    case post = "POST"
    case patch = "PATCH"
    case delete = "DELETE"
}

struct Endpoint {
    let path: String
    let method: HTTPMethod
    let requiresAuth: Bool
}
```

Exemples :

```swift
extension Endpoint {
    static let posts = Endpoint(path: "/posts", method: .get, requiresAuth: false)
    static let profile = Endpoint(path: "/me", method: .get, requiresAuth: true)
}
```

## 4. APIClient

```swift
final class APIClient {
    private let baseURL = URL(string: "https://api.exemple.com")!
    private let tokenProvider: () -> String?

    // Un seul decoder/encoder configuré et réutilisé, plutôt qu'un neuf à chaque requête.
    private let decoder: JSONDecoder = {
        let d = JSONDecoder()
        d.keyDecodingStrategy = .convertFromSnakeCase // created_at -> createdAt
        d.dateDecodingStrategy = .iso8601
        return d
    }()

    private let encoder: JSONEncoder = {
        let e = JSONEncoder()
        e.keyEncodingStrategy = .convertToSnakeCase
        return e
    }()

    init(tokenProvider: @escaping () -> String? = { nil }) {
        self.tokenProvider = tokenProvider
    }

    func request<Response: Decodable>(
        _ endpoint: Endpoint,
        body: Encodable? = nil
    ) async throws -> Response {
        let url = baseURL.appendingPathComponent(endpoint.path)

        var request = URLRequest(url: url)
        request.httpMethod = endpoint.method.rawValue
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("application/json", forHTTPHeaderField: "Accept")

        if endpoint.requiresAuth {
            guard let token = tokenProvider() else {
                throw APIError.unauthorized
            }
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        if let body {
            request.httpBody = try encoder.encode(AnyEncodable(body))
        }

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }

        switch httpResponse.statusCode {
        case 200..<300:
            do {
                return try decoder.decode(Response.self, from: data)
            } catch {
                throw APIError.decodingError
            }

        case 401:
            throw APIError.unauthorized

        case 400..<500:
            // 400, 403, 404, 422... On tente de décoder le message d'erreur du backend.
            throw APIError.clientError(
                status: httpResponse.statusCode,
                message: APIErrorBody.decodeMessage(from: data, using: decoder)
            )

        case 500..<600:
            throw APIError.serverError(status: httpResponse.statusCode)

        default:
            throw APIError.unknown(status: httpResponse.statusCode)
        }
    }
}

// Beaucoup d'API renvoient { "message": "..." } ou { "error": "..." } en cas d'erreur.
private struct APIErrorBody: Decodable {
    let message: String?
    let error: String?

    static func decodeMessage(from data: Data, using decoder: JSONDecoder) -> String? {
        guard let body = try? decoder.decode(APIErrorBody.self, from: data) else { return nil }
        return body.message ?? body.error
    }
}
```

Côté UI, tu peux ensuite mapper proprement :

```swift
extension APIError {
    var userMessage: String {
        switch self {
        case .unauthorized:                 return "Session expirée, reconnecte-toi."
        case .clientError(404, _):          return "Élément introuvable."
        case .clientError(_, let message):  return message ?? "Requête invalide."
        case .serverError:                  return "Le serveur a un souci, réessaie plus tard."
        case .decodingError, .invalidResponse, .invalidURL, .unknown:
            return "Une erreur est survenue."
        }
    }
}
```

## 5. AnyEncodable simple

Swift ne permet pas d’encoder directement un `Encodable` existentiel dans certains cas. On peut utiliser un wrapper.

```swift
struct AnyEncodable: Encodable {
    private let encodeClosure: (Encoder) throws -> Void

    init(_ encodable: Encodable) {
        self.encodeClosure = encodable.encode
    }

    func encode(to encoder: Encoder) throws {
        try encodeClosure(encoder)
    }
}
```

Pour un cours, retiens surtout l’idée : l’APIClient encode le body et décode la réponse.

## 6. Utilisation dans un service

```swift
struct PostDTO: Decodable, Identifiable {
    let id: Int
    let title: String
    let body: String
}

final class PostAPIService {
    private let apiClient: APIClient

    init(apiClient: APIClient) {
        self.apiClient = apiClient
    }

    func fetchPosts() async throws -> [PostDTO] {
        try await apiClient.request(.posts)
    }
}
```

Le service devient très court.

## 7. Token provider

Exemple :

```swift
let apiClient = APIClient {
    keychainService.getAccessToken()
}
```

Le client réseau ne sait pas comment le token est stocké. Il demande juste une valeur.

## Points à connaître

Un APIClient doit rester simple. Ne crée pas une architecture réseau énorme si l’app est petite.

Centralise au minimum : base URL, headers, status codes, décodage, erreurs.

Si l’équipe utilise Alamofire, l’idée reste la même : centraliser les appels dans une couche réseau.

## Résumé

- Un `APIClient` évite la duplication réseau.
- Un `Endpoint` décrit path, méthode et auth.
- Les erreurs typées rendent le code plus clair.
- Les services utilisent l’APIClient au lieu de manipuler `URLSession` partout.
- Le token peut être injecté via un provider.
