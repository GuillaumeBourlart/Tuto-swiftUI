# Fiche 03.11 — Dark mode propre

## Objectif

Comprendre comment faire en sorte qu’une app SwiftUI s’adapte correctement au mode clair et au mode sombre, sans repeindre toutes les couleurs à la main et sans casser la lisibilité dans un des deux modes.

---

# 1. L’idée à comprendre

iOS propose deux apparences :

- **Light mode** (clair)
- **Dark mode** (sombre)

L’utilisateur choisit lui-même dans les Réglages → Luminosité et affichage. Une app pro doit gérer les deux **sans rien à faire dans le code dans 90 % des cas**, à condition d’utiliser les bonnes couleurs.

Le piège classique : utiliser des couleurs codées en dur (`Color.white`, `Color.black`, `Color(red: ...)`) qui restent identiques dans les deux modes et rendent l’app illisible.

La solution : utiliser des couleurs **adaptatives**.

---

# 2. Les couleurs système adaptatives

SwiftUI fournit des couleurs qui s’adaptent automatiquement au mode courant.

## Couleurs sémantiques de texte

```swift
Color.primary      // noir en light, blanc en dark
Color.secondary    // gris adapté aux deux modes
```

## Couleurs de fond UIKit (toujours valables)

```swift
Color(.systemBackground)            // fond principal
Color(.secondarySystemBackground)   // fond de card
Color(.tertiarySystemBackground)    // fond imbriqué
Color(.systemGray)                  // gris adaptatif
Color(.label)                       // texte principal
Color(.secondaryLabel)              // texte secondaire
```

Exemple :

```swift
VStack {
    Text("Titre")
        .foregroundStyle(Color.primary)

    Text("Sous-titre")
        .foregroundStyle(Color.secondary)
}
.padding()
.background(Color(.systemBackground))
```

Cet écran sera lisible en clair **et** en sombre sans rien faire de plus.

---

# 3. Couleurs personnalisées via Assets

Pour ta couleur de marque (ex. un orange spécifique), utilise un asset couleur.

Dans `Assets.xcassets` :

```text
Color Set → "BrandPrimary"
   Any Appearance → #FF6A00
   Dark Appearance → #FFA64D
```

Puis dans le code :

```swift
Color("BrandPrimary")
```

Tu peux ainsi définir une variante différente pour le dark mode, plus lisible sur fond sombre.

---

# 4. Centraliser dans un design system

Combine avec la fiche 03.06 (design system) :

```swift
enum AppColors {
    static let primary = Color("BrandPrimary")
    static let background = Color(.systemBackground)
    static let cardBackground = Color(.secondarySystemBackground)
    static let textPrimary = Color.primary
    static let textSecondary = Color.secondary
}
```

Tu n’as plus jamais à te poser la question "ça marche en dark ?". Toutes les vues utilisent ces tokens.

---

# 5. Détecter le mode courant avec @Environment

Parfois tu veux adapter une image ou un comportement selon le mode.

```swift
struct LogoView: View {
    @Environment(\.colorScheme) private var colorScheme

    var body: some View {
        Image(colorScheme == .dark ? "logo-dark" : "logo-light")
            .resizable()
            .scaledToFit()
            .frame(height: 60)
    }
}
```

`colorScheme` peut valoir `.light` ou `.dark`.

Astuce : pour les images, tu peux aussi créer un asset image avec deux variantes (Any Appearance + Dark Appearance) et l’utiliser comme une couleur :

```swift
Image("logo")
```

C’est plus propre que le `if` dans le code.

---

# 6. Forcer un mode sur une vue

Tu peux forcer une vue spécifique en clair ou en sombre.

```swift
ContentView()
    .preferredColorScheme(.dark)
```

Cas d’usage : un écran de splash ou de vidéo qui doit toujours être sombre. **Ne fais pas ça sur toute l’app** sauf raison forte (l’utilisateur a choisi son mode dans les Réglages).

---

# 7. Tester en preview dans les deux modes

```swift
#Preview("Light") {
    ContentView()
        .preferredColorScheme(.light)
}

#Preview("Dark") {
    ContentView()
        .preferredColorScheme(.dark)
}
```

C’est la première chose à faire avant de livrer un écran : vérifier visuellement les deux modes.

---

# 8. Erreurs fréquentes

## Couleurs codées en dur

Pas bien :

```swift
Text("Bonjour")
    .foregroundStyle(.black)
    .background(.white)
```

→ invisible en dark mode.

Mieux :

```swift
Text("Bonjour")
    .foregroundStyle(Color.primary)
    .background(Color(.systemBackground))
```

---

## Couleurs custom non adaptées

```swift
Color(red: 0.95, green: 0.95, blue: 0.95) // gris très clair
```

→ presque invisible en mode sombre.

Mieux : passer par un asset couleur avec deux variantes.

---

## Images non adaptées

