# Fiche 11.05 — Firebase Storage : upload/download image

## Objectif

Savoir envoyer une image dans Firebase Storage, récupérer son URL, puis stocker cette URL dans Firestore.

C’est un cas très courant : avatar, photo de profil, image d’annonce, média utilisateur.

## 1. Principe général

```text
Utilisateur choisit une image
→ conversion en Data
→ upload dans Firebase Storage
→ récupération downloadURL
→ sauvegarde de l’URL dans Firestore
```

Storage stocke le fichier. Firestore stocke les métadonnées et l’URL.

## 2. Service Storage

```swift
import FirebaseStorage
import UIKit

final class FirebaseImageStorageService {
    private let storage = Storage.storage()
    
    func uploadImage(_ image: UIImage, path: String) async throws -> URL {
        guard let data = image.jpegData(compressionQuality: 0.8) else {
            throw StorageError.invalidImage
        }
        
        let reference = storage.reference().child(path)
        let metadata = StorageMetadata()
        metadata.contentType = "image/jpeg"
        
        _ = try await reference.putDataAsync(data, metadata: metadata)
        return try await reference.downloadURL()
    }
}

enum StorageError: Error {
    case invalidImage
}
```

Le `path` doit être organisé proprement.

## 3. Exemple de path

```swift
let path = "users/\(userId)/avatar.jpg"
```

Ou :

```swift
let path = "animals/\(animalId)/main.jpg"
```

Évite les noms aléatoires non organisés partout.

## 4. Sauvegarder l’URL dans Firestore

```swift
func updateUserAvatar(userId: String, imageURL: URL) async throws {
    try await Firestore.firestore()
        .collection("users")
        .document(userId)
        .updateData([
            "avatarURL": imageURL.absoluteString
        ])
}
```

Firestore ne stocke pas directement l’image, seulement son URL.

## 5. Afficher une image distante

SwiftUI propose `AsyncImage` pour un affichage simple.

```swift
AsyncImage(url: avatarURL) { phase in
    switch phase {
    case .empty:
        ProgressView()
    case .success(let image):
        image
            .resizable()
            .scaledToFill()
    case .failure:
        Image(systemName: "person.crop.circle")
    @unknown default:
        EmptyView()
    }
}
.frame(width: 80, height: 80)
.clipShape(Circle())
```

Pour un cache image plus avancé, certaines équipes utilisent une librairie comme Kingfisher.

## 6. Upload depuis un ViewModel

```swift
@MainActor
final class AvatarViewModel: ObservableObject {
    @Published var isUploading = false
    @Published var errorMessage: String?
    
    private let storageService = FirebaseImageStorageService()
    
    func uploadAvatar(_ image: UIImage, userId: String) async {
        isUploading = true
        errorMessage = nil
        
        do {
            let url = try await storageService.uploadImage(
                image,
                path: "users/\(userId)/avatar.jpg"
            )
            try await updateUserAvatar(userId: userId, imageURL: url)
        } catch {
            errorMessage = "Impossible d’envoyer l’image."
        }
        
        isUploading = false
    }
}
```

## Points à connaître

Il faut protéger Firebase Storage avec des règles de sécurité.

Il faut aussi limiter la taille des images, compresser, et éviter d’envoyer des fichiers énormes.

## Résumé

- Firebase Storage stocke les fichiers.
- Firestore stocke plutôt les URLs et métadonnées.
- Le flux est : image → data → upload → downloadURL → Firestore.
- `AsyncImage` suffit pour afficher une image distante simple.
- Les règles de sécurité Storage sont indispensables.
