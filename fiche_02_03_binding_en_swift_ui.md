# Fiche 02.03 — `@Binding` en SwiftUI

## Objectif

Comprendre à quoi sert `@Binding`, comment il permet à une sous-vue de lire et modifier une valeur appartenant à une vue parente, et pourquoi il est souvent utilisé avec `@State`.

---

# 1. L’idée à comprendre

`@State` stocke une valeur dans une vue.

`@Binding` permet à une autre vue de modifier cette valeur sans en devenir propriétaire.

Schéma simple :

```text
Vue parent
  @State var isOn
      ↓ passe $isOn
Sous-vue
  @Binding var isOn
      ↓ peut lire et modifier isOn
```

La vue parent garde la vraie donnée.

La sous-vue reçoit seulement un lien vers cette donnée.

---

# 2. Code minimal

```swift
struct ParentView: View {
    @State private var isOn = false // La vraie donnée appartient au parent

    var body: some View {
        ToggleRowView(isOn: $isOn) // On passe un Binding avec $
    }
}

struct ToggleRowView: View {
    @Binding var isOn: Bool // La sous-vue peut lire et modifier la donnée

    var body: some View {
        Toggle("Activer", isOn: $isOn) // Toggle modifie la même valeur
            .padding()
    }
}
```

Ici :

- `ParentView` possède la donnée avec `@State` ;
- `ToggleRowView` reçoit un `@Binding` ;
- quand le toggle change, `isOn` est modifié dans le parent ;
- SwiftUI met à jour l’interface.

---

# 3. Pourquoi utiliser `@Binding` ?

Sans `@Binding`, une sous-vue ne peut pas modifier proprement une valeur appartenant à son parent.

Exemple : tu as un écran parent avec une valeur :

```swift
@State private var username = ""
```

Tu veux créer une sous-vue réutilisable pour éditer ce nom.

La sous-vue ne doit pas créer son propre `@State`, sinon elle aurait une copie séparée.

Elle doit recevoir un `@Binding`.

---

# 4. Exemple avec un champ de texte réutilisable

```swift
struct ProfileEditView: View {
    @State private var username = ""

    var body: some View {
        VStack(spacing: 16) {
            UsernameField(username: $username) // On donne un accès modifiable

            Text("Nom actuel : \(username)")
                .foregroundStyle(.secondary)
        }
        .padding()
    }
}

struct UsernameField: View {
    @Binding var username: String

    var body: some View {
        TextField("Nom d’utilisateur", text: $username)
            .textFieldStyle(.roundedBorder)
    }
}
```

Ici, `UsernameField` est réutilisable.

Il ne possède pas le nom.

Il reçoit simplement un lien vers le nom du parent.

---

# 5. Valeur normale vs Binding

Quand tu passes une valeur normale :

```swift
UsernameLabel(username: username)
```

La sous-vue peut seulement lire la valeur.

Quand tu passes un binding :

```swift
UsernameField(username: $username)
```

La sous-vue peut lire et modifier la valeur.

À retenir :

```text
username  → valeur simple en lecture
$username → lien modifiable vers la valeur
```

---

# 6. Exemple avec une sheet

`@Binding` est très utile pour fermer une sheet depuis son contenu.

```swift
struct ParentSheetView: View {
    @State private var isShowingSheet = false

    var body: some View {
        Button("Afficher la sheet") {
            isShowingSheet = true
        }
        .sheet(isPresented: $isShowingSheet) {
            SheetContentView(isPresented: $isShowingSheet)
        }
    }
}

struct SheetContentView: View {
    @Binding var isPresented: Bool

    var body: some View {
        VStack(spacing: 16) {
            Text("Contenu de la sheet")
                .font(.title)

            Button("Fermer") {
                isPresented = false // Ferme la sheet en modifiant l’état du parent
            }
        }
        .padding()
    }
}
```

Ici, la sheet est contrôlée par `isShowingSheet` dans le parent.

La sous-vue peut la fermer grâce au binding.

---

# 7. Exemple avec un composant custom

Tu peux créer un composant qui modifie une valeur externe.

```swift
struct FavoriteButton: View {
    @Binding var isFavorite: Bool

    var body: some View {
        Button {
            isFavorite.toggle()
        } label: {
            Image(systemName: isFavorite ? "heart.fill" : "heart")
                .font(.title)
                .foregroundStyle(isFavorite ? .red : .gray)
        }
    }
}
```

Utilisation :

```swift
struct AnimalDetailView: View {
    @State private var isFavorite = false

    var body: some View {
        FavoriteButton(isFavorite: $isFavorite)
    }
}
```

`FavoriteButton` ne stocke pas lui-même l’état favori.

Il modifie l’état fourni par son parent.

---

# 8. Exemple avec un formulaire

Un formulaire est souvent composé de plusieurs sous-vues avec des bindings.

