# Fiche 08.01 — @Published, sink et AnyCancellable

## Objectif

Comprendre le minimum utile de Combine dans une app SwiftUI : publier une valeur, l’écouter, stocker l’abonnement et éviter les retain cycles.

## 1. Pourquoi Combine existe ?

Combine sert à gérer des flux de valeurs dans le temps.

Exemples :

- texte tapé dans un champ ;
- état d’un ViewModel ;
- résultat d’une recherche ;
- validation de formulaire ;
- événement utilisateur ;
- données qui changent.

SwiftUI utilise déjà une partie de cette logique avec `ObservableObject` et `@Published`.

## 2. @Published

```swift
import Combine
import Foundation

final class CounterViewModel: ObservableObject {
    @Published var count = 0

    func increment() {
        count += 1
    }
}
```

Quand `count` change, les vues SwiftUI qui observent le ViewModel peuvent se recomposer.

```swift
struct CounterView: View {
    @StateObject private var viewModel = CounterViewModel()

    var body: some View {
        VStack {
            Text("Compteur : \(viewModel.count)")

            Button("+1") {
                viewModel.increment()
            }
        }
    }
}
```

Ici, pas besoin d’écrire `sink`. SwiftUI observe automatiquement l’objet.

## 3. sink

`sink` sert à écouter manuellement un publisher.

```swift
final class SearchViewModel: ObservableObject {
    @Published var query = ""

    private var cancellables = Set<AnyCancellable>()

    init() {
        $query
            .sink { newValue in
                print("Nouvelle recherche : \(newValue)")
            }
            .store(in: &cancellables)
    }
}
```

`$query` représente le publisher associé à la propriété `query`.

## 4. AnyCancellable

Un abonnement Combine doit être conservé. Sinon, il s’arrête immédiatement.

```swift
private var cancellables = Set<AnyCancellable>()
```

Puis :

```swift
.store(in: &cancellables)
```

Quand le ViewModel est détruit, les abonnements sont annulés automatiquement.

## 5. Exemple : observer une valeur et mettre à jour une autre

```swift
final class LoginViewModel: ObservableObject {
    @Published var email = ""
    @Published var password = ""
    @Published private(set) var isFormValid = false

    private var cancellables = Set<AnyCancellable>()

    init() {
        Publishers.CombineLatest($email, $password)
            .map { email, password in
                email.contains("@") && password.count >= 8
            }
            .assign(to: &$isFormValid)
    }
}
```

Ici, `isFormValid` se met à jour automatiquement quand email ou password change.

Même si on ne fait pas une fiche complète sur tous les opérateurs, il faut connaître cette logique.

## 6. Retain cycle avec sink

Quand tu utilises `self` dans un `sink`, fais attention aux retain cycles.

```swift
service.publisher
    .sink { [weak self] value in
        self?.handle(value)
    }
    .store(in: &cancellables)
```

`[weak self]` évite que le publisher garde fortement le ViewModel en mémoire.

## 7. Combine vs async/await

`async/await` est excellent pour une opération ponctuelle :

```text
charger une liste
se connecter
récupérer un profil
```

Combine est utile pour des valeurs qui changent dans le temps :

```text
recherche en direct
validation de formulaire
écoute d’un état continu
enchaînement de flux
```

## Résumé

- `@Published` publie les changements d’une propriété.
- SwiftUI observe automatiquement les `ObservableObject`.
- `sink` permet d’écouter manuellement un publisher.
- `AnyCancellable` conserve l’abonnement.
- `[weak self]` évite certains retain cycles.
- Combine reste utile pour les flux de valeurs, même avec async/await.