Un logo noir codé en dur reste noir sur fond noir. Soit utilise `.foregroundStyle(.primary)` pour une icône SF Symbol, soit fournis deux variantes de l’image dans les assets.

---

## Ombres trop fortes en dark mode

Les ombres `.shadow(radius: 10)` sont parfois moches en dark mode. Pense à les réduire ou à les supprimer :

```swift
@Environment(\.colorScheme) private var colorScheme

.shadow(
    color: colorScheme == .dark ? .clear : .black.opacity(0.1),
    radius: 4
)
```

---

# 9. Exemple complet d’écran dark-mode ready

```swift
struct ProfileView: View {
    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "person.circle.fill")
                .font(.system(size: 80))
                .foregroundStyle(.tint)

            Text("Guillaume")
                .font(.title)
                .foregroundStyle(Color.primary)

            Text("Développeur iOS")
                .font(.subheadline)
                .foregroundStyle(Color.secondary)

            Divider()

            VStack(alignment: .leading, spacing: 8) {
                Text("À propos")
                    .font(.headline)
                    .foregroundStyle(Color.primary)

                Text("J'apprends SwiftUI pour passer junior iOS.")
                    .foregroundStyle(Color.secondary)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding()
            .background(Color(.secondarySystemBackground))
            .cornerRadius(12)

            Spacer()
        }
        .padding()
        .background(Color(.systemBackground))
    }
}

#Preview("Light") {
    ProfileView()
        .preferredColorScheme(.light)
}

#Preview("Dark") {
    ProfileView()
        .preferredColorScheme(.dark)
}
```

Cet écran fonctionne dans les deux modes sans `if colorScheme`.

---

# En UIKit (rappel)

En UIKit, tu obtenais le même résultat avec des **couleurs sémantiques** et des **couleurs dynamiques**, mais tu devais souvent réagir au changement de mode **à la main**.

Couleurs sémantiques (équivalent de `Color.primary` / `Color(.systemBackground)`) :

```swift
label.textColor = .label
view.backgroundColor = .systemBackground
card.backgroundColor = .secondarySystemBackground
```

Couleur dynamique custom sans asset (équivalent d'un Color Set à deux variantes) :

```swift
let brand = UIColor { trait in
    trait.userInterfaceStyle == .dark
        ? UIColor(red: 1.0, green: 0.65, blue: 0.30, alpha: 1)
        : UIColor(red: 1.0, green: 0.42, blue: 0.0, alpha: 1)
}
```

Réagir au changement de mode (équivalent de `@Environment(\.colorScheme)`) ou forcer un mode (équivalent de `.preferredColorScheme`) :

```swift
override func traitCollectionDidChange(_ previous: UITraitCollection?) {
    super.traitCollectionDidChange(previous)
    if traitCollection.hasDifferentColorAppearance(comparedTo: previous) {
        updateLogo() // ré-appliquer images/ombres
    }
}

// Forcer le sombre sur un écran (ex. splash) :
overrideUserInterfaceStyle = .dark
```

La différence de mentalité : en UIKit, tu **assignes** des couleurs et tu **observes** `traitCollectionDidChange` pour repeindre toi-même ce qui ne se met pas à jour seul. En SwiftUI, c'est **déclaratif** : tu décris la vue avec des `Color` sémantiques et le framework la recalcule automatiquement quand `colorScheme` change.

👉 En SwiftUI : `UIColor { trait in … }` + `traitCollectionDidChange` deviennent des `Color` sémantiques + `@Environment(\.colorScheme)`, et `overrideUserInterfaceStyle` devient `.preferredColorScheme(_:)`.

---

# 10. Points à connaître

## Le dark mode n’est pas optionnel

Beaucoup d’utilisateurs sont en dark mode 24/7. Une app qui casse en sombre paraît amateur.

---

## Les couleurs système font 90 % du travail

Si tu utilises `Color.primary`, `Color.secondary`, `Color(.systemBackground)`, tu n’as quasiment rien à faire.

---

## Les assets couleur, c’est pour ta marque

Tout ce qui n’est pas système (orange de marque, vert de validation custom) doit passer par un asset avec deux variantes.

---

## Toujours preview les deux modes

Cette habitude évite 100 % des bugs visuels en dark mode.

---

# Résumé

À retenir :

- iOS propose `light` et `dark`, les utilisateurs choisissent dans les Réglages ;
- ne jamais utiliser `.white`, `.black`, ou des `Color(red:green:blue:)` codés en dur pour du texte ou des fonds ;
- préfère `Color.primary`, `Color.secondary`, `Color(.systemBackground)`, `Color(.secondarySystemBackground)` ;
- pour les couleurs de marque, crée des assets couleur avec une variante Dark Appearance ;
- `@Environment(\.colorScheme)` permet de détecter le mode dans le code si besoin ;
- `.preferredColorScheme(.dark)` force un mode mais à utiliser avec parcimonie ;
- preview chaque écran en light et en dark avant de livrer ;
- attention aux images et aux ombres qui peuvent mal passer en sombre.
