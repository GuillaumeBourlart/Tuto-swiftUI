# Fiche 03.06 — Design system simple : couleurs, typographie, spacing

## Objectif

Comprendre comment centraliser les couleurs, espacements, rayons et styles de texte pour éviter d’éparpiller des valeurs partout dans l’app.

Un design system simple permet d’avoir une interface cohérente, plus facile à modifier et plus professionnelle.

## 1. L’idée à comprendre

Sans design system, on finit souvent avec ce genre de code partout :

```swift
Text("Créer un compte")
    .font(.system(size: 17, weight: .semibold))
    .foregroundStyle(.white)
    .padding(12)
    .background(.blue)
    .cornerRadius(10)
```

Le problème, c’est que si tu veux changer le bleu principal, le rayon des boutons ou l’espacement général, tu dois modifier plein de fichiers.

L’idée est donc de créer des valeurs réutilisables :

```swift
AppColors.primary
AppSpacing.medium
AppRadius.medium
AppTypography.title
```

## 2. Structure recommandée

```text
Shared/
└── DesignSystem/
    ├── Colors.swift
    ├── Spacing.swift
    ├── Radius.swift
    └── Typography.swift
```

Tu peux aussi tout mettre dans un seul fichier au début, mais dès que l’app grossit, mieux vaut séparer.

## 3. Couleurs centralisées

```swift
import SwiftUI

enum AppColors {
    static let primary = Color.blue
    static let secondary = Color.gray
    static let background = Color(.systemBackground)
    static let cardBackground = Color(.secondarySystemBackground)
    static let textPrimary = Color.primary
    static let textSecondary = Color.secondary
    static let error = Color.red
    static let success = Color.green
}
```

Utilisation :

```swift
Text("Bienvenue")
    .foregroundStyle(AppColors.textPrimary)

Button("Continuer") {
    
}
.background(AppColors.primary)
```

Dans une vraie app, tu peux ensuite brancher ces couleurs sur des assets Xcode pour mieux gérer le dark mode.

## 4. Espacements centralisés

```swift
import SwiftUI

enum AppSpacing {
    static let extraSmall: CGFloat = 4
    static let small: CGFloat = 8
    static let medium: CGFloat = 16
    static let large: CGFloat = 24
    static let extraLarge: CGFloat = 32
}
```

Utilisation :

```swift
VStack(spacing: AppSpacing.medium) {
    Text("Titre")
    Text("Description")
}
.padding(AppSpacing.large)
```

Au lieu d’avoir `.padding(12)`, `.padding(14)`, `.padding(18)` partout, tu gardes une logique cohérente.

## 5. Rayons centralisés

```swift
import SwiftUI

enum AppRadius {
    static let small: CGFloat = 8
    static let medium: CGFloat = 12
    static let large: CGFloat = 20
    static let pill: CGFloat = 999
}
```

Utilisation :

```swift
RoundedRectangle(cornerRadius: AppRadius.medium)
    .fill(AppColors.cardBackground)
```

## 6. Typographies centralisées

```swift
import SwiftUI

enum AppTypography {
    static let largeTitle = Font.system(size: 34, weight: .bold)
    static let title = Font.system(size: 24, weight: .bold)
    static let subtitle = Font.system(size: 18, weight: .semibold)
    static let body = Font.system(size: 16, weight: .regular)
    static let caption = Font.system(size: 13, weight: .regular)
}
```

Utilisation :

```swift
Text("Créer un compte")
    .font(AppTypography.title)

Text("Renseigne tes informations")
    .font(AppTypography.body)
    .foregroundStyle(AppColors.textSecondary)
```

## 7. Exemple avec un bouton réutilisable

```swift
import SwiftUI

struct PrimaryButton: View {
    let title: String
    let isLoading: Bool
    let action: () -> Void
    
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
                        .font(AppTypography.body.weight(.semibold))
                }
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, AppSpacing.medium)
            .background(AppColors.primary)
            .foregroundStyle(.white)
            .clipShape(RoundedRectangle(cornerRadius: AppRadius.medium))
        }
        .disabled(isLoading)
    }
}
```

Utilisation :

```swift
PrimaryButton(title: "Se connecter", isLoading: false) {
    print("Connexion")
}
.padding(.horizontal, AppSpacing.large)
```

## 8. Exemple avec une card réutilisable

```swift
import SwiftUI

struct AppCard<Content: View>: View {
    let content: Content
    
    init(@ViewBuilder content: () -> Content) {
        self.content = content()
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: AppSpacing.medium) {
            content
        }
        .padding(AppSpacing.medium)
        .background(AppColors.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: AppRadius.large))
    }
}
```

Utilisation :

```swift
AppCard {
    Text("Profil")
        .font(AppTypography.subtitle)
    
    Text("Complète ton profil pour améliorer ton expérience.")
        .font(AppTypography.body)
        .foregroundStyle(AppColors.textSecondary)
}
.padding(AppSpacing.large)
```

## En UIKit (rappel)

En UIKit, tu centralisais déjà tes tokens, mais via des `enum` de `UIColor`/`UIFont` (ou des asset colors) :

```swift
enum AppColors {
    static let primary = UIColor(named: "Primary") ?? .systemBlue
    static let cardBackground = UIColor.secondarySystemBackground
}

enum AppTypography {
    // Dynamic Type : la police s'adapte aux réglages d'accessibilité
    static let title = UIFont.preferredFont(forTextStyle: .title2)
    static let body = UIFont.preferredFont(forTextStyle: .body)
}
```

Pour styliser globalement, tu passais par `UIAppearance` (appliqué une fois, souvent au démarrage) :

```swift
UINavigationBar.appearance().tintColor = AppColors.primary
UIBarButtonItem.appearance().setTitleTextAttributes(
    [.font: AppTypography.body], for: .normal
)
```

La différence de mentalité : en UIKit tu **configures** des objets existants (impératif, mutation d'instances ou proxy `appearance()`). En SwiftUI tu **exposes** des `Color`/`Font` que tu appliques de façon déclarative, et tu factorises le style global dans des `ViewModifier` réutilisables plutôt que via un proxy.

👉 En SwiftUI : `Color`/`Font` dans un `enum` + `ViewModifier` (ou `ButtonStyle`/`LabelStyle`) remplacent `UIColor`/`UIFont` et `UIAppearance`.

## Points à connaître

Un design system simple n’a pas besoin d’être énorme. Au début, quelques couleurs, espacements et styles de texte suffisent.

Il faut éviter de centraliser trop tôt des choses inutiles. Le but n’est pas de créer une usine à gaz, mais d’éviter les valeurs magiques partout.

Les noms doivent être liés au rôle visuel, pas forcément à la couleur exacte. Par exemple, `primary` est mieux que `blue`, parce que la couleur principale pourra changer plus tard.

## Résumé

- Le design system centralise les styles importants.
- Il évite les `.blue`, `.red`, `.padding(12)` partout.
- Il rend l’app plus cohérente.
- Il facilite les changements visuels.
- Les fichiers peuvent être rangés dans `Shared/DesignSystem`.
