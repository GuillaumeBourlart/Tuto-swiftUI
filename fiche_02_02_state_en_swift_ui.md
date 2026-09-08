# Fiche 02.02 — `@State` en SwiftUI

> **Repère de version.** Le cours contient les deux familles d’observation. `@State` gère aussi un objet `@Observable` depuis iOS 17 ; `@StateObject` concerne `ObservableObject`. Consulte la [carte de décision 02.12](fiche_02_12_choisir_etat_et_bindings.md). MVVM est un choix d’organisation, pas une obligation du framework.

## Objectif

Comprendre à quoi sert `@State`, quand l’utiliser, et comment il permet à une vue SwiftUI de se mettre à jour quand une valeur locale change.

---

# 1. L’idée à comprendre

`@State` sert à stocker une donnée locale dans une vue SwiftUI.

Quand cette donnée change, SwiftUI relit le `body` de la vue et met à jour l’interface.

Exemple simple :

```swift
@State private var isOn = false
```

Ici, `isOn` est une valeur qui appartient à la vue.

Si `isOn` change, la vue peut se mettre à jour automatiquement.

---

# 2. Code minimal

```swift
struct CounterView: View {
    @State private var count = 0 // État local de la vue

    var body: some View {
        VStack(spacing: 16) {
            Text("Compteur : \(count)") // Affiche la valeur actuelle

            Button("Ajouter 1") {
                count += 1 // Change l’état, donc SwiftUI met à jour la vue
            }
        }
        .padding()
    }
}
```

Ce qu’il se passe :

```text
count = 0
  ↓
L’utilisateur appuie sur le bouton
  ↓
count = 1
  ↓
SwiftUI relit le body
  ↓
Le Text affiche “Compteur : 1”
```

---

# 3. Quand utiliser `@State`

Utilise `@State` pour une donnée simple qui appartient uniquement à la vue actuelle.

Exemples fréquents :

```swift
@State private var isLoading = false
@State private var searchText = ""
@State private var isShowingSheet = false
@State private var selectedTab = 0
@State private var isPasswordVisible = false
@State private var selectedDate = Date()
```

`@State` est adapté pour :

- afficher ou cacher une sheet ;
- gérer un champ de texte ;
- activer/désactiver un toggle ;
- stocker un filtre sélectionné ;
- gérer un état visuel local ;
- déclencher un changement d’interface dans une seule vue.

---

# 4. `@State` doit souvent être `private`

En général, une variable `@State` appartient à la vue.

Donc on l’écrit souvent comme ça :

```swift
@State private var isLoading = false
```

Le `private` indique que l’état est interne à la vue.

Une autre vue ne devrait pas venir modifier directement cette variable.

Si une sous-vue doit modifier cette valeur, on utilisera plutôt `@Binding`, qui sera vu dans la fiche suivante.

---

# 5. Exemple avec un champ de texte

`@State` est très utilisé avec `TextField`.

```swift
struct UsernameFormView: View {
    @State private var username = "" // Valeur tapée par l’utilisateur

    var body: some View {
        VStack(spacing: 16) {
            TextField("Nom d’utilisateur", text: $username) // $username crée un Binding
                .textFieldStyle(.roundedBorder)

            Text("Bonjour, \(username)")
                .foregroundStyle(.secondary)
        }
        .padding()
    }
}
```

Ici :

- `username` contient le texte actuel ;
- le `TextField` modifie `username` ;
- le `Text` se met à jour automatiquement.

Le `$username` est important : il permet au `TextField` de lire et modifier la valeur.

---

# 6. Exemple avec une sheet

`@State` est souvent utilisé pour afficher ou cacher une sheet.

```swift
struct SheetExampleView: View {
    @State private var isShowingSheet = false

    var body: some View {
        Button("Afficher la sheet") {
            isShowingSheet = true
        }
        .sheet(isPresented: $isShowingSheet) { // La sheet dépend de isShowingSheet
            Text("Contenu de la sheet")
                .padding()
        }
    }
}
```

Ici :

- quand `isShowingSheet == false`, la sheet est cachée ;
- quand `isShowingSheet == true`, la sheet apparaît ;
- SwiftUI gère l’affichage automatiquement.

---

# 7. Exemple avec un état visuel

```swift
struct PasswordVisibilityView: View {
    @State private var password = ""
    @State private var isPasswordVisible = false

    var body: some View {
        VStack(spacing: 12) {
            if isPasswordVisible {
                TextField("Mot de passe", text: $password)
                    .textFieldStyle(.roundedBorder)
            } else {
                SecureField("Mot de passe", text: $password)
                    .textFieldStyle(.roundedBorder)
            }

            Button(isPasswordVisible ? "Masquer" : "Afficher") {
                isPasswordVisible.toggle()
            }
        }
        .padding()
    }
}
```

Ici, `@State` permet de choisir entre un `TextField` et un `SecureField`.

---

# 8. `@State` et les types simples

`@State` est parfait pour les types simples :

