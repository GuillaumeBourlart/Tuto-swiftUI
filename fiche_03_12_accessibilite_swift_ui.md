# Fiche 03.12 — Accessibilité de base

## Objectif

Comprendre les bases de l’accessibilité iOS dans SwiftUI : rendre l’app utilisable par les personnes qui utilisent VoiceOver, qui ont besoin d’un texte plus grand, ou qui ont des difficultés visuelles. C’est un sujet souvent demandé en entretien et exigé dans les apps qui passent en revue chez Apple.

---

# 1. L’idée à comprendre

L’accessibilité (a11y) en iOS, c’est l’ensemble des fonctionnalités qui permettent à n’importe quel utilisateur d’utiliser ton app, dont :

- **VoiceOver** : lecteur d’écran (l’iPhone lit les éléments à voix haute)
- **Dynamic Type** : l’utilisateur peut agrandir la taille du texte dans les Réglages
- **Reduce Motion** : moins d’animations pour les personnes sensibles
- **Contraste augmenté** : couleurs plus marquées

La bonne nouvelle : SwiftUI fait beaucoup de choses **automatiquement**. Un `Button`, un `Text`, une `Image` sont déjà accessibles par défaut. Ton travail consiste à compléter et corriger quand c’est nécessaire.

---

# 2. accessibilityLabel : nommer un élément

Quand VoiceOver passe sur un élément, il lit un label. Pour un `Text`, c’est automatique. Pour une icône seule, tu dois le préciser.

Pas bien :

```swift
Button {
    favorite()
} label: {
    Image(systemName: "heart.fill")
}
```

VoiceOver dira "Bouton" sans donner de sens.

Mieux :

```swift
Button {
    favorite()
} label: {
    Image(systemName: "heart.fill")
}
.accessibilityLabel("Ajouter aux favoris")
```

VoiceOver dira "Ajouter aux favoris, bouton".

---

# 3. accessibilityHint : préciser ce qui se passe

Le `hint` complète le label avec ce qui va se passer si on active l’élément.

```swift
Button("Supprimer") {
    delete()
}
.accessibilityLabel("Supprimer le compte")
.accessibilityHint("Supprime définitivement votre compte et toutes vos données")
```

VoiceOver dira : "Supprimer le compte, bouton. Supprime définitivement votre compte et toutes vos données."

À utiliser quand l’action est destructive ou pas évidente.

---

# 4. accessibilityValue : la valeur d’un contrôle

Pour un `Slider`, `Stepper` ou un état (toggle, étoile) :

```swift
@State private var rating = 3

HStack {
    ForEach(1...5, id: \.self) { i in
        Image(systemName: i <= rating ? "star.fill" : "star")
    }
}
.accessibilityElement(children: .ignore)
.accessibilityLabel("Note")
.accessibilityValue("\(rating) sur 5 étoiles")
```

VoiceOver lira : "Note, 3 sur 5 étoiles".

---

# 5. accessibilityElement : grouper ou ignorer

Par défaut, chaque sous-élément est lu séparément par VoiceOver. Pour grouper plusieurs vues en un seul élément :

```swift
HStack {
    Image(systemName: "person.circle")
    VStack(alignment: .leading) {
        Text("Guillaume")
        Text("Développeur iOS")
    }
}
.accessibilityElement(children: .combine)
.accessibilityLabel("Guillaume, Développeur iOS")
```

Sans `.combine`, VoiceOver lit 3 éléments séparés. Avec, il lit une seule phrase claire.

Les valeurs possibles :

- `.ignore` → ignore les enfants, tu fournis tout à la main
- `.combine` → combine les enfants en un seul élément
- `.contain` → garde les enfants accessibles séparément

---

# 6. accessibilityHidden : cacher de VoiceOver

Pour les éléments purement décoratifs (image de fond, séparateur visuel), tu peux les masquer :

```swift
Image("decoration")
    .accessibilityHidden(true)
```

Évite d’encombrer VoiceOver avec des éléments qui n’apportent rien.

---

# 7. Dynamic Type : laisser le texte grandir

Si tu utilises les polices système (`.body`, `.headline`, `.title`), ton texte respecte déjà le réglage de taille de l’utilisateur.

```swift
Text("Bonjour")
    .font(.body)
```

À éviter :

```swift
Text("Bonjour")
    .font(.system(size: 16))  // taille fixe, ne grandit pas
```

Pour tester : Réglages → Accessibilité → Affichage et taille du texte → Tailles de texte plus grandes. Active la version XL et regarde tes écrans.

Pour les très grandes tailles, les `HStack` doivent souvent passer en `VStack` :

```swift
@Environment(\.dynamicTypeSize) private var dynamicTypeSize

var body: some View {
    if dynamicTypeSize.isAccessibilitySize {
        VStack { content }
    } else {
        HStack { content }
    }
}
```

---

# 8. Reduce Motion : moins d’animations

Certains utilisateurs activent "Réduire les animations" dans les Réglages.

```swift
@Environment(\.accessibilityReduceMotion) private var reduceMotion

withAnimation(reduceMotion ? nil : .spring()) {
    isExpanded.toggle()
}
```

Pour les animations importantes (ex. un loader), tu peux les garder. Pour les animations cosmétiques, mieux vaut les couper.

---

# 9. Contraste et lisibilité

Quelques règles simples :

- Évite le gris sur gris.
- Utilise `Color.primary` / `Color.secondary` plutôt que des nuances custom.
- Pour le texte par-dessus une image, ajoute un fond semi-transparent ou un overlay.
- Vérifie en activant "Contraste augmenté" dans les Réglages.

