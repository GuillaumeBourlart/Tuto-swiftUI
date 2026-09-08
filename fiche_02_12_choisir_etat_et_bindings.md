# Fiche 02.12 — Choisir l’état, la propriété et le binding

## Objectif

Comprendre `value`, `$value`, `let`, `@State`, `@Binding` et `@Bindable`, puis reconnaître les deux familles d’observation. Lis cette fiche avant 02.11 ; les fiches 02.04–02.06 t’aideront ensuite à lire les projets utilisant `ObservableObject`.

## 1. Les trois questions à poser

1. **Qui possède la donnée ?** Une vue locale, un parent, un store partagé ?
2. **Qui doit pouvoir l’écrire ?** Une vue enfant peut recevoir la valeur seule, un binding ou une action.
3. **Quel mécanisme d’observation utilise l’objet ?** `@Observable` (intégration SwiftUI iOS 17+) ou `ObservableObject` ?

Un property wrapper ne se choisit pas parce que la variable s’appelle `viewModel`. Il dépend de ces rôles.

## 2. Carte de décision

| Besoin | Choix | Exemple |
|---|---|---|
| Recevoir une valeur pour l’afficher | `let` | `let title: String` |
| Posséder une valeur locale | `@State private` | `@State private var name = ""` |
| Éditer une valeur possédée ailleurs | `@Binding` | `@Binding var name: String` |
| Recevoir une action métier | Une closure | `let onSave: () -> Void` |
| Conserver un objet `@Observable` local | `@State private` | `@State private var store = ProfileStore()` |
| Lire un objet `@Observable` reçu | Propriété simple | `let store: ProfileStore` |
| Créer des bindings sur cet objet reçu | `@Bindable` | `@Bindable var store: ProfileStore` |
| Lire un objet `@Observable` injecté dans l’arbre | `@Environment(Type.self)` | `@Environment(ProfileStore.self) private var store` |
| Lire une valeur système | `@Environment` avec key path | `@Environment(\.dismiss) private var dismiss` |
| Conserver un objet `ObservableObject` | `@StateObject private` | `@StateObject private var vm = LegacyVM()` |
| Observer un `ObservableObject` reçu | `@ObservedObject` | `@ObservedObject var vm: LegacyVM` |
| Recevoir un `ObservableObject` de l’environnement | `@EnvironmentObject` | Injection préalable `.environmentObject(vm)` |

Les deux familles peuvent cohabiter pendant une migration. Garde un mécanisme cohérent pour chaque modèle. `ObservableObject` reste légitime pour une cible plus ancienne, des pipelines Combine ou les conventions d’un projet existant.

## 3. `name`, `$name` et `_name`

Avec `@State private var name = "Ada"`, `name` lit ou écrit la valeur. `$name` produit un `Binding<String>` : un accès en lecture/écriture au même stockage. `_name` est le wrapper lui-même, utile pour certaines initialisations, rarement au début.

