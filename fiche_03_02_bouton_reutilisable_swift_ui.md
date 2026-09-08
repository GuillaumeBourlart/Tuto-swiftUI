# Fiche 03.02 — Créer un bouton réutilisable en SwiftUI

## Objectif

Comprendre comment créer un bouton SwiftUI réutilisable, configurable, propre, et utilisable dans plusieurs écrans de l’app.

---

# 1. L’idée à comprendre

Dans une app, tu vas souvent répéter les mêmes styles de boutons :

- bouton principal ;
- bouton secondaire ;
- bouton dangereux ;
- bouton désactivé ;
- bouton avec icône ;
- bouton loading.

Au lieu de recopier ce style partout :

```swift
Button("Continuer") {}
    .frame(maxWidth: .infinity)
    .padding()
    .background(.blue)
    .foregroundStyle(.white)
    .clipShape(RoundedRectangle(cornerRadius: 12))
```

Tu peux créer un composant réutilisable :

```swift
PrimaryButton(title: "Continuer") {
    print("Action")
}
```

C’est plus propre, plus lisible, et plus facile à modifier dans toute l’app.

---

# 2. Bouton simple réutilisable

```swift
struct PrimaryButton: View {
    let title: String
    let action: () -> Void

    var body: some View {
        Button {
            action() // Action donnée par la vue qui utilise le bouton
        } label: {
            Text(title)
                .font(.headline)
                .frame(maxWidth: .infinity)
                .padding()
                .background(.blue)
                .foregroundStyle(.white)
                .clipShape(RoundedRectangle(cornerRadius: 12))
        }
    }
}
```

Utilisation :

```swift
PrimaryButton(title: "Continuer") {
    print("Continuer")
}
.padding(.horizontal)
```

Ici :

- `title` permet de personnaliser le texte ;
- `action` permet de personnaliser ce qui se passe au clic ;
- le style reste centralisé dans `PrimaryButton`.

---

# 3. Bouton avec état désactivé

Un bouton doit souvent être désactivé si un formulaire est incomplet.

```swift
struct PrimaryButton: View {
    let title: String
    let isDisabled: Bool
    let action: () -> Void

    init(
        title: String,
        isDisabled: Bool = false,
        action: @escaping () -> Void
    ) {
        self.title = title
        self.isDisabled = isDisabled
        self.action = action
    }

    var body: some View {
        Button {
            action()
        } label: {
            Text(title)
                .font(.headline)
                .frame(maxWidth: .infinity)
                .padding()
                .background(isDisabled ? .gray.opacity(0.4) : .blue)
                .foregroundStyle(.white)
                .clipShape(RoundedRectangle(cornerRadius: 12))
        }
        .disabled(isDisabled) // Empêche le clic si true
    }
}
```

Utilisation :

```swift
PrimaryButton(
    title: "Créer le compte",
    isDisabled: email.isEmpty || password.isEmpty
) {
    print("Créer le compte")
}
```

---

# 4. Bouton avec loading

Cas très fréquent : pendant une requête API, le bouton affiche un loader et ne doit plus être cliquable.

```swift
struct PrimaryButton: View {
    let title: String
    let isLoading: Bool
    let isDisabled: Bool
    let action: () -> Void

    init(
        title: String,
        isLoading: Bool = false,
        isDisabled: Bool = false,
        action: @escaping () -> Void
    ) {
        self.title = title
        self.isLoading = isLoading
        self.isDisabled = isDisabled
        self.action = action
    }

    var body: some View {
        Button {
            action()
        } label: {
            HStack {
                if isLoading {
                    ProgressView()
                        .tint(.white)
                } else {
                    Text(title)
                        .font(.headline)
                }
            }
            .frame(maxWidth: .infinity)
            .padding()
            .background(buttonBackground)
            .foregroundStyle(.white)
            .clipShape(RoundedRectangle(cornerRadius: 12))
        }
        .disabled(isDisabled || isLoading)
    }

    private var buttonBackground: Color {
        if isDisabled || isLoading {
            return .gray.opacity(0.4)
        } else {
            return .blue
        }
    }
}
```

Utilisation :

```swift
PrimaryButton(
    title: "Se connecter",
    isLoading: viewModel.isLoading,
    isDisabled: email.isEmpty || password.isEmpty
) {
    Task {
        await viewModel.login(email: email, password: password)
    }
}
```

---

# 5. Bouton avec icône

Tu peux ajouter une icône optionnelle.

