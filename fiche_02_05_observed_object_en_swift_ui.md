# Fiche 02.05 — `@ObservedObject` en SwiftUI

> **Famille ObservableObject.** Ces outils restent utiles pour lire l’existant et les projets qui les utilisent. Pour le parcours iOS 17+, commence par [choisir les outils d’état (02.12)](fiche_02_12_choisir_etat_et_bindings.md), puis [Observation (02.11)](fiche_02_11_observable_viewmodel_moderne.md). Les règles de cette fiche concernent les objets `ObservableObject`, pas les objets `@Observable`.

## Objectif

Comprendre à quoi sert `@ObservedObject`, quand l’utiliser, et quelle différence faire avec `@StateObject`.

---

# 1. L’idée à comprendre

`@ObservedObject` sert à observer un objet déjà créé ailleurs.

La vue qui utilise `@ObservedObject` ne possède pas l’objet.

Elle le reçoit depuis un parent, puis se met à jour quand cet objet change.

Schéma simple :

```text
Vue parent
  @StateObject var viewModel
      ↓ transmet viewModel
Sous-vue
  @ObservedObject var viewModel
      ↓ observe les changements
```

À retenir :

```text
@ObservedObject = j’observe un objet que je ne crée pas moi-même.
```

---

# 2. Code minimal

```swift
@MainActor
final class CounterViewModel: ObservableObject {
    @Published var count = 0 // Déclenche une mise à jour des vues qui observent le ViewModel

    func increment() {
        count += 1
    }
}

struct CounterParentView: View {
    @StateObject private var viewModel = CounterViewModel() // Le parent crée et possède le ViewModel

    var body: some View {
        CounterChildView(viewModel: viewModel) // Le parent transmet le ViewModel
    }
}

struct CounterChildView: View {
    @ObservedObject var viewModel: CounterViewModel // L’enfant observe le ViewModel reçu

    var body: some View {
        VStack(spacing: 16) {
            Text("Compteur : \(viewModel.count)")

            Button("Ajouter 1") {
                viewModel.increment()
            }
        }
        .padding()
    }
}
```

Ici :

- `CounterParentView` crée le ViewModel avec `@StateObject` ;
- `CounterChildView` reçoit ce ViewModel ;
- `CounterChildView` l’observe avec `@ObservedObject` ;
- quand `count` change, les vues concernées se mettent à jour.

---

# 3. Différence avec `@StateObject`

La règle la plus importante :

```text
La vue crée l’objet      → @StateObject
La vue reçoit l’objet    → @ObservedObject
```

Exemple :

```swift
struct ProfileView: View {
    @StateObject private var viewModel = ProfileViewModel() // Créé ici

    var body: some View {
        ProfileHeaderView(viewModel: viewModel) // Transmis à une sous-vue
    }
}

struct ProfileHeaderView: View {
    @ObservedObject var viewModel: ProfileViewModel // Reçu ici

    var body: some View {
        Text(viewModel.username)
    }
}
```

`ProfileView` possède le ViewModel.

`ProfileHeaderView` l’utilise simplement.

---

# 4. Pourquoi ne pas recréer le ViewModel dans chaque sous-vue ?

Pas adapté :

```swift
struct ProfileHeaderView: View {
    @StateObject private var viewModel = ProfileViewModel() // Crée un nouveau ViewModel différent

    var body: some View {
        Text(viewModel.username)
    }
}
```

Le problème : cette sous-vue ne partage plus le même ViewModel que le parent.

Tu risques d’avoir :

- des données différentes ;
- des appels API dupliqués ;
- un état incohérent ;
- plusieurs ViewModels alors que tu voulais un seul état partagé.

Préférable :

```swift
struct ProfileHeaderView: View {
    @ObservedObject var viewModel: ProfileViewModel

    var body: some View {
        Text(viewModel.username)
    }
}
```

---

# 5. Exemple réaliste : écran profil découpé

ViewModel :

```swift
@MainActor
final class ProfileViewModel: ObservableObject {
    @Published var username = "Guillaume"
    @Published var bio = "Développeur iOS"
    @Published var isPremium = false

    func togglePremium() {
        isPremium.toggle()
    }
}
```

Vue principale :

```swift
struct ProfileView: View {
    @StateObject private var viewModel = ProfileViewModel()

    var body: some View {
        VStack(spacing: 24) {
            ProfileHeaderView(viewModel: viewModel)
            ProfileBioView(viewModel: viewModel)
            PremiumStatusView(viewModel: viewModel)
        }
        .padding()
    }
}
```

Sous-vues :

```swift
struct ProfileHeaderView: View {
    @ObservedObject var viewModel: ProfileViewModel

    var body: some View {
        VStack(spacing: 8) {
            Image(systemName: "person.circle.fill")
                .font(.system(size: 80))
                .foregroundStyle(.blue)

            Text(viewModel.username)
                .font(.title)
                .fontWeight(.bold)
        }
    }
}

struct ProfileBioView: View {
    @ObservedObject var viewModel: ProfileViewModel

    var body: some View {
        Text(viewModel.bio)
            .foregroundStyle(.secondary)
    }
}

struct PremiumStatusView: View {
    @ObservedObject var viewModel: ProfileViewModel

    var body: some View {
        Button(viewModel.isPremium ? "Premium actif" : "Activer Premium") {
            viewModel.togglePremium()
        }
        .buttonStyle(.borderedProminent)
    }
}
```

