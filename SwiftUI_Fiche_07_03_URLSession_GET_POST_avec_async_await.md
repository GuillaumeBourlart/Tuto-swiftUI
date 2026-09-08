# Fiche 07.03 — URLSession GET/POST avec async/await

## Objectif

Savoir faire des appels réseau simples avec `URLSession` : GET, POST, JSON, headers et gestion d’erreur basique.

## 1. Pourquoi URLSession ?

`URLSession` est l’outil natif Apple pour faire du réseau HTTP. Même si une équipe utilise Alamofire, comprendre `URLSession` permet de comprendre la base : requête, réponse, status code, JSON.

## 2. Modèle de réponse

```swift
struct Post: Identifiable, Decodable {
    let id: Int
    let title: String
    let body: String
}
```

## 3. GET simple

```swift
final class PostService {
    func fetchPosts() async throws -> [Post] {
        let url = URL(string: "https://jsonplaceholder.typicode.com/posts")!

        let (data, response) = try await URLSession.shared.data(from: url)

        guard let httpResponse = response as? HTTPURLResponse,
              200..<300 ~= httpResponse.statusCode else {
            throw URLError(.badServerResponse)
        }

        return try JSONDecoder().decode([Post].self, from: data)
    }
}
```

Étapes :

```text
URL
→ appel réseau
→ vérifier status code
→ décoder JSON
→ retourner modèle Swift
```

## 4. Utilisation dans un ViewModel

```swift
@MainActor
final class PostsViewModel: ObservableObject {
    @Published var posts: [Post] = []
    @Published var isLoading = false
    @Published var errorMessage: String?

    private let service = PostService()

    func loadPosts() async {
        isLoading = true
        errorMessage = nil

        do {
            posts = try await service.fetchPosts()
        } catch {
            errorMessage = "Impossible de charger les posts."
        }

        isLoading = false
    }
}
```

## 5. View SwiftUI

```swift
struct PostsView: View {
    @StateObject private var viewModel = PostsViewModel()

    var body: some View {
        List(viewModel.posts) { post in
            VStack(alignment: .leading) {
                Text(post.title)
                    .font(.headline)

                Text(post.body)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .overlay {
            if viewModel.isLoading {
                ProgressView()
            }
        }
        .task {
            await viewModel.loadPosts()
        }
        .alert("Erreur", isPresented: .constant(viewModel.errorMessage != nil)) {
            Button("OK") {
                viewModel.errorMessage = nil
            }
        } message: {
            Text(viewModel.errorMessage ?? "")
        }
    }
}
```

## 6. POST JSON

Exemple request :

```swift
struct CreatePostRequest: Encodable {
    let title: String
    let body: String
    let userId: Int
}
```

Service :

```swift
extension PostService {
    func createPost(title: String, body: String) async throws -> Post {
        let url = URL(string: "https://jsonplaceholder.typicode.com/posts")!

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let payload = CreatePostRequest(title: title, body: body, userId: 1)
        request.httpBody = try JSONEncoder().encode(payload)

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse,
              200..<300 ~= httpResponse.statusCode else {
            throw URLError(.badServerResponse)
        }

        return try JSONDecoder().decode(Post.self, from: data)
    }
}
```

## 7. Headers avec token

```swift
request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
```

C’est indispensable pour les APIs privées.

## 8. Limite du code simple

Le code précédent marche, mais si tu le répètes dans toute l’app, tu vas dupliquer :

- base URL ;
- headers ;
- status code ;
- décodage ;
- gestion des erreurs.

La fiche suivante montre comment centraliser ça dans un `APIClient`.

## Résumé

- `URLSession` est le client réseau natif Apple.
- `data(from:)` suffit pour un GET simple.
- `URLRequest` est nécessaire pour POST, headers et body.
- `JSONEncoder` encode le body JSON.
- `JSONDecoder` décode la réponse.
- Il faut vérifier le status code.
- Pour une vraie app, on centralise le réseau dans un `APIClient`.
