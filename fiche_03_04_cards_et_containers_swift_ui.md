# Fiche 03.04 — Cards et containers réutilisables en SwiftUI

## Objectif

Comprendre comment créer des blocs visuels réutilisables comme des cards, containers, sections et encadrés de contenu.

---

# 1. L’idée à comprendre

Dans une app SwiftUI, beaucoup d’écrans sont composés de blocs :

- card de profil ;
- card d’article ;
- card de statistique ;
- section de réglages ;
- bloc d’information ;
- encadré d’erreur ;
- container avec titre.

Au lieu de répéter partout :

```swift
.padding()
.background(.gray.opacity(0.1))
.clipShape(RoundedRectangle(cornerRadius: 16))
```

Tu peux créer des composants ou des modifiers réutilisables.

---

# 2. Card simple

```swift
struct SimpleCardView: View {
    let title: String
    let subtitle: String

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(.headline)

            Text(subtitle)
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(.gray.opacity(0.1))
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }
}
```

Utilisation :

```swift
SimpleCardView(
    title: "SwiftUI",
    subtitle: "Créer des interfaces déclaratives."
)
.padding()
```

---

# 3. Card avec contenu personnalisable

Pour rendre une card très réutilisable, tu peux utiliser `@ViewBuilder`.

```swift
struct AppCard<Content: View>: View {
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
AppCard {
    VStack(alignment: .leading, spacing: 8) {
        Text("Titre")
            .font(.headline)

        Text("Contenu de la card")
            .foregroundStyle(.secondary)
    }
}
.padding()
```

L’avantage : `AppCard` gère le style, mais le contenu reste libre.

---

# 4. Card avec titre intégré

```swift
struct TitledCard<Content: View>: View {
    let title: String
    let content: Content

    init(
        title: String,
        @ViewBuilder content: () -> Content
    ) {
        self.title = title
        self.content = content()
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(title)
                .font(.headline)

            content
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(.gray.opacity(0.1))
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }
}
```

Utilisation :

```swift
TitledCard(title: "Statistiques") {
    HStack {
        Text("Posts")
        Spacer()
        Text("42")
            .fontWeight(.bold)
    }
}
.padding()
```

---

# 5. Card cliquable

Une card peut être cliquable en utilisant `Button`.

```swift
struct ActionCard: View {
    let title: String
    let subtitle: String
    let action: () -> Void

    var body: some View {
        Button {
            action()
        } label: {
            HStack(spacing: 12) {
                VStack(alignment: .leading, spacing: 6) {
                    Text(title)
                        .font(.headline)
                        .foregroundStyle(.primary)

                    Text(subtitle)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }

                Spacer()

                Image(systemName: "chevron.right")
                    .foregroundStyle(.secondary)
            }
            .padding()
            .background(.gray.opacity(0.1))
            .clipShape(RoundedRectangle(cornerRadius: 16))
        }
    }
}
```

Utilisation :

```swift
ActionCard(
    title: "Profil",
    subtitle: "Modifier mes informations"
) {
    print("Ouvrir profil")
}
.padding()
```

---

# 6. Card avec image

```swift
struct ArticleCardView: View {
    let title: String
    let subtitle: String
    let systemImage: String

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: systemImage)
                .font(.title)
                .frame(width: 48, height: 48)
                .background(.blue.opacity(0.15))
                .foregroundStyle(.blue)
                .clipShape(RoundedRectangle(cornerRadius: 12))

            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.headline)

                Text(subtitle)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .lineLimit(2)
            }

            Spacer()
        }
        .padding()
        .background(.gray.opacity(0.1))
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }
}
```

Utilisation :

```swift
ArticleCardView(
    title: "Navigation SwiftUI",
    subtitle: "Comprendre NavigationStack et NavigationPath.",
    systemImage: "arrow.triangle.branch"
)
.padding()
```

---

# 7. Créer un ViewModifier de card

Si tu veux appliquer le même style à beaucoup de vues, tu peux créer un `ViewModifier`.

```swift
struct CardModifier: ViewModifier {
    func body(content: Content) -> some View {
        content
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding()
            .background(.gray.opacity(0.1))
            .clipShape(RoundedRectangle(cornerRadius: 16))
    }
}
```

Extension :

```swift
extension View {
    func cardStyle() -> some View {
        modifier(CardModifier())
    }
}
```

Utilisation :

```swift
VStack(alignment: .leading) {
    Text("Titre")
        .font(.headline)

    Text("Description")
        .foregroundStyle(.secondary)
}
.cardStyle()
.padding()
```