```swift
@Environment(\.accessibilityShowButtonShapes) private var buttonShapes
@Environment(\.legibilityWeight) private var legibilityWeight
```

Ces environnements existent si tu veux vraiment pousser la finition.

---

# 10. Exemple complet : une card accessible

```swift
struct ContactCard: View {
    let name: String
    let role: String
    let onCall: () -> Void

    var body: some View {
        HStack {
            Image(systemName: "person.circle.fill")
                .resizable()
                .frame(width: 48, height: 48)
                .foregroundStyle(.tint)
                .accessibilityHidden(true)

            VStack(alignment: .leading, spacing: 4) {
                Text(name)
                    .font(.headline)

                Text(role)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
            .accessibilityElement(children: .combine)

            Spacer()

            Button {
                onCall()
            } label: {
                Image(systemName: "phone.fill")
                    .font(.title2)
            }
            .accessibilityLabel("Appeler \(name)")
            .accessibilityHint("Lance un appel téléphonique")
        }
        .padding()
        .background(Color(.secondarySystemBackground))
        .cornerRadius(12)
    }
}
```

Ce qui se passe en VoiceOver :

1. "Guillaume, Développeur iOS" (les deux textes combinés)
2. "Appeler Guillaume, bouton. Lance un appel téléphonique."

L’icône décorative est ignorée. Le bouton est clairement identifié.

---

# 11. Tester l’accessibilité

## VoiceOver

Active VoiceOver dans : Réglages → Accessibilité → VoiceOver.

Astuce : triple-cliquer sur le bouton latéral active/désactive VoiceOver rapidement (à configurer dans Raccourci accessibilité).

## Accessibility Inspector

Sur Mac, ouvre Xcode → Open Developer Tool → Accessibility Inspector. Tu peux survoler ton app en simulateur et voir ce que VoiceOver lirait.

## Dynamic Type Preview

```swift
#Preview("Large Text") {
    ContentView()
        .environment(\.dynamicTypeSize, .accessibility3)
}
```

---

# En UIKit (rappel)

En UIKit, l’accessibilité se configure **propriété par propriété** sur chaque vue, à la main et de façon impérative. C’est `UIAccessibility` qui pilote ce que lit VoiceOver.

```swift
// Icône seule en bouton : il faut tout déclarer soi-même
let favoriteButton = UIButton(configuration: .plain())
favoriteButton.setImage(UIImage(systemName: "heart.fill"), for: .normal)
favoriteButton.isAccessibilityElement = true
favoriteButton.accessibilityLabel = "Ajouter aux favoris"
favoriteButton.accessibilityHint = "Ajoute cet élément à vos favoris"
favoriteButton.accessibilityTraits = .button
```

```swift
// Une note en étoiles : on fournit label + value à la main
starsStackView.isAccessibilityElement = true
starsStackView.accessibilityLabel = "Note"
starsStackView.accessibilityValue = "\(rating) sur 5 étoiles"
```

```swift
// Dynamic Type : police système + recalcul automatique
titleLabel.font = .preferredFont(forTextStyle: .body)
titleLabel.adjustsFontForContentSizeCategory = true
```

**Différence clé** : en UIKit tu actives `isAccessibilityElement` et tu remplis chaque propriété (`accessibilityLabel/Hint/Value/Traits`) une par une sur les objets. En SwiftUI c’est **déclaratif** : des modificateurs `.accessibilityLabel/.accessibilityHint/.accessibilityValue` et `.accessibilityElement(children:)` posés directement sur la vue, et le framework fait le reste.

👉 **En SwiftUI** : `.accessibilityLabel("…")` + `.accessibilityElement(children: .combine)` remplacent `isAccessibilityElement` et le remplissage manuel de chaque propriété `UIAccessibility`.

---

# 12. Points à connaître

## SwiftUI fait déjà beaucoup

Les composants standards (`Button`, `Toggle`, `Text`, `Image` avec label) sont accessibles par défaut. Tu n’as à intervenir que sur les composants custom et les images muettes.

---

## Une icône seule a besoin d’un label

C’est l’erreur n°1 en a11y. Toute `Image(systemName:)` utilisée comme bouton sans texte doit avoir un `accessibilityLabel`.

---

## Évite les tailles de police fixes

`.font(.body)` plutôt que `.font(.system(size: 17))`. Ton texte doit grandir avec les réglages utilisateur.

---

## Combine quand un élément visuel n’est qu’une seule chose conceptuelle

Une card "avatar + nom + rôle" devrait être lue d’un coup, pas en 3 étapes.

---

## L’accessibilité, c’est aussi un signe de qualité

C’est un sujet souvent regardé en entretien junior iOS. Montrer que tu y penses différencie un candidat sérieux.

---

# Résumé

À retenir :

- l’accessibilité iOS couvre VoiceOver, Dynamic Type, Reduce Motion et contraste ;
- SwiftUI rend déjà la plupart des composants accessibles par défaut ;
- `.accessibilityLabel` donne un nom à un élément (essentiel pour les icônes seules) ;
- `.accessibilityHint` précise l’effet de l’action ;
- `.accessibilityValue` indique la valeur d’un contrôle ;
- `.accessibilityElement(children: .combine)` regroupe plusieurs vues en un seul élément lu d’un coup ;
- `.accessibilityHidden(true)` cache les éléments décoratifs ;
- utilise les polices système (`.body`, `.headline`) pour bénéficier de Dynamic Type ;
- respecte `@Environment(\.accessibilityReduceMotion)` pour les animations ;
- teste avec VoiceOver, Accessibility Inspector et un preview en grand texte.