```swift
struct IconButton: View {
    let title: String
    let systemImage: String
    let action: () -> Void

    var body: some View {
        Button {
            action()
        } label: {
            Label(title, systemImage: systemImage)
                .font(.headline)
                .frame(maxWidth: .infinity)
                .padding()
                .background(.blue)
                .foregroundStyle(.white)
                .clipShape(RoundedRectangle(cornerRadius: 12))
        }
    }
}
```

Utilisation :

```swift
IconButton(title: "Continuer avec Apple", systemImage: "apple.logo") {
    print("Apple Sign In")
}
```

`Label` est pratique pour afficher texte + icône.

---

# 6. Bouton secondaire

Un bouton secondaire peut avoir un fond plus discret.

```swift
struct SecondaryButton: View {
    let title: String
    let action: () -> Void

    var body: some View {
        Button {
            action()
        } label: {
            Text(title)
                .font(.headline)
                .frame(maxWidth: .infinity)
                .padding()
                .background(.gray.opacity(0.15))
                .foregroundStyle(.primary)
                .clipShape(RoundedRectangle(cornerRadius: 12))
        }
    }
}
```

Utilisation :

```swift
SecondaryButton(title: "Plus tard") {
    print("Ignorer")
}
```

---

# 7. Bouton dangereux

Pour une action destructive, comme supprimer un compte ou effacer des données, tu peux créer un bouton dédié.

```swift
struct DestructiveButton: View {
    let title: String
    let action: () -> Void

    var body: some View {
        Button(role: .destructive) {
            action()
        } label: {
            Text(title)
                .font(.headline)
                .frame(maxWidth: .infinity)
                .padding()
                .background(.red.opacity(0.15))
                .foregroundStyle(.red)
                .clipShape(RoundedRectangle(cornerRadius: 12))
        }
    }
}
```

Utilisation :

```swift
DestructiveButton(title: "Supprimer le compte") {
    print("Suppression")
}
```

---

# 8. Version avec style enum

Si tu veux éviter plusieurs fichiers `PrimaryButton`, `SecondaryButton`, `DestructiveButton`, tu peux créer un seul composant avec un style.

```swift
enum AppButtonStyle {
    case primary
    case secondary
    case destructive
}
```

```swift
struct AppButton: View {
    let title: String
    let style: AppButtonStyle
    let isLoading: Bool
    let isDisabled: Bool
    let action: () -> Void

    init(
        title: String,
        style: AppButtonStyle = .primary,
        isLoading: Bool = false,
        isDisabled: Bool = false,
        action: @escaping () -> Void
    ) {
        self.title = title
        self.style = style
        self.isLoading = isLoading
        self.isDisabled = isDisabled
        self.action = action
    }

    var body: some View {
        Button(role: style == .destructive ? .destructive : nil) {
            action()
        } label: {
            HStack {
                if isLoading {
                    ProgressView()
                        .tint(foregroundColor)
                } else {
                    Text(title)
                        .font(.headline)
                }
            }
            .frame(maxWidth: .infinity)
            .padding()
            .background(backgroundColor)
            .foregroundStyle(foregroundColor)
            .clipShape(RoundedRectangle(cornerRadius: 12))
        }
        .disabled(isDisabled || isLoading)
    }

    private var backgroundColor: Color {
        if isDisabled || isLoading {
            return .gray.opacity(0.25)
        }

        switch style {
        case .primary:
            return .blue
        case .secondary:
            return .gray.opacity(0.15)
        case .destructive:
            return .red.opacity(0.15)
        }
    }

    private var foregroundColor: Color {
        if isDisabled || isLoading {
            return .secondary
        }

        switch style {
        case .primary:
            return .white
        case .secondary:
            return .primary
        case .destructive:
            return .red
        }
    }
}
```

Utilisation :

```swift
AppButton(title: "Continuer") {
    print("Primary")
}

AppButton(title: "Plus tard", style: .secondary) {
    print("Secondary")
}

AppButton(title: "Supprimer", style: .destructive) {
    print("Destructive")
}
```

---

# 9. Bouton avec contenu personnalisable

Si tu veux un bouton très flexible, tu peux accepter une vue personnalisée comme label.

```swift
struct CustomAppButton<Content: View>: View {
    let action: () -> Void
    let content: Content

    init(
        action: @escaping () -> Void,
        @ViewBuilder content: () -> Content
    ) {
        self.action = action
        self.content = content()
    }

    var body: some View {
        Button {
            action()
        } label: {
            content
                .frame(maxWidth: .infinity)
                .padding()
                .background(.blue)
                .foregroundStyle(.white)
                .clipShape(RoundedRectangle(cornerRadius: 12))
        }
    }
}
```