---

# 8. Section réutilisable

```swift
struct AppSection<Content: View>: View {
    let title: String
    let content: Content

    init(
        title: String,
        @ViewBuilder content: () -> Content
    ) {
        self.title = title
        self.content = content()
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(title)
                .font(.title3)
                .fontWeight(.semibold)

            content
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}
```

Utilisation :

```swift
AppSection(title: "Compte") {
    AppCard {
        Text("Informations personnelles")
    }

    AppCard {
        Text("Sécurité")
    }
}
.padding()
```

---

# 9. Où ranger ces composants ?

Pour un projet structuré :

```text
Shared/
  Components/
    Containers/
      AppCard.swift
      TitledCard.swift
      AppSection.swift

    Modifiers/
      CardModifier.swift
```

Si une card est spécifique à une feature :

```text
Features/
  Articles/
    Views/
      ArticleCardView.swift
```

---

# 10. Preview

```swift
#Preview {
    ScrollView {
        VStack(spacing: 16) {
            AppCard {
                Text("Card simple")
            }

            TitledCard(title: "Profil") {
                Text("Guillaume")
                Text("Développeur iOS")
                    .foregroundStyle(.secondary)
            }

            ActionCard(
                title: "Réglages",
                subtitle: "Ouvrir les paramètres"
            ) {}

            ArticleCardView(
                title: "SwiftUI",
                subtitle: "Apprendre à créer des interfaces propres.",
                systemImage: "swift"
            )
        }
        .padding()
    }
}
```

---

# En UIKit (rappel)

Une « card » n'était pas un type : c'était une `UIView` dont tu configurais le `layer` à la main, et tu plaçais le contenu avec des contraintes.

```swift
let card = UIView()
card.backgroundColor = .secondarySystemBackground
card.layer.cornerRadius = 16
card.layer.masksToBounds = true // pour clipper le contenu (équiv. clipShape)
```

Si tu voulais une ombre, il fallait une vue SANS `masksToBounds` (l'ombre déborde du cadre), donc souvent deux vues imbriquées ou un `cornerCurve` à part :

```swift
card.layer.masksToBounds = false
card.layer.shadowColor = UIColor.black.cgColor
card.layer.shadowOpacity = 0.1
card.layer.shadowRadius = 8
card.layer.shadowOffset = CGSize(width: 0, height: 2)
```

Le « container » qui empile titre + sous-titre, c'était une `UIStackView` posée dans la card avec des contraintes (`padding` = `layoutMargins` ou des `constant` sur les contraintes) :

```swift
let stack = UIStackView(arrangedSubviews: [titleLabel, subtitleLabel])
stack.axis = .vertical
stack.spacing = 8
stack.isLayoutMarginsRelativeArrangement = true
stack.directionalLayoutMargins = .init(top: 16, leading: 16, bottom: 16, trailing: 16)
```

La différence de mentalité : en UIKit tu **construis et configures** un objet visuel étape par étape (impératif), et tu jongles entre `masksToBounds` pour les coins et son absence pour l'ombre. En SwiftUI, le style est **décrit** par des modifiers chaînés sur la vue.

👉 En SwiftUI : `.padding().background(...).clipShape(RoundedRectangle(cornerRadius: 16)).shadow(radius: 8)` — pas de `layer`, pas de contraintes, pas de conflit ombre/clip.

---

# 11. Points à connaître

## Préfère un composant si le contenu a une logique spécifique

Exemple :

```swift
ArticleCardView(article: article)
```

C’est mieux qu’une card générique si l’affichage est vraiment propre aux articles.

---

## Préfère un modifier si tu veux seulement réutiliser un style

Exemple :

```swift
Text("Contenu")
    .cardStyle()
```

C’est utile quand le contenu varie beaucoup, mais le style reste le même.

---

## Évite les styles dupliqués partout

Si tu répètes plusieurs fois :

```swift
.padding()
.background(...)
.clipShape(...)
```

c’est souvent le signe qu’il faut créer une card ou un modifier.

---

# Résumé

À retenir :

- une card est un container visuel réutilisable ;
- `@ViewBuilder` permet de créer une card avec contenu libre ;
- une card peut être statique ou cliquable ;
- un `ViewModifier` est pratique pour réutiliser seulement un style ;
- une section réutilisable peut organiser plusieurs cards ;
- range les containers partagés dans `Shared/Components` ;
- crée une card spécifique si le contenu appartient à une feature précise.

