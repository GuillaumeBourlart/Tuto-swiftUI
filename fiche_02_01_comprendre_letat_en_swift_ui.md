# Fiche 02.01 — Comprendre l’état en SwiftUI

> **Repère de version.** Le cours contient les deux familles d’observation. `@State` gère aussi un objet `@Observable` depuis iOS 17 ; `@StateObject` concerne `ObservableObject`. Consulte la [carte de décision 02.12](fiche_02_12_choisir_etat_et_bindings.md). MVVM est un choix d’organisation, pas une obligation du framework.

## Objectif

Comprendre ce qu’est un état en SwiftUI, pourquoi une vue se met à jour quand une donnée change, et pourquoi SwiftUI fonctionne avec une logique déclarative.

---

# 1. L’idée à comprendre

En SwiftUI, l’interface est une conséquence de l’état actuel.

Tu ne dis pas directement à l’interface :

```text
Change ce label.
Cache ce bouton.
Affiche ce loader.
```

Tu changes une donnée, et SwiftUI affiche automatiquement l’interface correspondant à cette donnée.

Exemple :

```swift
if isLoading {
    ProgressView("Chargement...")
} else {
    Text("Contenu chargé")
}
```

Ici, l’écran dépend de `isLoading`.

Si `isLoading == true`, SwiftUI affiche le loader.

Si `isLoading == false`, SwiftUI affiche le texte.

---

# 2. Code minimal

```swift
struct CounterView: View {
    @State private var count = 0 // État local de la vue

    var body: some View {
        VStack(spacing: 16) {
            Text("Compteur : \(count)") // Le texte dépend de count

            Button("Ajouter 1") {
                count += 1 // Quand count change, SwiftUI met à jour la vue
            }
        }
        .padding()
    }
}
```

Ce qu’il se passe :

```text
L’utilisateur appuie sur le bouton
  ↓
count augmente
  ↓
SwiftUI relit le body
  ↓
Le texte affiche la nouvelle valeur
```

---

# 3. C’est quoi un état ?

Un état est une donnée qui peut changer et qui influence l’interface.

Exemples d’états :

```swift
@State private var isLoading = false
@State private var username = ""
@State private var isShowingSheet = false
@State private var selectedTab = 0
@State private var searchText = ""
```

Ces valeurs peuvent modifier ce que l’utilisateur voit.

Exemple :

```swift
if username.isEmpty {
    Text("Aucun nom renseigné")
} else {
    Text("Bonjour, \(username)")
}
```

---

# 4. Interface déclarative

SwiftUI est déclaratif.

Ça veut dire que tu décris le résultat voulu selon l’état actuel.

Exemple :

```swift
struct LoginStatusView: View {
    @State private var isLoggedIn = false

    var body: some View {
        VStack(spacing: 16) {
            if isLoggedIn {
                Text("Connecté")
                    .foregroundStyle(.green)
            } else {
                Text("Déconnecté")
                    .foregroundStyle(.red)
            }

            Button(isLoggedIn ? "Se déconnecter" : "Se connecter") {
                isLoggedIn.toggle()
            }
        }
        .padding()
    }
}
```

Tu ne modifies pas manuellement le texte ou la couleur.

Tu dis simplement :

```text
Si isLoggedIn est true → afficher Connecté en vert.
Sinon → afficher Déconnecté en rouge.
```

SwiftUI fait la mise à jour quand `isLoggedIn` change.

---

# 5. Le body peut être relu plusieurs fois

Quand un état change, SwiftUI peut relire le `body` de la vue.

C’est normal.

Le `body` doit donc rester léger.

À éviter :

```swift
var body: some View {
    Text(loadUsernameFromNetwork()) // Mauvais : ne fais pas de requête dans le body
}
```

Préférable :

```swift
struct ProfileView: View {
    @State private var username = ""

    var body: some View {
        Text(username)
            .task {
                username = await loadUsername()
            }
    }

    func loadUsername() async -> String {
        "Guillaume"
    }
}
```

Le `body` décrit l’interface. Les actions, chargements et appels réseau doivent être déclenchés ailleurs, par exemple dans `.task`, dans un bouton, ou dans un ViewModel.

---

# 6. Les états principaux en SwiftUI

SwiftUI propose plusieurs manières de gérer l’état.

Les plus importantes :

```text
@State              → état local dans une vue
@Binding            → état transmis à une sous-vue pour modification
@StateObject        → ViewModel créé et gardé par la vue
@ObservedObject     → objet observable fourni par un parent
@EnvironmentObject  → objet partagé dans une partie de l’app
@Environment        → valeurs système ou valeurs injectées
@AppStorage         → petite donnée sauvegardée dans UserDefaults
@SceneStorage       → état temporaire lié à une scène
```

On les verra un par un dans les fiches suivantes.

---

# 7. Exemple : état loading / content

