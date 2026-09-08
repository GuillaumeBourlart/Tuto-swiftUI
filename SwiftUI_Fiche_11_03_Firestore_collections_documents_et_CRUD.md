# Fiche 11.03 — Firestore : collections, documents et CRUD

## Objectif

Comprendre les bases de Firestore : collections, documents et opérations CRUD.

Firestore est une base NoSQL organisée en collections et documents.

## 1. Collections et documents

```text
users/abc123
posts/post001
animals/animal001
```

Une collection contient des documents.

Un document contient des champs.

```json
{
  "name": "Milo",
  "type": "Chat",
  "createdAt": "..."
}
```

## 2. Modèle Codable

```swift
import FirebaseFirestore

struct Animal: Identifiable, Codable {
    @DocumentID var id: String?
    let name: String
    let type: String
    let ownerId: String
    let createdAt: Date
}
```

`@DocumentID` permet de récupérer l’identifiant du document Firestore.

## 3. Service Firestore

```swift
import FirebaseFirestore

final class AnimalFirestoreService {
    private let db = Firestore.firestore()
    
    private var collection: CollectionReference {
        db.collection("animals")
    }
}
```

On centralise les accès Firestore dans un service.

## 4. Create

`addDocument(from:)` est **synchrone** et `throws` (l’encodage Codable peut échouer), mais il n’est **pas `async`** : il renvoie tout de suite et l’écriture part en arrière-plan (modèle offline-first de Firestore). Ne le marque donc pas comme s’il était attendu :

```swift
func createAnimal(_ animal: Animal) throws {
    _ = try collection.addDocument(from: animal)
}
```

Firestore crée un document avec un id automatique.

Si tu veux **attendre la confirmation serveur** (afficher un succès seulement une fois écrit côté Firebase), passe par la version à complétion, repackagée en `async` avec une continuation :

```swift
func createAnimalAwaitingServer(_ animal: Animal) async throws {
    try await withCheckedThrowingContinuation { continuation in
        do {
            _ = try collection.addDocument(from: animal) { error in
                if let error {
                    continuation.resume(throwing: error)
                } else {
                    continuation.resume()
                }
            }
        } catch {
            continuation.resume(throwing: error) // erreur d'encodage
        }
    }
}
```

## 5. Read

```swift
func fetchAnimals() async throws -> [Animal] {
    let snapshot = try await collection
        .order(by: "createdAt", descending: true)
        .getDocuments()
    
    return try snapshot.documents.compactMap { document in
        try document.data(as: Animal.self)
    }
}
```

## 6. Update

```swift
func updateAnimalName(id: String, name: String) async throws {
    try await collection.document(id).updateData([
        "name": name
    ])
}
```

`updateData` modifie seulement certains champs.

## 7. Delete

```swift
func deleteAnimal(id: String) async throws {
    try await collection.document(id).delete()
}
```

## 8. Utilisation dans un ViewModel

```swift
@MainActor
final class AnimalsViewModel: ObservableObject {
    @Published var animals: [Animal] = []
    @Published var isLoading = false
    @Published var errorMessage: String?
    
    private let service = AnimalFirestoreService()
    
    func loadAnimals() async {
        isLoading = true
        errorMessage = nil
        
        do {
            animals = try await service.fetchAnimals()
        } catch {
            errorMessage = "Impossible de charger les animaux."
        }
        
        isLoading = false
    }
}
```

## Points à connaître

Firestore est très pratique, mais les règles de sécurité sont indispensables.

Il faut aussi faire attention aux lectures : un listener ou une requête mal utilisée peut coûter cher.

## Résumé

- Firestore fonctionne avec collections et documents.
- Les modèles peuvent être `Codable`.
- Les opérations principales sont create, read, update, delete.
- Il vaut mieux passer par un service.
- Les règles de sécurité sont obligatoires en production.