```swift
struct RegisterFormView: View {
    @State private var email = ""
    @State private var password = ""
    @State private var acceptsTerms = false

    var body: some View {
        VStack(spacing: 16) {
            EmailField(email: $email)
            PasswordField(password: $password)
            TermsToggle(isAccepted: $acceptsTerms)

            Button("Créer le compte") {
                print(email, password, acceptsTerms)
            }
        }
        .padding()
    }
}

struct EmailField: View {
    @Binding var email: String

    var body: some View {
        TextField("Email", text: $email)
            .keyboardType(.emailAddress)
            .textInputAutocapitalization(.never)
            .textFieldStyle(.roundedBorder)
    }
}

struct PasswordField: View {
    @Binding var password: String

    var body: some View {
        SecureField("Mot de passe", text: $password)
            .textFieldStyle(.roundedBorder)
    }
}

struct TermsToggle: View {
    @Binding var isAccepted: Bool

    var body: some View {
        Toggle("J’accepte les conditions", isOn: $isAccepted)
    }
}
```

Chaque sous-vue reste simple, mais toutes modifient les valeurs du formulaire parent.

---

# 9. `@Binding` ne crée pas la donnée

Une variable `@Binding` doit recevoir une donnée depuis l’extérieur.

Cette vue ne peut pas fonctionner seule :

```swift
struct MyToggleView: View {
    @Binding var isOn: Bool

    var body: some View {
        Toggle("Activer", isOn: $isOn)
    }
}
```

Elle doit être appelée avec :

```swift
MyToggleView(isOn: $isOn)
```

Donc `@Binding` signifie :

```text
Je ne possède pas la donnée.
J’ai besoin qu’un parent me donne un lien vers elle.
```

---

# 10. Preview avec `@Binding`

Une vue avec `@Binding` a besoin d’une valeur dans sa preview.

Le plus simple : utiliser `.constant(...)`.

```swift
#Preview {
    FavoriteButton(isFavorite: .constant(true))
        .padding()
}
```

`.constant(true)` crée un binding fixe pour la preview.

C’est pratique pour visualiser la vue.

Mais attention : comme la valeur est constante, elle ne changera pas vraiment dans la preview.

Pour une preview interactive, tu peux créer une petite vue wrapper :

```swift
#Preview {
    FavoriteButtonPreviewWrapper()
}

struct FavoriteButtonPreviewWrapper: View {
    @State private var isFavorite = false

    var body: some View {
        FavoriteButton(isFavorite: $isFavorite)
            .padding()
    }
}
```

Ici, le bouton peut vraiment modifier l’état dans la preview.

---

# 11. Quand utiliser `@Binding`

Utilise `@Binding` quand :

- une sous-vue doit modifier une valeur du parent ;
- tu crées un composant de formulaire ;
- tu crées un bouton custom qui modifie un état externe ;
- tu veux fermer une sheet depuis son contenu ;
- tu veux réutiliser un composant sans qu’il possède lui-même la donnée.

Exemples :

```swift
@Binding var username: String
@Binding var isPresented: Bool
@Binding var isFavorite: Bool
@Binding var selectedDate: Date
@Binding var selectedTab: Int
```

---

# 12. Quand ne pas utiliser `@Binding`

N’utilise pas `@Binding` si la sous-vue n’a besoin que de lire la valeur.

Dans ce cas, passe une valeur normale.

Exemple :

```swift
struct UserNameLabel: View {
    let username: String

    var body: some View {
        Text(username)
    }
}
```

Ici, pas besoin de `@Binding`, car la vue ne modifie pas `username`.

---

# 13. `@Binding` vs callback

Pour une action simple, tu peux parfois utiliser une closure au lieu d’un binding.

Avec binding :

```swift
struct ToggleFavoriteButton: View {
    @Binding var isFavorite: Bool

    var body: some View {
        Button("Favori") {
            isFavorite.toggle()
        }
    }
}
```

Avec callback :

```swift
struct FavoriteActionButton: View {
    let isFavorite: Bool
    let onTap: () -> Void

    var body: some View {
        Button(isFavorite ? "Retirer" : "Ajouter") {
            onTap()
        }
    }
}
```

Utilise plutôt `@Binding` quand le composant modifie directement une valeur simple.

Utilise plutôt une closure quand le parent doit décider quoi faire exactement.

Exemple :

```swift
FavoriteActionButton(isFavorite: isFavorite) {
    viewModel.toggleFavorite()
}
```

Dans une vraie app avec API ou ViewModel, la closure est parfois plus propre, car l’action peut déclencher une logique plus complexe.

---

# 14. Points à connaître

## `@Binding` crée un lien, pas une copie

Si la sous-vue modifie le binding, la valeur du parent change aussi.

---

## Le parent garde la source de vérité

La vraie donnée reste dans le parent.

La sous-vue ne fait que manipuler cette donnée via un lien.

---

## N’utilise pas `@Binding` partout

Si une vue doit seulement afficher une donnée, passe un `let`.

Si une vue doit modifier une donnée simple du parent, utilise `@Binding`.

Si une vue déclenche une action complexe, utilise plutôt une closure ou un ViewModel.

---

# Résumé

À retenir :

- `@Binding` permet à une sous-vue de modifier une valeur détenue par son parent ;
- le parent possède souvent la valeur avec `@State` ;
- la sous-vue reçoit cette valeur avec `@Binding` ;
- on passe un binding avec `$variable` ;
- `variable` donne la valeur, `$variable` donne un lien modifiable ;
- `@Binding` est très utile pour les formulaires, sheets, toggles et composants réutilisables ;
- si une sous-vue ne fait que lire une valeur, utili