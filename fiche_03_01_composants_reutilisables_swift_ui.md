# Fiche 03.01 — Créer des composants réutilisables en SwiftUI

## Objectif

Comprendre comment découper une interface SwiftUI en petites vues réutilisables, pourquoi c’est important, et comment créer des composants propres avec des paramètres.

---

# 1. L’idée à comprendre

En SwiftUI, une interface est composée de vues.

Une vue peut représenter :

- un écran complet ;
- une section d’écran ;
- une cellule ;
- un bouton ;
- un champ de texte ;
- une card ;
- un message d’erreur ;
- un loader.

Quand une partie d’interface devient trop longue, répétée ou difficile à lire, tu peux la transformer en composant réutilisable.

Exemple :

```text
ProfileView
  ↓
ProfileHeaderView
ProfileStatsView
ProfileActionButton
```

Le but est d’éviter d’avoir un seul énorme `body` impossible à maintenir.

---

# 2. Exemple sans composant

```swift
struct ProfileView: View {
    var body: some View {
        VStack(spacing: 20) {
            Image(systemName: "person.circle.fill")
                .font(.system(size: 80))
                .foregroundStyle(.blue)

            Text("Guillaume")
                .font(.title)
                .fontWeight(.bold)

            Text("Développeur iOS")
                .font(.subheadline)
                .foregroundStyle(.secondary)

            Button("Modifier le profil") {
                print("Modifier")
            }
            .buttonStyle(.borderedProminent)
        }
        .padding()
    }
}
```

Ce code fonctionne.

Mais si l’écran grossit, il deviendra vite difficile à lire.

---

# 3. Même exemple découpé en composants

```swift
struct ProfileView: View {
    var body: some View {
        VStack(spacing: 20) {
            ProfileHeaderView(
                name: "Guillaume",
                subtitle: "Développeur iOS"
            )

            ProfileEditButton {
                print("Modifier")
            }
        }
        .padding()
    }
}
```

Composant header :

```swift
struct ProfileHeaderView: View {
    let name: String
    let subtitle: String

    var body: some View {
        VStack(spacing: 8) {
            Image(systemName: "person.circle.fill")
                .font(.system(size: 80))
                .foregroundStyle(.blue)

            Text(name)
                .font(.title)
                .fontWeight(.bold)

            Text(subtitle)
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
    }
}
```

Composant bouton :

```swift
struct ProfileEditButton: View {
    let action: () -> Void

    var body: some View {
        Button("Modifier le profil") {
            action()
        }
        .buttonStyle(.borderedProminent)
    }
}
```

Le résultat visuel est le même, mais le code est plus clair.

---

# 4. Créer un composant avec des paramètres

Un composant SwiftUI reçoit souvent des valeurs avec `let`.

```swift
struct BadgeView: View {
    let text: String
    let color: Color

    var body: some View {
        Text(text)
            .font(.caption)
            .fontWeight(.semibold)
            .padding(.horizontal, 10)
            .padding(.vertical, 6)
            .background(color.opacity(0.15))
            .foregroundStyle(color)
            .clipShape(Capsule())
    }
}
```

Utilisation :

```swift
BadgeView(text: "Premium", color: .blue)
BadgeView(text: "Nouveau", color: .green)
BadgeView(text: "Erreur", color: .red)
```

Ici, le composant est réutilisable parce que son texte et sa couleur sont configurables.

---

# 5. Composant avec une action

Si ton composant déclenche une action, tu peux lui passer une closure.

```swift
struct PrimaryButton: View {
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
```

La vue `PrimaryButton` ne décide pas ce qui se passe au clic.

Elle reçoit l’action depuis l’extérieur.

---

# 6. Composant avec état externe modifiable

Si le composant doit modifier une valeur du parent, tu peux utiliser `@Binding`.

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

À retenir :

```text
Le composant lit et modifie une valeur du parent → @Binding
Le composant déclenche une logique externe        → closure
```

---

# 7. Composant avec contenu personnalisé

