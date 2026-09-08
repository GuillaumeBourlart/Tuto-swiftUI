# Fiche 01.07 — Les previews SwiftUI

## Objectif

Comprendre à quoi servent les previews SwiftUI, comment prévisualiser une vue rapidement, et comment utiliser des données mockées pour tester plusieurs états d’un écran.

---

# 1. L’idée à comprendre

Les previews SwiftUI permettent de voir une vue directement dans Xcode sans lancer toute l’application sur le simulateur.

Elles servent à tester rapidement :

- l’apparence d’une vue ;
- plusieurs états visuels ;
- le dark mode ;
- différentes tailles d’écran ;
- des données fictives ;
- des composants réutilisables.

Une preview ne remplace pas un vrai test sur simulateur ou appareil, mais elle accélère énormément la création d’interface.

---

# 2. Code minimal

```swift
import SwiftUI

struct WelcomeView: View {
    var body: some View {
        Text("Bienvenue")
            .font(.title)
            .padding()
    }
}

#Preview {
    WelcomeView() // Vue affichée dans la preview Xcode
}
```

`#Preview` indique à Xcode quelle vue afficher dans le canvas de preview.

---

# 3. Preview avec paramètres

Si ta vue reçoit des données, tu les fournis directement dans la preview.

```swift
struct UserCardView: View {
    let name: String
    let role: String

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(name)
                .font(.headline)

            Text(role)
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
        .padding()
        .background(.gray.opacity(0.1))
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }
}

#Preview {
    UserCardView(
        name: "Guillaume",
        role: "Développeur iOS"
    )
    .padding()
}
```

Ici, la preview utilise des données fictives.

---

# 4. Plusieurs previews pour une même vue

Tu peux créer plusieurs previews pour tester plusieurs cas.

```swift
#Preview("Utilisateur normal") {
    UserCardView(
        name: "Guillaume",
        role: "Développeur iOS"
    )
    .padding()
}

#Preview("Nom très long") {
    UserCardView(
        name: "Guillaume Bourlart avec un nom très long",
        role: "Développeur iOS indépendant spécialisé SwiftUI"
    )
    .padding()
}
```

C’est utile pour vérifier que ton UI ne casse pas avec :

- un texte très long ;
- une donnée vide ;
- un état d’erreur ;
- un état loading ;
- un écran avec beaucoup de contenu.

---

# 5. Preview dark mode

Tu peux forcer le dark mode dans une preview.

```swift
#Preview("Dark mode") {
    UserCardView(
        name: "Guillaume",
        role: "Développeur iOS"
    )
    .padding()
    .preferredColorScheme(.dark) // Affiche la preview en dark mode
}
```

Tu peux aussi avoir light mode et dark mode côte à côte :

```swift
#Preview("Light mode") {
    UserCardView(name: "Guillaume", role: "Développeur iOS")
        .padding()
        .preferredColorScheme(.light)
}

#Preview("Dark mode") {
    UserCardView(name: "Guillaume", role: "Développeur iOS")
        .padding()
        .preferredColorScheme(.dark)
}
```

---

# 6. Preview avec taille personnalisée

Pour prévisualiser un petit composant, tu peux utiliser `.previewLayout` avec l’ancien système de previews, mais avec `#Preview`, le plus simple est souvent d’encadrer ton composant avec du padding ou de le mettre dans un container.

Exemple :

```swift
#Preview("Card") {
    VStack {
        UserCardView(name: "Guillaume", role: "Développeur iOS")
    }
    .padding()
}
```

Pour tester un écran complet, tu affiches directement l’écran :

```swift
#Preview("Écran complet") {
    ProfileView()
}
```

---

# 7. Preview avec données mockées

Quand une vue dépend d’un modèle, crée des données mockées.

```swift
struct Article: Identifiable {
    let id = UUID()
    let title: String
    let subtitle: String
}

extension Article {
    static let mock = Article(
        title: "Comprendre SwiftUI",
        subtitle: "Une introduction aux vues, états et modifiers."
    )

    static let mocks = [
        Article(title: "SwiftUI", subtitle: "Les bases"),
        Article(title: "Navigation", subtitle: "Changer d’écran"),
        Article(title: "API", subtitle: "Charger des données")
    ]
}
```

Puis tu les utilises dans tes previews :

```swift
struct ArticleCardView: View {
    let article: Article

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(article.title)
                .font(.headline)

            Text(article.subtitle)
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
        .padding()
        .background(.gray.opacity(0.1))
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }
}

#Preview {
    ArticleCardView(article: .mock)
        .padding()
}
```

Les mocks évitent de dépendre d’une API, de Firebase ou d’une base locale juste pour afficher une preview.

---

# 8. Preview d’une liste

Tu peux aussi prévisualiser une liste complète avec des données mockées.