Utilisation :

```swift
CustomAppButton {
    print("Action")
} content: {
    HStack {
        Image(systemName: "sparkles")
        Text("Découvrir Premium")
    }
}
```

C’est utile si certains boutons ont des labels plus complexes.

---

# 10. Où ranger les boutons ?

Pour un petit projet :

```text
Components/
  PrimaryButton.swift
  SecondaryButton.swift
  AppButton.swift
```

Pour un projet plus structuré :

```text
Shared/
  Components/
    Buttons/
      AppButton.swift
      IconButton.swift
```

Si le bouton est utilisé partout dans l’app, il va dans `Shared/Components`.

S’il est spécifique à une feature, il peut rester dans la feature.

---

# 11. Preview du bouton

```swift
#Preview {
    VStack(spacing: 16) {
        AppButton(title: "Continuer") {}

        AppButton(title: "Chargement", isLoading: true) {}

        AppButton(title: "Désactivé", isDisabled: true) {}

        AppButton(title: "Secondaire", style: .secondary) {}

        AppButton(title: "Supprimer", style: .destructive) {}
    }
    .padding()
}
```

Cette preview permet de vérifier rapidement tous les états du bouton.

---

# En UIKit (rappel)

En UIKit, pas de `ButtonStyle` réutilisable : tu factorises soit via une **factory**, soit via une **sous-classe** de `UIButton`, en t'appuyant sur `UIButton.Configuration`.

Factory avec `UIButton.Configuration` et action via `UIAction` :

```swift
func makePrimaryButton(title: String, handler: @escaping () -> Void) -> UIButton {
    var config = UIButton.Configuration.filled()   // .tinted() pour secondaire
    config.title = title
    config.image = UIImage(systemName: "apple.logo") // image + titre
    config.imagePadding = 8
    config.cornerStyle = .medium

    return UIButton(configuration: config, primaryAction: UIAction { _ in handler() })
}
```

État `loading` : avec `UIButton.Configuration`, on a `showsActivityIndicator` qui remplace automatiquement le titre par un `UIActivityIndicatorView` :

```swift
var config = button.configuration
config?.showsActivityIndicator = isLoading   // spinner à la place du titre
config?.title = isLoading ? nil : "Se connecter"
button.configuration = config
button.isEnabled = !isLoading                // désactive pendant la requête
```

Différence de mentalité : en UIKit tu **mutes impérativement** l'instance (`button.configuration = ...`, `isEnabled = ...`) à chaque changement d'état. En SwiftUI, tu **décris** le bouton en fonction de l'état (`isLoading`, `isDisabled`) et le framework recalcule la vue.

👉 En SwiftUI : un composant `View` (ou un `ButtonStyle`) réutilisable décrit l'apparence selon l'état, au lieu de muter une instance `UIButton`.

---

# 12. Points à connaître

## Ne mets pas toute la logique métier dans le bouton

Le bouton doit afficher et déclencher une action.

Il ne doit pas contenir toute la logique de connexion, suppression, appel API, etc.

Préférable :

```swift
AppButton(title: "Se connecter") {
    Task {
        await viewModel.login()
    }
}
```

Le bouton déclenche.

Le ViewModel gère la logique.

---

## Utilise une closure pour l’action

```swift
let action: () -> Void
```

C’est la manière la plus simple de rendre un bouton réutilisable.

---

## Gère le loading et le disabled

Dans une vraie app, un bouton doit souvent gérer :

```text
normal
loading
disabled
```

C’est important pour éviter les doubles clics et améliorer l’expérience utilisateur.

---

## Attention aux couleurs fixes

Pour un vrai design system, évite de mettre `.blue`, `.red`, `.gray` partout.

Plus tard, tu pourras remplacer par des couleurs centralisées :

```swift
AppColors.primary
AppColors.danger
AppColors.surface
```

---

# Résumé

À retenir :

- un bouton réutilisable évite de répéter le même style partout ;
- le texte est souvent passé avec `title` ;
- l’action est passée avec une closure `() -> Void` ;
- un bon bouton gère souvent `isLoading` et `isDisabled` ;
- tu peux avoir plusieurs composants ou un seul bouton avec un enum de style ;
- `Label` est pratique pour un bouton avec icône ;
- `@ViewBuilder` permet de personnaliser totalement le contenu du bouton ;
- le bouton ne doit pas contenir la logique métier, il doit seulement déclencher une action.