Parfois, tu veux créer un composant qui contient une zone personnalisable.

Exemple : une card réutilisable.

```swift
struct CardView<Content: View>: View {
    let content: Content

    init(@ViewBuilder content: () -> Content) {
        self.content = content()
    }

    var body: some View {
        content
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding()
            .background(.gray.opacity(0.1))
            .clipShape(RoundedRectangle(cornerRadius: 16))
    }
}
```

Utilisation :

```swift
CardView {
    VStack(alignment: .leading, spacing: 8) {
        Text("Titre")
            .font(.headline)

        Text("Description de la card")
            .foregroundStyle(.secondary)
    }
}
.padding()
```

`@ViewBuilder` permet de passer plusieurs vues comme contenu.

---

# 8. Exemple réaliste : ligne de réglage

```swift
struct SettingsRowView: View {
    let icon: String
    let title: String
    let subtitle: String?
    let action: () -> Void

    var body: some View {
        Button {
            action()
        } label: {
            HStack(spacing: 12) {
                Image(systemName: icon)
                    .font(.title3)
                    .frame(width: 32, height: 32)
                    .foregroundStyle(.blue)

                VStack(alignment: .leading, spacing: 2) {
                    Text(title)
                        .font(.body)
                        .foregroundStyle(.primary)

                    if let subtitle {
                        Text(subtitle)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }

                Spacer()

                Image(systemName: "chevron.right")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            .padding(.vertical, 8)
        }
    }
}
```

Utilisation :

```swift
SettingsRowView(
    icon: "bell.fill",
    title: "Notifications",
    subtitle: "Gérer les alertes"
) {
    print("Ouvrir notifications")
}
```

Ce composant peut être réutilisé dans plusieurs écrans de réglages.

---

# 9. Exemple réaliste : état vide réutilisable

```swift
struct EmptyStateView: View {
    let systemImage: String
    let title: String
    let message: String

    var body: some View {
        VStack(spacing: 12) {
            Image(systemName: systemImage)
                .font(.system(size: 48))
                .foregroundStyle(.secondary)

            Text(title)
                .font(.headline)

            Text(message)
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
        }
        .padding()
    }
}
```

Utilisation :

```swift
EmptyStateView(
    systemImage: "tray",
    title: "Aucun résultat",
    message: "Essaie de modifier ta recherche."
)
```

---

# 10. Où ranger les composants ?

Pour un petit projet :

```text
Components/
  PrimaryButton.swift
  EmptyStateView.swift
  CardView.swift
```

Pour un projet organisé par features :

```text
Features/
  Profile/
    Views/
      ProfileView.swift
      ProfileHeaderView.swift
      ProfileStatsView.swift

Shared/
  Components/
    PrimaryButton.swift
    EmptyStateView.swift
    CardView.swift
```

Règle simple :

```text
Composant utilisé uniquement dans Profile → dossier Profile
Composant utilisé partout dans l’app      → Shared/Components
```

---

# 11. Preview d’un composant

Un bon composant doit être facile à prévisualiser.

```swift
#Preview {
    VStack(spacing: 16) {
        BadgeView(text: "Premium", color: .blue)
        BadgeView(text: "Nouveau", color: .green)
        BadgeView(text: "Erreur", color: .red)
    }
    .padding()
}
```

Preview d’un bouton :

```swift
#Preview {
    PrimaryButton(title: "Continuer") {
        print("Action")
    }
    .padding()
}
```

Preview d’un état vide :

```swift
#Preview {
    EmptyStateView(
        systemImage: "magnifyingglass",
        title: "Aucun résultat",
        message: "Aucun élément ne correspond à ta recherche."
    )
}
```

---

# 12. Quand créer un composant ?

Crée un composant quand :

- un morceau de vue devient long ;
- un bloc est répété plusieurs fois ;
- tu veux donner un nom clair à une partie de l’interface ;
- tu veux prévisualiser une partie isolée ;
- tu veux réutiliser un style ;
- tu veux simplifier le `body` principal.