```swift
struct ArticlesListView: View {
    let articles: [Article]

    var body: some View {
        List(articles) { article in
            ArticleCardView(article: article)
        }
    }
}

#Preview {
    ArticlesListView(articles: Article.mocks)
}
```

Ici, `ArticlesListView` ne va pas chercher les données elle-même. Elle reçoit une liste d’articles, ce qui la rend facile à prévisualiser.

---

# 9. Preview avec ViewModel mocké

Quand une vue dépend d’un ViewModel, tu peux créer un ViewModel de preview.

```swift
@MainActor
final class ProfileViewModel: ObservableObject {
    @Published var username: String
    @Published var isLoading: Bool

    init(username: String, isLoading: Bool = false) {
        self.username = username
        self.isLoading = isLoading
    }
}
```

Vue :

```swift
struct ProfileView: View {
    @StateObject var viewModel: ProfileViewModel

    var body: some View {
        VStack(spacing: 16) {
            if viewModel.isLoading {
                ProgressView()
            } else {
                Text(viewModel.username)
                    .font(.title)
            }
        }
        .padding()
    }
}
```

Previews :

```swift
#Preview("Profil chargé") {
    ProfileView(
        viewModel: ProfileViewModel(username: "Guillaume")
    )
}

#Preview("Chargement") {
    ProfileView(
        viewModel: ProfileViewModel(username: "", isLoading: true)
    )
}
```

Ça permet de tester rapidement plusieurs états du même écran.

---

# 10. Preview loading, empty, error, loaded

Pour une vraie app, beaucoup d’écrans ont plusieurs états :

- chargement ;
- contenu chargé ;
- contenu vide ;
- erreur.

Exemple :

```swift
struct UsersScreenView: View {
    enum State {
        case loading
        case loaded([String])
        case empty
        case error(String)
    }

    let state: State

    var body: some View {
        switch state {
        case .loading:
            ProgressView("Chargement...")

        case .loaded(let users):
            List(users, id: \.self) { user in
                Text(user)
            }

        case .empty:
            Text("Aucun utilisateur")
                .foregroundStyle(.secondary)

        case .error(let message):
            Text(message)
                .foregroundStyle(.red)
        }
    }
}
```

Previews :

```swift
#Preview("Loading") {
    UsersScreenView(state: .loading)
}

#Preview("Loaded") {
    UsersScreenView(state: .loaded(["Guillaume", "Sarah", "Lucas"]))
}

#Preview("Empty") {
    UsersScreenView(state: .empty)
}

#Preview("Error") {
    UsersScreenView(state: .error("Impossible de charger les utilisateurs."))
}
```

C’est une très bonne habitude : tester tous les états visuels d’un écran.

---

# 11. Preview avec `EnvironmentObject`

Si une vue utilise `@EnvironmentObject`, la preview doit fournir cet objet.

Exemple :

```swift
final class SessionManager: ObservableObject {
    @Published var isLoggedIn = false
}

struct SessionStatusView: View {
    @EnvironmentObject var session: SessionManager

    var body: some View {
        Text(session.isLoggedIn ? "Connecté" : "Déconnecté")
    }
}
```

Preview :

```swift
#Preview {
    SessionStatusView()
        .environmentObject(SessionManager()) // Obligatoire pour la preview
}
```

Si tu oublies `.environmentObject(...)`, la preview peut planter.

---

# 12. Points à connaître

## Les previews ne doivent pas dépendre du réseau

Évite de faire une vraie requête API dans une preview.

Préférable :

```swift
#Preview {
    ArticlesListView(articles: Article.mocks)
}
```

Moins adapté :

```swift
#Preview {
    ArticlesListView() // Si cette vue lance directement une vraie API au chargement
}
```

Les previews doivent rester rapides et prévisibles.

---

## Les previews aident à créer des composants réutilisables

Un bon composant SwiftUI devrait être facile à prévisualiser seul.

Exemple :

```swift
#Preview {
    PrimaryButton(title: "Continuer") {
        print("Action")
    }
    .padding()
}
```

Si une vue est difficile à prévisualiser, c’est parfois le signe qu’elle dépend de trop de choses.

---

## Les mocks rendent les previews plus propres

Tu peux créer des extensions `.mock` ou `.mocks` sur tes modèles.

Exemple :

```swift
extension User {
    static let mock = User(id: UUID(), name: "Guillaume")
}
```

Puis :

```swift
#Preview {
    UserRowView(user: .mock)
}
```

---

# Résumé

À retenir :

- `#Preview` permet d’afficher une vue dans Xcode sans lancer toute l’app ;
- les previews sont très utiles pour construire rapidement l’interface ;
- utilise des données mockées plutôt qu’une vraie API ;
- crée plusieurs previews pour tester plusieurs états ;
- teste aussi le dark mode et les textes longs ;
- si une vue utilise `@EnvironmentObject`, la preview doit le fournir ;
- une vue facile à prévisualiser est souvent une vue mieux découplée.

