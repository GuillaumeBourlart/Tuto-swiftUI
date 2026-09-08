# Fiche 07.01 — async/await, Task, .task et @MainActor

## Objectif

Comprendre la concurrence moderne en Swift pour charger des données sans bloquer l’interface. C’est indispensable pour les appels réseau, Firebase, fichiers, images et traitements longs.

## 1. Le problème

Une app ne doit jamais bloquer l’interface pendant un chargement.

Mauvais principe :

```swift
// Bloque le thread principal si le traitement est lourd
let data = loadDataSynchronously()
```

Bon principe :

```swift
let data = try await loadData()
```

`await` marque un point de suspension possible. Il ne garantit ni suspension effective ni exécution en arrière-plan : une fonction async contenant du calcul synchrone lourd peut toujours bloquer le main actor. Le service doit effectuer le travail sur une isolation adaptée.

## 2. Fonction async

```swift
func fetchUser() async throws -> User {
    // appel réseau ou Firebase
    User(id: "1", name: "Guillaume")
}
```

Une fonction `async` peut être suspendue pendant son exécution.

Une fonction `throws` peut lancer une erreur.

On l’appelle avec :

```swift
let user = try await fetchUser()
```

## 3. Task dans une action utilisateur

Dans un bouton SwiftUI, on ne peut pas directement faire `await` dans une closure classique. On utilise `Task`.

```swift
Button("Charger") {
    Task {
        await viewModel.loadData()
    }
}
```

`Task { }` crée une tâche non structurée qui hérite notamment du contexte d’acteur. Elle n’est pas annulée automatiquement quand la vue disparaît. Conserve sa référence et annule-la si le besoin le demande.

## 4. .task sur une vue

`.task` lance une action asynchrone quand la vue apparaît.

```swift
struct UserView: View {
    @StateObject private var viewModel = UserViewModel()

    var body: some View {
        content
            .task {
                await viewModel.loadUser()
            }
    }

    @ViewBuilder
    private var content: some View {
        if viewModel.isLoading {
            ProgressView()
        } else {
            Text(viewModel.userName)
        }
    }
}
```

`.task` est souvent préférable à `onAppear` pour du code async lié à la vue. SwiftUI demande son annulation à la disparition ; l’opération doit coopérer. Une nouvelle apparition peut relancer le travail. `.task(id:)` annule et relance aussi lorsque son identifiant change. Les modèles `ObservableObject` de cette fiche restent valables ; la version Observation est expliquée en 02.11.

## 5. @MainActor

Les mises à jour de l’interface doivent se faire sur le thread principal. Avec SwiftUI, on marque souvent le ViewModel en `@MainActor`.

```swift
@MainActor
final class UserViewModel: ObservableObject {
    @Published var isLoading = false
    @Published var userName = ""

    func loadUser() async {
        isLoading = true
        defer { isLoading = false }

        do {
            try await Task.sleep(nanoseconds: 500_000_000)
            userName = "Guillaume"
        } catch {
            guard !Task.isCancelled else { return }
            userName = "Erreur"
        }
    }
}
```

`@MainActor` simplifie la sécurité des mises à jour UI.

## 6. do/catch

```swift
func loadUser() async {
    isLoading = true
    errorMessage = nil

    do {
        let user = try await service.fetchUser()
        try Task.checkCancellation()
        self.user = user
    } catch {
        guard !Task.isCancelled else { return }
        errorMessage = "Impossible de charger l’utilisateur."
    }

    isLoading = false
}
```

`do/catch` est indispensable pour les appels réseau ou services qui peuvent échouer.

## 7. Cancellation simple

Une tâche peut être annulée, par exemple si l’utilisateur quitte l’écran.

```swift
func search() async {
    do {
        try Task.checkCancellation()
        let results = try await service.search()
        try Task.checkCancellation()
        self.results = results
    } catch is CancellationError {
        // L’utilisateur a quitté ou la recherche a été annulée
    } catch {
        guard !Task.isCancelled else { return }
        errorMessage = "Erreur de recherche"
    }
}
```

Tu n’as pas besoin de maîtriser tous les détails au début, mais il faut savoir qu’une tâche peut être annulée.

## 8. Pull to refresh

```swift
struct FeedView: View {
    @StateObject private var viewModel = FeedViewModel()

    var body: some View {
        List(viewModel.items) { item in
            Text(item.title)
        }
        .task {
            await viewModel.load()
        }
        .refreshable {
            await viewModel.load()
        }
    }
}
```

`refreshable` fonctionne naturellement avec `async/await`.

## Résumé

- `async` définit une fonction asynchrone.
- `await` attend son résultat.
- `Task` lance du code async depuis une action.
- `.task` lance du code async quand une vue apparaît.
- `@MainActor` protège les mises à jour UI.
- `do/catch` gère les erreurs.
- `refreshable` permet un pull-to-refresh async simple.

## Exercice

Reproduis la recherche de la [fiche 01.08](fiche_01_08_identite_cycle_de_vie.md). Tape rapidement puis efface le champ. Aucun ancien résultat ne doit remplacer la dernière recherche, et une annulation ne doit pas être affichée comme une panne.

## Référence

[Concurrence — The Swift Programming Language](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/concurrency/) : suspension, tâches et annulation coopérative.
