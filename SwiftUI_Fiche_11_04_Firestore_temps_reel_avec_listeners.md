# Fiche 11.04 — Firestore temps réel avec listeners

## Objectif

Comprendre comment écouter les changements Firestore en temps réel avec un listener.

C’est utile pour un chat, un feed live, des notifications internes ou une liste collaborative.

## 1. Requête classique vs listener

Requête classique :

```text
Je demande les données une fois.
```

Listener :

```text
Je reste abonné, et Firestore me prévient quand les données changent.
```

## 2. Ajouter un listener

```swift
import FirebaseFirestore

final class RealtimeAnimalService {
    private let db = Firestore.firestore()
    private var listener: ListenerRegistration?
    
    func listenAnimals(onChange: @escaping ([Animal]) -> Void) {
        listener = db.collection("animals")
            .order(by: "createdAt", descending: true)
            .addSnapshotListener { snapshot, error in
                guard let documents = snapshot?.documents else {
                    onChange([])
                    return
                }
                
                let animals = documents.compactMap { document in
                    try? document.data(as: Animal.self)
                }
                
                onChange(animals)
            }
    }
    
    func stopListening() {
        listener?.remove()
        listener = nil
    }
}
```

`ListenerRegistration` permet d’arrêter l’écoute.

## 3. Utilisation dans un ViewModel

```swift
@MainActor
final class RealtimeAnimalsViewModel: ObservableObject {
    @Published var animals: [Animal] = []
    
    private let service = RealtimeAnimalService()
    
    func startListening() {
        service.listenAnimals { [weak self] animals in
            Task { @MainActor in
                self?.animals = animals
            }
        }
    }
    
    func stopListening() {
        service.stopListening()
    }
}
```

Comme le callback peut arriver hors du main thread, on repasse sur `MainActor` pour mettre à jour l’UI.

## 4. Vue SwiftUI

```swift
struct RealtimeAnimalsView: View {
    @StateObject private var viewModel = RealtimeAnimalsViewModel()
    
    var body: some View {
        List(viewModel.animals) { animal in
            Text(animal.name)
        }
        .task {
            viewModel.startListening()
        }
        .onDisappear {
            viewModel.stopListening()
        }
    }
}
```

## 5. Attention aux coûts

Un listener peut rester actif longtemps.

À surveiller :

- listeners inutiles ;
- listeners sur de grosses collections ;
- absence de filtres ;
- écoute active sur un écran qui n’est plus visible ;
- règles de sécurité mal configurées.

## 6. Filtrer un listener

```swift
db.collection("animals")
    .whereField("ownerId", isEqualTo: userId)
    .order(by: "createdAt", descending: true)
    .addSnapshotListener { snapshot, error in
        // ...
    }
```

Filtrer réduit les données chargées et rend l’app plus propre.

## Résumé

- Un listener Firestore écoute les changements en temps réel.
- Il faut conserver le `ListenerRegistration`.
- Il faut appeler `remove()` quand l’écoute n’est plus nécessaire.
- Les callbacks doivent mettre à jour l’UI sur le main thread.
- Les listeners doivent être filtrés et utilisés avec prudence.
