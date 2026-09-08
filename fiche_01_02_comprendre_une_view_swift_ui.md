# Fiche 01.02 — Comprendre une View SwiftUI

## Objectif

Comprendre ce qu’est une `View` en SwiftUI, à quoi sert `body`, ce que veut dire `some View`, et pourquoi une vue SwiftUI est reconstruite quand son état change.

---

# 1. L’idée à comprendre

En SwiftUI, une vue est une description de l’interface.

Tu ne dis pas manuellement :

```text
Crée un label, ajoute-le à l’écran, modifie sa couleur, puis mets à jour son texte.
```

Tu décris plutôt l’interface que tu veux obtenir :

```swift
Text("Bonjour")
    .font(.title)
    .foregroundStyle(.blue)
```

SwiftUI s’occupe ensuite de créer, afficher et mettre à jour l’interface.

Une `View` SwiftUI est donc une structure qui décrit ce que l’utilisateur doit voir à un instant donné.

---

# 2. Code minimal

```swift
import SwiftUI

struct WelcomeView: View { // Une vue SwiftUI respecte le protocole View
    var body: some View { // body décrit l’interface affichée par cette vue
        Text("Bienvenue") // Élément visuel affiché à l’écran
            .font(.title) // Modifier qui change la taille/style du texte
            .padding() // Ajoute de l’espace autour du texte
    }
}
```

---

# 3. `View`

`View` est le protocole de base pour créer une interface en SwiftUI.

Quand tu écris :

```swift
struct WelcomeView: View
```

Tu dis que `WelcomeView` est une vue SwiftUI.

Une vue SwiftUI peut représenter :

- un écran complet ;
- une partie d’écran ;
- un bouton custom ;
- une cellule de liste ;
- un composant réutilisable ;
- une vue temporaire comme un loader ou un message d’erreur.

Exemple d’écran complet :

```swift
struct HomeView: View {
    var body: some View {
        VStack {
            Text("Accueil")
            Button("Continuer") {}
        }
    }
}
```

Exemple de petit composant :

```swift
struct BadgeView: View {
    let text: String

    var body: some View {
        Text(text)
            .font(.caption)
            .padding(8)
            .background(.gray.opacity(0.2))
            .clipShape(Capsule())
    }
}
```

---

# 4. `body`

`body` est la propriété qui décrit le contenu visuel de ta vue.

Exemple :

```swift
struct ProfileHeaderView: View {
    var body: some View {
        VStack {
            Image(systemName: "person.circle.fill")
                .font(.largeTitle)

            Text("Guillaume")
                .font(.headline)
        }
    }
}
```

Ici, le `body` dit que `ProfileHeaderView` affiche :

- une image système ;
- un texte ;
- le tout dans une `VStack`.

Tu peux retenir :

```text
Une View SwiftUI = une struct avec un body.
Le body = ce que cette vue affiche.
```

---

# 5. `some View`

Quand tu écris :

```swift
var body: some View
```

Cela veut dire :

> “Cette propriété retourne un type qui respecte le protocole `View`, mais je ne donne pas son type exact.”

Pourquoi ?

Parce qu’une vue SwiftUI réelle peut avoir un type très long.

Par exemple :

```swift
Text("Bonjour")
    .font(.title)
    .padding()
```

n’est pas juste un `Text`. Chaque modifier transforme le type de la vue.

Donc SwiftUI utilise `some View` pour cacher ce type complexe.

Tu peux retenir simplement :

```text
some View = je retourne une vue, sans écrire son type exact.
```

---

# 6. Une View est généralement une struct

En SwiftUI, les vues sont presque toujours des `struct`.

Exemple :

```swift
struct SettingsView: View {
    var body: some View {
        Text("Réglages")
    }
}
```

Pourquoi des `struct` ?

Parce que SwiftUI reconstruit souvent les vues.

Une vue SwiftUI est légère. Elle ne représente pas forcément un objet écran vivant comme un `UIViewController`.

Elle décrit simplement l’interface attendue.

---

# 7. La recomposition d’une vue

SwiftUI met à jour l’interface quand une donnée utilisée par la vue change.

Exemple :

```swift
struct CounterView: View {
    @State private var count = 0

    var body: some View {
        VStack(spacing: 16) {
            Text("Compteur : \(count)") // Cette ligne dépend de count

            Button("+1") {
                count += 1 // Quand count change, SwiftUI relit le body
            }
        }
    }
}
```

Quand tu appuies sur le bouton :

```text
count change
  ↓
SwiftUI relit le body
  ↓
Text affiche la nouvelle valeur
```

Important : SwiftUI ne recrée pas forcément toute l’interface visible de zéro. Mais toi, dans ton code, tu dois penser de manière déclarative :

```text
Voici l’interface correcte pour l’état actuel.
```