```swift
@State private var name = ""
@State private var age = 28
@State private var isEnabled = true
@State private var progress = 0.5
@State private var selectedDate = Date()
```

Il peut aussi stocker des tableaux ou des structs simples :

```swift
@State private var users: [String] = []
```

Exemple :

```swift
struct UsersView: View {
    @State private var users: [String] = []

    var body: some View {
        VStack {
            List(users, id: \.self) { user in
                Text(user)
            }

            Button("Ajouter") {
                users.append("Nouvel utilisateur")
            }
        }
    }
}
```

---

# 9. Quand ne pas utiliser `@State`

`@State` n’est pas fait pour tout.

Évite de dupliquer dans un nouvel `@State` une source de vérité qui appartient déjà à un parent ou à un service. `@State` ne fournit pas non plus de sauvegarde durable après fermeture de l’app.

Pour un objet `@Observable` (iOS 17+), `@State` est justement un moyen de le conserver, même s’il représente un écran ou une session partagée : conserve-le à la racine adaptée, puis transmets ou injecte la même instance. La logique métier vit dans le modèle ou les services, pas dans le wrapper.

```text
Valeur reçue à éditer                 → @Binding
Objet @Observable possédé ici        → @State
Objet @Observable reçu pour édition  → @Bindable
Objet @Observable injecté            → @Environment(Type.self)
Objet ObservableObject possédé ici   → @StateObject
Objet ObservableObject reçu          → @ObservedObject / @EnvironmentObject
Préférence persistante simple        → @AppStorage
Données persistantes structurées     → fichier / SwiftData / Core Data
```

---

# 10. Différence entre valeur normale et `@State`

Une propriété normale ne permet pas à la vue de se mettre à jour quand elle change.

Pas correct :

```swift
struct CounterView: View {
    private var count = 0

    var body: some View {
        Button("Count: \(count)") {
            // Impossible de modifier proprement count ici
        }
    }
}
```

Correct :

```swift
struct CounterView: View {
    @State private var count = 0

    var body: some View {
        Button("Count: \(count)") {
            count += 1
        }
    }
}
```

`@State` dit à SwiftUI :

```text
Cette valeur peut changer, et la vue dépend d’elle.
```

---

# 11. Le signe `$`

Quand tu écris :

```swift
$username
```

Tu ne passes pas simplement la valeur de `username`.

Tu passes un `Binding`, c’est-à-dire un lien en lecture/écriture vers cette valeur.

Exemple :

```swift
TextField("Nom", text: $username)
```

Le `TextField` a besoin de modifier le texte.

Il ne peut donc pas recevoir seulement :

```swift
username
```

Il doit recevoir :

```swift
$username
```

À retenir :

```text
username  → valeur actuelle
$username → lien modifiable vers la valeur
```

---

# 12. `@State` avec un modèle simple

Tu peux utiliser `@State` avec une struct.

```swift
struct UserProfile {
    var name: String
    var age: Int
}

struct ProfileEditView: View {
    @State private var profile = UserProfile(name: "Guillaume", age: 28)

    var body: some View {
        VStack(spacing: 16) {
            TextField("Nom", text: $profile.name)
                .textFieldStyle(.roundedBorder)

            Stepper("Âge : \(profile.age)", value: $profile.age)
        }
        .padding()
    }
}
```

Ici, `@State` stocke tout le profil localement dans la vue.

C’est adapté si c’est un formulaire local temporaire.

Pour un vrai profil utilisateur venant d’une API ou de Firebase, on utilisera plutôt un ViewModel.

---

# 13. Points à connaître

## `@State` appartient à la vue qui le déclare

Une sous-vue ne devrait pas modifier directement le `@State` d’un parent.

Pour ça, on passe un `Binding`.

---

## `@State` est stocké par SwiftUI

Même si la `View` est une `struct` et peut être recréée, SwiftUI conserve la valeur de `@State` tant que la vue reste à la même place dans la hiérarchie.

C’est pour ça que ton compteur ne revient pas à zéro à chaque mise à jour du `body`.

---

## `@State` ne remplace pas un ViewModel

Si tu commences à avoir beaucoup de logique dans la vue, c’est probablement que la donnée doit aller dans un ViewModel.

Exemple :

```text
Formulaire simple local       → @State
Écran avec API/loading/error  → modèle @Observable dans @State, ou ObservableObject dans @StateObject
Session partagée             → propriétaire racine + injection adaptée au mécanisme d’observation
```

---

# Résumé

À retenir :

- `@State` stocke une donnée locale à une vue ;
- quand un `@State` change, SwiftUI met à jour l’interface ;
- `@State` est idéal pour les valeurs simples et locales ;
- on écrit souvent `@State private var ...` ;
- `$variable` crée un `Binding` modifiable ;
- `@State` ne doit pas servir à stocker toute la logique métier ;
- pour partager et structurer les données, distingue Observation et ObservableObject avec la carte 02.12.

