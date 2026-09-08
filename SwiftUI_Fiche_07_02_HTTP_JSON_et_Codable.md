# Fiche 07.02 — HTTP, JSON et Codable

## Objectif

Comprendre les bases nécessaires pour parler à une API REST depuis une app iOS : méthode HTTP, URL, headers, body JSON, status code et décodage avec `Codable`.

## 1. HTTP en version simple

Une app mobile parle souvent à un backend via HTTP.

Une requête contient généralement :

```text
URL       → https://api.exemple.com/users
Method    → GET / POST / PUT / PATCH / DELETE
Headers   → Content-Type, Authorization...
Body      → données envoyées, souvent JSON
Response  → status code + body JSON
```

## 2. Méthodes principales

```text
GET     → récupérer des données
POST    → créer une ressource ou envoyer une action
PUT     → remplacer une ressource
PATCH   → modifier partiellement une ressource
DELETE  → supprimer une ressource
```

Exemples :

```text
GET /posts
POST /login
PATCH /users/me
DELETE /favorites/123
```

## 3. JSON

JSON est un format texte très utilisé pour échanger des données.

Exemple réponse API :

```json
{
  "id": "1",
  "name": "Guillaume",
  "email": "guillaume@email.com"
}
```

En Swift, on transforme ce JSON en struct.

## 4. Codable

```swift
struct UserDTO: Codable {
    let id: String
    let name: String
    let email: String
}
```

`Codable` signifie que le type peut être encodé et décodé.

- `Decodable` : JSON → Swift
- `Encodable` : Swift → JSON
- `Codable` : les deux

## 5. Décoder du JSON

```swift
let json = """
{
  "id": "1",
  "name": "Guillaume",
  "email": "guillaume@email.com"
}
""".data(using: .utf8)!

let user = try JSONDecoder().decode(UserDTO.self, from: json)
print(user.name)
```

Dans une vraie app, les données viennent de `URLSession`.

## 6. Encoder du JSON

```swift
struct LoginRequest: Encodable {
    let email: String
    let password: String
}

let request = LoginRequest(
    email: "test@email.com",
    password: "password123"
)

let body = try JSONEncoder().encode(request)
```

Ce `body` peut être envoyé dans une requête POST.

## 7. Headers importants

Exemples classiques :

```text
Content-Type: application/json
Authorization: Bearer access_token
Accept: application/json
```

En Swift :

```swift
urlRequest.setValue("application/json", forHTTPHeaderField: "Content-Type")
urlRequest.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
```

## 8. Status codes utiles

```text
200 → OK
201 → Created
204 → No Content
400 → Bad Request
401 → Unauthorized
403 → Forbidden
404 → Not Found
500 → Server Error
```

Une bonne app ne regarde pas seulement si elle reçoit des données. Elle vérifie aussi le status code.

## 9. DTO vs Model

DTO : format proche de l’API.

```swift
struct UserDTO: Decodable {
    let id: String
    let full_name: String
}
```

Model : format propre à l’app.

```swift
struct User {
    let id: String
    let fullName: String
}
```

Mapping :

```swift
extension UserDTO {
    func toModel() -> User {
        User(id: id, fullName: full_name)
    }
}
```

Pour une petite app, tu peux parfois utiliser le même type. Pour une app pro, séparer DTO et Model évite de dépendre trop fortement du backend.

## Résumé

- HTTP permet à l’app de parler au backend.
- Les méthodes principales sont GET, POST, PUT, PATCH, DELETE.
- JSON est le format le plus courant pour les APIs REST.
- `Codable` permet d’encoder et décoder facilement.
- Les headers transportent des informations comme le token.
- Les status codes doivent être vérifiés.
- DTO et Model peuvent être séparés pour garder une app propre.
