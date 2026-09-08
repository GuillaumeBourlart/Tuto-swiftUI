# Fiche 07.06 — Alamofire en pratique

## Objectif

Comprendre à quoi sert Alamofire, comment faire des requêtes simples, et comment en parler en entretien même si ton socle principal reste URLSession.

## 1. Pourquoi Alamofire ?

Alamofire est une librairie réseau populaire dans l’écosystème iOS. Elle simplifie certaines tâches :

- requêtes HTTP ;
- paramètres ;
- headers ;
- décodage ;
- upload ;
- retry ;
- interception.

Mais les concepts restent les mêmes qu’avec URLSession : endpoint, méthode, headers, body, réponse, erreurs.

## 2. Installation rapide

Avec Swift Package Manager :

```text
Xcode
→ File
→ Add Package Dependencies
→ coller l’URL GitHub d’Alamofire
→ choisir la version
→ ajouter au target
```

Puis :

```swift
import Alamofire
```

## 3. GET simple

```swift
import Alamofire

struct Post: Decodable, Identifiable {
    let id: Int
    let title: String
    let body: String
}

final class AlamofirePostService {
    func fetchPosts() async throws -> [Post] {
        try await AF.request("https://jsonplaceholder.typicode.com/posts")
            .serializingDecodable([Post].self)
            .value
    }
}
```

Le code est plus court qu’avec `URLSession`, surtout pour le décodage.

## 4. POST JSON

```swift
struct LoginRequest: Encodable {
    let email: String
    let password: String
}

struct LoginResponse: Decodable {
    let accessToken: String
}

final class AlamofireAuthService {
    func login(email: String, password: String) async throws -> LoginResponse {
        let body = LoginRequest(email: email, password: password)

        return try await AF.request(
            "https://api.exemple.com/login",
            method: .post,
            parameters: body,
            encoder: JSONParameterEncoder.default
        )
        .serializingDecodable(LoginResponse.self)
        .value
    }
}
```

## 5. Headers avec Bearer token

```swift
let headers: HTTPHeaders = [
    "Authorization": "Bearer \(accessToken)",
    "Accept": "application/json"
]

let user: UserDTO = try await AF.request(
    "https://api.exemple.com/me",
    headers: headers
)
.serializingDecodable(UserDTO.self)
.value
```

## 6. Gestion d’erreur simple

```swift
do {
    let posts = try await service.fetchPosts()
    print(posts)
} catch {
    print("Erreur réseau : \(error)")
}
```

Dans une app pro, tu peux mapper les erreurs Alamofire vers tes propres erreurs :

```swift
enum NetworkError: Error {
    case unauthorized
    case serverError
    case decoding
    case unknown
}
```

## 7. Upload en principe

Alamofire est souvent apprécié pour l’upload.

```swift
AF.upload(
    multipartFormData: { formData in
        formData.append(imageData, withName: "file", fileName: "photo.jpg", mimeType: "image/jpeg")
    },
    to: "https://api.exemple.com/upload"
)
```

Pas besoin de tout maîtriser maintenant. Il faut surtout comprendre que c’est utile pour simplifier des requêtes plus avancées.

## 8. Discours entretien

Tu peux dire :

> “Je sais faire le réseau avec URLSession, Codable et async/await. Si le projet utilise Alamofire, je peux m’adapter rapidement, car les concepts restent les mêmes : requête, méthode, headers, body, réponse et erreurs.”

C’est un discours crédible.

## Résumé

- Alamofire simplifie le réseau HTTP.
- Les concepts sont les mêmes qu’avec URLSession.
- `AF.request` permet de faire GET/POST rapidement.
- `serializingDecodable` décode directement une réponse JSON.
- Les headers servent notamment au Bearer token.
- Il faut savoir l’utiliser simplement, pas forcément maîtriser toute la partie avancée.
