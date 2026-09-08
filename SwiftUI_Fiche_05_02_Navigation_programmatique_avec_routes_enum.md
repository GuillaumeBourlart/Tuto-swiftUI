# Fiche 05.02 — Navigation programmatique avec routes enum

> **Repère :** pour comprendre d’abord pourquoi changer une variable ouvre un écran, lis [05.04 — Navigation pilotée par l’état](fiche_05_04_navigation_pilotee_par_etat.md). Les exemples ciblent iOS 17+.

## Objectif

Comprendre comment déclencher une navigation depuis une action : bouton, résultat d’API, connexion réussie ou sélection métier.

## 1. Pourquoi la navigation programmatique ?

`NavigationLink` est très pratique quand l’utilisateur clique directement sur une cellule.

Mais parfois, la navigation dépend d’une logique :

- après un login réussi ;
- après la création d’un compte ;
- après un scan terminé ;
- après le choix d’un élément dans une action custom ;
- après un appel réseau.

Dans ce cas, on peut piloter la navigation avec un état.

## 2. Créer une enum Route

Une route représente un écran possible.

```swift
import SwiftUI

struct User: Hashable, Identifiable {
    let id: UUID
    let name: String
}

enum AppRoute: Hashable {
    case profile(User)
    case settings
    case detail(id: UUID)
}
```

`Hashable` est nécessaire pour être utilisé avec la navigation typée.

## 3. Navigation avec path

```swift
struct ProgrammaticNavigationView: View {
    @State private var path: [AppRoute] = []

    var body: some View {
        NavigationStack(path: $path) {
            VStack(spacing: 16) {
                Button("Voir le profil") {
                    let user = User(id: UUID(), name: "Guillaume")
                    path.append(.profile(user))
                }

                Button("Réglages") {
                    path.append(.settings)
                }
            }
            .navigationTitle("Accueil")
            .navigationDestination(for: AppRoute.self) { route in
                switch route {
                case .profile(let user):
                    ProfileView(user: user)

                case .settings:
                    SettingsView()

                case .detail(let id):
                    DetailView(id: id)
                }
            }
        }
    }
}

struct ProfileView: View {
    let user: User

    var body: some View {
        Text("Profil de \(user.name)")
            .navigationTitle("Profil")
    }
}

struct SettingsView: View {
    var body: some View {
        Text("Réglages")
            .navigationTitle("Réglages")
    }
}

struct DetailView: View {
    let id: UUID

    var body: some View {
        Text("Détail : \(id.uuidString)")
            .navigationTitle("Détail")
    }
}
```

Ici, on ne met pas directement l’écran dans le bouton. On ajoute une route dans `path`, et SwiftUI affiche l’écran correspondant.

## 4. Navigation après action asynchrone

Exemple de push après une action simulée. Ce n’est pas une architecture d’authentification : une session qui remplace le login utilise plutôt un changement de racine (05.03 et 05.06).

```swift
struct LoginNavigationView: View {
    @State private var path: [AppRoute] = []
    @State private var isLoading = false

    var body: some View {
        NavigationStack(path: $path) {
            VStack {
                Button(isLoading ? "Connexion..." : "Se connecter") {
                    Task {
                        await login()
                    }
                }
                .disabled(isLoading)
            }
            .navigationDestination(for: AppRoute.self) { route in
                switch route {
                case .settings:
                    SettingsView()
                case .profile(let user):
                    ProfileView(user: user)
                case .detail(let id):
                    DetailView(id: id)
                }
            }
        }
    }

    private func login() async {
        isLoading = true
        defer { isLoading = false }

        // Simulation d’appel réseau
        do {
            try await Task.sleep(nanoseconds: 500_000_000)
            try Task.checkCancellation()
            let user = User(id: UUID(), name: "Guillaume")
            path.append(.profile(user))
        } catch {
            // Annulation de cette simulation : ne pas naviguer.
            // Dans une vraie action réseau, afficher les autres erreurs.
        }
    }
}
```

Dans une vraie app, le ViewModel peut exposer un état, et la vue réagit à cet état pour naviguer.

## 5. Navigation et ViewModel

Le modèle peut exposer un résultat métier, et la vue décider d’une présentation. Évite un booléen `loginSucceeded` qui reste vrai et peut rejouer une navigation à chaque nouvel observateur. Pour une session, un état durable de session sélectionne la racine ; pour une création, un résultat ponctuel peut fournir l’identifiant à ouvrir.

Trois organisations sont possibles : état local dans la vue, état de navigation dans un objet partagé, ou Router avec actions. Choisis selon les besoins de coordination et de test, pas pour ajouter un pattern. Le ViewModel n’a pas besoin de fabriquer une vue SwiftUI. L’atelier 05.06 montre une route en attente consommée une seule fois à la fermeture de la sheet.

Une `Task { }` créée dans le bouton n’est pas annulée automatiquement à la disparition de la vue. Dans une vraie action pouvant survivre à l’écran, conserve une référence pour l’annuler selon le besoin ou vérifie encore la pertinence du résultat avant de naviguer. `.task` et `.task(id:)` conviennent au travail lié à la présence et aux entrées de la vue.

## En UIKit (rappel)

En UIKit, on garde une référence au `UINavigationController` et on pousse/dépile les écrans à la main, au moment voulu.

```swift
// Push direct après une action (ex : login réussi)
let profileVC = ProfileViewController(user: user)
navigationController?.pushViewController(profileVC, animated: true)

// Dépiler (équivalent du retour)
navigationController?.popViewController(animated: true)
```

Pour découpler la logique de la création des écrans, on passait souvent par un Coordinator piloté par une enum de routes :

```swift
enum AppRoute {
    case profile(User)
    case settings
    case detail(id: UUID)
}

final class AppCoordinator {
    private let navigationController: UINavigationController

    init(navigationController: UINavigationController) {
        self.navigationController = navigationController
    }

    func navigate(to route: AppRoute) {
        let vc: UIViewController
        switch route {
        case .profile(let user): vc = ProfileViewController(user: user)
        case .settings:          vc = SettingsViewController()
        case .detail(let id):    vc = DetailViewController(id: id)
        }
        navigationController.pushViewController(vc, animated: true)
    }
}
```

La mentalité est impérative : c'est *toi* qui ordonnes `push`/`pop` au bon moment et qui instancies le bon VC. En SwiftUI, c'est déclaratif : tu décris un tableau de routes et la pile se reconstruit toute seule pour refléter cet état.

👉 En SwiftUI : `path.append(route)` remplace le `pushViewController`, et `NavigationStack(path:)` reconstruit la pile à partir du tableau de routes.

## Points à connaître

Une enum `Route` rend la navigation plus propre qu’une accumulation de booléens.

Pour une app simple, inutile de créer un router compliqué. Un `path` local ou un état de navigation suffit souvent.

Pour une app plus grande, on peut créer un objet `Router`, mais ce n’est pas obligatoire au début.

## Résumé

- La navigation programmatique sert quand la navigation dépend d’une action.
- Une enum `Route` représente les écrans possibles.
- `NavigationStack(path:)` permet d’ajouter ou retirer des routes.
- `.navigationDestination(for:)` convertit une route en écran.
- Le ViewModel peut signaler un événement, et la vue gère la navigation.

## Exercice

Ouvre deux routes puis reviens d’un niveau. Vérifie qu’un retour racine vide les routes. Empêche une simulation annulée d’ouvrir un profil et explique pourquoi une connexion réelle ne devrait pas simplement empiler indéfiniment des profils au-dessus du login.