Ici, toutes les sous-vues travaillent avec le même ViewModel.

---

# 6. Passer seulement les données nécessaires

Tu n’es pas obligé de passer tout le ViewModel à chaque sous-vue.

Si une sous-vue ne fait qu’afficher une valeur, tu peux passer un `let`.

Exemple plus simple :

```swift
struct ProfileHeaderView: View {
    let username: String

    var body: some View {
        Text(username)
            .font(.title)
    }
}
```

Utilisation :

```swift
ProfileHeaderView(username: viewModel.username)
```

C’est souvent plus propre si la sous-vue n’a pas besoin :

- de modifier le ViewModel ;
- d’appeler ses méthodes ;
- d’observer plusieurs propriétés.

---

# 7. `@ObservedObject` ou `@Binding` ?

Utilise `@Binding` pour modifier une valeur simple appartenant au parent.

```swift
struct SearchFieldView: View {
    @Binding var searchText: String
}
```

Utilise `@ObservedObject` pour observer un objet complet, souvent un ViewModel.

```swift
struct SearchResultsView: View {
    @ObservedObject var viewModel: SearchViewModel
}
```

Résumé :

```text
Une valeur simple modifiable      → @Binding
Un ViewModel ou objet observable  → @ObservedObject
```

---

# 8. Preview avec `@ObservedObject`

Une vue avec `@ObservedObject` doit recevoir un objet dans sa preview.

```swift
#Preview {
    ProfileHeaderView(viewModel: ProfileViewModel())
        .padding()
}
```

Si tu veux une preview avec un état précis :

```swift
#Preview("Premium") {
    let viewModel = ProfileViewModel()
    viewModel.isPremium = true

    return PremiumStatusView(viewModel: viewModel)
        .padding()
}
```

Si Xcode refuse une modification directe dans `#Preview`, crée une petite vue wrapper :

```swift
#Preview {
    PremiumPreviewWrapper()
}

struct PremiumPreviewWrapper: View {
    @StateObject private var viewModel = ProfileViewModel()

    var body: some View {
        PremiumStatusView(viewModel: viewModel)
            .padding()
            .onAppear {
                viewModel.isPremium = true
            }
    }
}
```

---

# 9. Exemple avec injection depuis une vue parent

Cas fréquent : un écran principal crée le ViewModel, puis plusieurs sous-écrans l’utilisent.

```swift
struct SettingsView: View {
    @StateObject private var viewModel = SettingsViewModel()

    var body: some View {
        List {
            SettingsAccountSection(viewModel: viewModel)
            SettingsNotificationSection(viewModel: viewModel)
        }
    }
}

struct SettingsAccountSection: View {
    @ObservedObject var viewModel: SettingsViewModel

    var body: some View {
        Section("Compte") {
            Text(viewModel.email)
        }
    }
}

struct SettingsNotificationSection: View {
    @ObservedObject var viewModel: SettingsViewModel

    var body: some View {
        Section("Notifications") {
            Toggle("Activer", isOn: $viewModel.notificationsEnabled)
        }
    }
}
```

Ici, un seul `SettingsViewModel` est partagé entre les sections.

---

# 10. Points à connaître

## `@ObservedObject` ne conserve pas l’objet comme `@StateObject`

`@ObservedObject` observe un objet reçu.

Il ne dit pas à SwiftUI :

```text
Crée et garde cet objet vivant.
```

C’est le rôle de `@StateObject`.

---

## Évite de créer l’objet directement dans une propriété `@ObservedObject`

Pas idéal :

```swift
@ObservedObject var viewModel = ProfileViewModel()
```

Préférable si la vue possède l’objet :

```swift
@StateObject private var viewModel = ProfileViewModel()
```

Préférable si la vue reçoit l’objet :

```swift
@ObservedObject var viewModel: ProfileViewModel
```

---

## Ne passe pas toujours tout le ViewModel

Si une sous-vue n’a besoin que d’une valeur, passe une valeur.

Si elle doit modifier une valeur simple, passe un `Binding`.

Si elle doit observer plusieurs propriétés ou appeler des méthodes, passe le ViewModel avec `@ObservedObject`.

---

# Résumé

À retenir :

- `@ObservedObject` sert à observer un objet déjà créé ailleurs ;
- il est souvent utilisé dans une sous-vue qui reçoit un ViewModel ;
- si la vue crée et possède le ViewModel, utilise `@StateObject` ;
- si la vue reçoit le ViewModel, utilise `@ObservedObject` ;
- `@ObservedObject` fonctionne avec `ObservableObject` et `@Published` ;
- pour une simple valeur modifiable, `@Binding` est souvent plus adapté ;
- pour une simple valeur en lecture, un `let` suffit.