Exemples :

```text
PrimaryButton
ProfileHeaderView
UserRowView
ArticleCardView
EmptyStateView
ErrorStateView
LoadingView
SettingsRowView
```

---

# 13. Quand ne pas créer un composant ?

Ne découpe pas trop vite si ça rend le code plus compliqué.

Exemple inutile :

```swift
struct TitleText: View {
    var body: some View {
        Text("Titre")
    }
}
```

Si une vue est utilisée une seule fois et fait une seule ligne, elle n’a pas forcément besoin d’être extraite.

Le but est de rendre le code plus clair, pas de créer 50 fichiers inutiles.

---

# En UIKit (rappel)

En UIKit, un composant réutilisable est une **sous-classe** de `UIView` (ou `UIControl`) : tu construis sa hiérarchie et tu poses les contraintes à la main dans un `setup()`, appelé depuis les deux initialiseurs obligatoires.

```swift
final class BadgeView: UIView {
    private let label = UILabel()

    init(text: String, color: UIColor) {
        super.init(frame: .zero)
        setup(text: text, color: color)
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    private func setup(text: String, color: UIColor) {
        label.text = text
        label.font = .preferredFont(forTextStyle: .caption1)
        label.textColor = color

        backgroundColor = color.withAlphaComponent(0.15)
        layer.cornerRadius = 12

        addSubview(label)
        label.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            label.topAnchor.constraint(equalTo: topAnchor, constant: 6),
            label.bottomAnchor.constraint(equalTo: bottomAnchor, constant: -6),
            label.leadingAnchor.constraint(equalTo: leadingAnchor, constant: 10),
            label.trailingAnchor.constraint(equalTo: trailingAnchor, constant: -10)
        ])
    }
}
```

Pour un bouton avec action, tu passes par `UIAction` (plus besoin du vieux target-action) :

```swift
let button = UIButton(configuration: .borderedProminent(), primaryAction: UIAction(title: "Continuer") { _ in
    print("Continuer")
})
```

La différence de mentalité : en UIKit tu **construis et mutes un objet** étape par étape (impératif), et tu en fais une classe pour le réutiliser. En SwiftUI, un composant n'est pas un objet à configurer mais une **`struct View` paramétrée** : tu décris le résultat voulu en fonction des entrées (déclaratif), et le framework reconstruit la vue quand les paramètres changent.

👉 En SwiftUI : la sous-classe `UIView` + `setup()` + contraintes devient une simple `struct BadgeView: View` avec des propriétés (`let text`, `let color`) et un `body`.

---

# 14. Points à connaître

## Une View peut être minuscule

Un composant SwiftUI peut être très petit.

```swift
struct SeparatorView: View {
    var body: some View {
        Divider()
            .padding(.horizontal)
    }
}
```

Ce n’est pas un problème si ça améliore la lisibilité.

---

## Utilise `let` pour les données en lecture seule

```swift
struct UserRowView: View {
    let name: String
    let subtitle: String
}
```

Si la vue ne modifie pas la donnée, un `let` suffit.

---

## Utilise une closure pour les actions

```swift
let action: () -> Void
```

C’est très courant pour les boutons et cellules cliquables.

---

## Utilise `@Binding` pour modifier une valeur du parent

```swift
@Binding var isOn: Bool
```

C’est courant pour les toggles, favoris, champs de texte custom, etc.

---

# Résumé

À retenir :

- une app SwiftUI est composée de petites vues ;
- un composant est simplement une `View` réutilisable ;
- utilise `let` pour passer des données en lecture seule ;
- utilise une closure pour déclencher une action ;
- utilise `@Binding` pour modifier une valeur du parent ;
- utilise `@ViewBuilder` pour créer des composants avec contenu personnalisable ;
- range les composants partagés dans `Shared/Components` ;
- range les composants spécifiques dans leur feature ;
- un bon composant doit être facile à prévisualiser.