Un cas très courant : afficher un loader pendant un chargement.

```swift
struct LoadingStateView: View {
    @State private var isLoading = false

    var body: some View {
        VStack(spacing: 16) {
            if isLoading {
                ProgressView("Chargement...")
            } else {
                Text("Aucune opération en cours")
            }

            Button("Lancer le chargement") {
                isLoading = true

                Task {
                    try? await Task.sleep(for: .seconds(2))
                    isLoading = false
                }
            }
        }
        .padding()
    }
}
```

Ici :

- `isLoading` est l’état ;
- la vue dépend de cet état ;
- quand `isLoading` change, SwiftUI met à jour l’affichage.

---

# 8. Exemple : état empty / loaded

Autre cas fréquent : afficher une liste ou un message vide.

```swift
struct UsersStateView: View {
    @State private var users: [String] = []

    var body: some View {
        VStack(spacing: 16) {
            if users.isEmpty {
                Text("Aucun utilisateur")
                    .foregroundStyle(.secondary)
            } else {
                List(users, id: \.self) { user in
                    Text(user)
                }
            }

            Button("Ajouter un utilisateur") {
                users.append("Guillaume")
            }
        }
    }
}
```

Ici, l’interface dépend du contenu de `users`.

---

# 9. Exemple : enum d’état d’écran

Quand un écran devient plus complet, tu peux représenter son état avec une enum.

```swift
struct UsersScreenView: View {
    enum ViewState {
        case loading
        case loaded([String])
        case empty
        case error(String)
    }

    @State private var state: ViewState = .loading

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

Cette approche est utile pour éviter d’avoir trop de booléens comme :

```swift
@State private var isLoading = false
@State private var hasError = false
@State private var isEmpty = false
```

Une enum permet de dire clairement :

```text
L’écran est dans un seul état à la fois.
```

---

# En UIKit (rappel)

En UIKit, il n’y a **aucune réactivité automatique**. Tu gardes l’état dans des propriétés et tu mets l’UI à jour **à la main**.

Approche classique avec `didSet` :

```swift
final class CounterViewController: UIViewController {
    private let label = UILabel()

    private var count = 0 {
        didSet { label.text = "Compteur : \(count)" } // synchro manuelle
    }

    private lazy var button = UIButton(
        configuration: .filled(),
        primaryAction: UIAction(title: "Ajouter 1") { [weak self] _ in
            self?.count += 1 // on modifie l’état ET on devra refléter l’UI
        }
    )
}
```

Pour un écran avec plusieurs états, on centralise souvent dans une méthode `render()` rappelée à chaque changement :

```swift
private func render() {
    loader.isHidden = !isLoading
    contentLabel.isHidden = isLoading
}
```

La synchro état → UI vient donc de toi : `didSet`, `render()`, delegation, closures ou Combine. Si tu oublies de l’appeler, l’écran reste désynchronisé.

👉 **En SwiftUI** : tu décris seulement `body` en fonction de l’état, et le framework relie automatiquement état → UI à chaque changement.

---

# 10. Points à connaître

## L’état doit avoir une seule source de vérité

Évite de dupliquer la même information dans plusieurs variables.

Pas idéal :

```swift
@State private var users: [String] = []
@State private var isEmpty = true
```

Le problème : `isEmpty` peut devenir faux par rapport à `users`.

Préférable :

```swift
@State private var users: [String] = []
```

Puis dans le body :

```swift
if users.isEmpty {
    Text("Aucun utilisateur")
}
```

Ici, la source de vérité est `users`.

---

## Un état local doit rester local

Si une donnée ne concerne qu’une vue, `@State` suffit.

Exemples :

```swift
@State private var isShowingSheet = false
@State private var searchText = ""
@State private var selectedFilter = "Tous"
```

Mais si la donnée doit être partagée avec plusieurs écrans, il faudra utiliser autre chose, comme un ViewModel, un `EnvironmentObject`, ou un service.

---

## Trop de booléens peuvent rendre un écran confus

Exemple fragile :

```swift
@State private var isLoading = false
@State private var isError = false
@State private var isEmpty = false
```

Que se passe-t-il si `isLoading == true` et `isError == true` en même temps ?

Pour les états d’écran complexes, une enum est souvent plus claire.

---

# Résumé

À retenir :

- un état est une donnée qui peut changer et influencer l’interface ;
- SwiftUI affiche l’interface correspondant à l’état actuel ;
- quand un état change, SwiftUI peut relire le `body` ;
- le `body` doit rester léger ;
- `@State` sert à stocker un état local ;
- il existe plusieurs outils d’état : `@State`, `@Binding`, `@StateObject`, `@ObservedObject`, `@EnvironmentObject`, etc. ;
- évite de dupliquer la même information dans plusieurs états ;
- pour un écran complexe, une enum d’état peut être plus propre que plusieurs booléens.