Un binding ne crée ni copie indépendante, ni sauvegarde disque. Il relie deux endroits à la même source de vérité. Source : [Binding — Apple](https://developer.apple.com/documentation/swiftui/binding).

## 4. Exemple autonome : formulaire parent/enfant

```swift
import SwiftUI

struct BindingParentDemo: View {
    @State private var name = "Ada"

    var body: some View {
        VStack(spacing: 16) {
            Text("Bonjour \(name)")
            NameEditor(name: $name)
            SaveAction { print("Enregistrer \(name)") }
        }
        .padding()
    }
}

struct NameEditor: View {
    @Binding var name: String

    var body: some View {
        TextField("Prénom", text: $name)
            .textFieldStyle(.roundedBorder)
    }
}

struct SaveAction: View {
    let onSave: () -> Void
    var body: some View { Button("Enregistrer", action: onSave) }
}
```

Le champ écrit directement dans le `@State` du parent. Le bouton signale une intention ; il ne possède pas le prénom. Si l’enfant déclarait `@State var name`, il créerait sa propre source de vérité. Si tu passais `.constant("Ada")`, les tentatives d’écriture n’actualiseraient aucune donnée persistante.

## 5. Exemple autonome : objet observable et binding

```swift
import SwiftUI
import Observation

@MainActor
@Observable
final class ProfileStore {
    var name = "Ada"
    var notificationsEnabled = false
}

struct ObservableParentDemo: View {
    @State private var store = ProfileStore()

    var body: some View {
        Form {
            TextField("Nom depuis le parent", text: $store.name)
            ProfileEditor(store: store)
            ProfileSummary(store: store)
        }
    }
}

struct ProfileEditor: View {
    @Bindable var store: ProfileStore

    var body: some View {
        Toggle("Notifications", isOn: $store.notificationsEnabled)
    }
}

struct ProfileSummary: View {
    let store: ProfileStore

    var body: some View {
        Text("\(store.name) : \(store.notificationsEnabled ? "activées" : "désactivées")")
    }
}
```

Le parent dispose déjà de la projection `$store` grâce à `@State` : **il n’a pas besoin d’un `@Bindable` supplémentaire**. L’éditeur reçoit l’objet et utilise `@Bindable` pour exposer `$store.notificationsEnabled`. Le résumé n’a besoin que de lire les propriétés observables.

`let store` rend la référence non réassignable, pas l’objet immutable : Swift autorise encore `store.name = "…"`. Si tu veux une vraie interface de lecture seule, expose des valeurs ou des méthodes avec un contrôle d’accès adapté. Source du mécanisme de projection : [State.projectedValue — Apple](https://developer.apple.com/documentation/swiftui/state/projectedvalue).

## 6. Environnement : portée et possession

Conserve le store au niveau qui doit le posséder, puis injecte cette même instance :

```swift
import SwiftUI

struct ProfileEnvironmentRoot: View {
    @State private var store = ProfileStore()

    var body: some View {
        ProfileEnvironmentEditor()
            .environment(store)
    }
}

struct ProfileEnvironmentEditor: View {
    @Environment(ProfileStore.self) private var store

    var body: some View {
        @Bindable var editableStore = store
        TextField("Nom", text: $editableStore.name)
    }
}
```

Cet extrait réutilise `ProfileStore` du bloc précédent. L’objet doit être injecté au-dessus du consommateur, également en preview et dans les tests qui affichent cette vue. Ce n’est pas un singleton global. Le wrapper `@Bindable` expose l’édition ; il ne devient pas propriétaire de la durée de vie du store. Source : [Bindable — Apple](https://developer.apple.com/documentation/swiftui/bindable).

## 7. Édition directe ou brouillon ?

Un `@Binding` modifie directement la donnée d’origine. Pour un formulaire avec **Annuler / Enregistrer**, crée volontairement un brouillon local `@State`, puis transmets sa valeur via `onSave`. Annuler ferme simplement le formulaire sans recopier le brouillon. Les deux approches sont correctes ; elles produisent des comportements différents.

`@State` n’est pas une persistance après fermeture de l’app. Choisis `@AppStorage` pour une préférence simple, un fichier ou une base pour des données, Keychain pour les secrets.

## Exercice et correction attendue

Reprends le premier formulaire. Ajoute un bouton Annuler qui doit vraiment abandonner l’édition. Avant de coder, explique pourquoi le binding direct ne suffit pas. Solution attendue : un éditeur avec un brouillon, une closure `onSave(String)`, et un parent qui applique la valeur uniquement à l’enregistrement. La fiche 05.06 fournit un exemple complet de sheet avec brouillon.

## Pour valider cette fiche

Tu sais choisir entre une valeur, un binding et une closure ; tu sais pourquoi le parent utilise `@State`, l’éditeur `@Bindable`, et le résumé une propriété simple. Tu ne confonds plus observation, durée de vie et sauvegarde sur disque.