---

# 8. Exemple réaliste : écran avec plusieurs états

Une vue SwiftUI change selon l’état actuel.

```swift
struct LoadingExampleView: View {
    @State private var isLoading = false

    var body: some View {
        VStack(spacing: 16) {
            if isLoading {
                ProgressView("Chargement...")
            } else {
                Text("Données chargées")
            }

            Button(isLoading ? "Arrêter" : "Lancer") {
                isLoading.toggle()
            }
        }
        .padding()
    }
}
```

Ici, le `body` dépend de `isLoading`.

Si `isLoading == true`, SwiftUI affiche un `ProgressView`.

Si `isLoading == false`, SwiftUI affiche un `Text`.

---

# 9. Découper une vue

Quand une vue devient trop grosse, tu peux la découper en sous-vues.

Au lieu de faire :

```swift
struct ProfileView: View {
    var body: some View {
        VStack {
            Image(systemName: "person.circle.fill")
                .font(.system(size: 80))

            Text("Guillaume")
                .font(.title)

            Text("Développeur iOS")
                .foregroundStyle(.secondary)

            Button("Modifier le profil") {}
        }
    }
}
```

Tu peux faire :

```swift
struct ProfileView: View {
    var body: some View {
        VStack(spacing: 20) {
            ProfileHeaderView()
            EditProfileButton()
        }
    }
}

struct ProfileHeaderView: View {
    var body: some View {
        VStack {
            Image(systemName: "person.circle.fill")
                .font(.system(size: 80))

            Text("Guillaume")
                .font(.title)

            Text("Développeur iOS")
                .foregroundStyle(.secondary)
        }
    }
}

struct EditProfileButton: View {
    var body: some View {
        Button("Modifier le profil") {}
            .buttonStyle(.borderedProminent)
    }
}
```

C’est plus lisible et plus facile à maintenir.

---

# En UIKit (rappel)

En UIKit, l’interface n’est pas une description : ce sont des **objets vivants**. `UIView` et `UIViewController` sont des **classes** (référence, identité, état mutable, cycle de vie). Tu crées l’objet, tu le gardes en mémoire, puis tu le **modifies impérativement** à la main.

```swift
final class ProfileViewController: UIViewController {
    private let nameLabel = UILabel()

    override func viewDidLoad() { // Cycle de vie : moment où la vue est chargée
        super.viewDidLoad()
        nameLabel.text = "Guillaume"
        nameLabel.font = .preferredFont(forTextStyle: .title1)
        view.addSubview(nameLabel) // On ajoute manuellement la vue à l’écran
    }
}
```

Pour mettre à jour l’UI, tu mutes directement les propriétés de l’objet (et tu dois penser à chaque transition d’état) :

```swift
func setLoading(_ isLoading: Bool) {
    spinner.isHidden = !isLoading
    statusLabel.text = isLoading ? "Chargement..." : "Données chargées"
}
```

Différence clé de mentalité : en UIKit tu décris **les étapes** pour passer d’un état à l’autre (impératif, objet persistant que tu modifies). En SwiftUI tu décris **le résultat** pour l’état courant, et le framework calcule les changements (déclaratif, `struct` jetable recréée).

👉 En SwiftUI : pas de `viewDidLoad` ni de `label.text = ...` — une `struct View` recalcule son `body` (image de l’état) dès que `@State` change.

---

# 10. Points à connaître

## Une View ne doit pas contenir trop de logique

Une vue SwiftUI doit surtout décrire l’interface.

Elle peut contenir un peu de logique d’affichage simple, par exemple :

```swift
if isLoading {
    ProgressView()
} else {
    Text("Terminé")
}
```

Mais elle ne devrait pas contenir toute la logique métier de l’app.

Pour une vraie app, cette logique ira plutôt dans :

- un `ViewModel` ;
- un service ;
- un repository ;
- un use case dans une architecture plus avancée.

---

## Le body peut être relu souvent

Évite de lancer directement des actions lourdes dans le `body`.

Pas idéal :

```swift
var body: some View {
    Text(loadUsername()) // Mauvais si loadUsername fait un appel réseau ou une opération lourde
}
```

Préférable :

```swift
var body: some View {
    Text(username)
        .task {
            await loadUsername()
        }
}
```

Le `body` doit rester une description de l’interface, pas un endroit pour faire des traitements lourds.

---

# Résumé

À retenir :

- une vue SwiftUI respecte le protocole `View` ;
- une vue SwiftUI est généralement une `struct` ;
- `body` décrit ce que la vue affiche ;
- `some View` signifie “je retourne une vue sans écrire son type exact” ;
- SwiftUI relit le `body` quand un état utilisé par la vue change ;
- une vue doit surtout décrire l’interface ;
- les traitements lourds et la logique métier doivent être sortis de la vue.

