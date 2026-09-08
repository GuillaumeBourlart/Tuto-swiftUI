# Fiche 04.01 — Animations et transitions essentielles

## Objectif

Comprendre comment animer une interface SwiftUI sans complexifier le code. Le but est de savoir rendre une app plus fluide : apparition d’un message d’erreur, ouverture d’une section, changement d’état d’un bouton, affichage d’un loader ou disparition d’une vue.

## 1. L’idée à comprendre

En SwiftUI, l’interface est une conséquence de l’état. Donc une animation consiste souvent à changer une variable, puis à demander à SwiftUI d’animer la différence entre l’ancien état et le nouvel état.

Exemple :

```swift
@State private var isExpanded = false
```

Si `isExpanded` passe de `false` à `true`, SwiftUI peut animer la taille, l’opacité, la rotation, la position, etc.

## 2. Animation avec withAnimation

`withAnimation` est la manière la plus claire pour animer un changement d’état.

```swift
import SwiftUI

struct ExpandableCardView: View {
    @State private var isExpanded = false

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Détails du profil")
                    .font(.headline)

                Spacer()

                Image(systemName: "chevron.down")
                    .rotationEffect(.degrees(isExpanded ? 180 : 0))
            }

            if isExpanded {
                Text("Cette section affiche des informations supplémentaires.")
                    .foregroundStyle(.secondary)
                    .transition(.opacity.combined(with: .move(edge: .top)))
            }
        }
        .padding()
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .onTapGesture {
            withAnimation(.easeInOut) {
                isExpanded.toggle()
            }
        }
        .padding()
    }
}
```

Ici, une seule variable contrôle l’état de la carte. Le `withAnimation` anime le changement.

## 3. Les animations courantes

SwiftUI fournit plusieurs animations simples :

```swift
withAnimation(.easeInOut) { }
withAnimation(.easeOut) { }
withAnimation(.linear) { }
withAnimation(.spring()) { }
```

En pratique :

- `.easeInOut` : animation générale, naturelle ;
- `.easeOut` : bonne pour faire apparaître un élément ;
- `.linear` : vitesse constante, utile pour une progression ;
- `.spring()` : effet rebond, à utiliser avec modération.

## 4. Animation implicite avec .animation

Tu peux aussi attacher une animation à une valeur.

```swift
struct LikeButtonView: View {
    @State private var isLiked = false

    var body: some View {
        Button {
            isLiked.toggle()
        } label: {
            Image(systemName: isLiked ? "heart.fill" : "heart")
                .font(.largeTitle)
                .scaleEffect(isLiked ? 1.2 : 1.0)
                .foregroundStyle(isLiked ? .red : .gray)
                .animation(.spring(), value: isLiked)
        }
    }
}
```

Le modifier `.animation(..., value:)` dit à SwiftUI : “anime les changements liés à cette valeur”.

Pour du code lisible, préfère souvent `withAnimation` quand l’action est explicite.

## 5. Transitions

Une transition est utilisée quand une vue apparaît ou disparaît avec un `if`.

```swift
if showMessage {
    Text("Profil mis à jour")
        .padding()
        .background(.green.opacity(0.15))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .transition(.opacity)
}
```

Exemples utiles :

```swift
.transition(.opacity)
.transition(.scale)
.transition(.move(edge: .bottom))
.transition(.opacity.combined(with: .scale))
```

La transition ne fonctionne vraiment que si le changement d’état est animé :

```swift
withAnimation {
    showMessage.toggle()
}
```

## 6. Exemple réaliste : message d’erreur animé

```swift
struct LoginErrorView: View {
    @State private var email = ""
    @State private var password = ""
    @State private var errorMessage: String?

    var body: some View {
        VStack(spacing: 16) {
            TextField("Email", text: $email)
                .textFieldStyle(.roundedBorder)

            SecureField("Mot de passe", text: $password)
                .textFieldStyle(.roundedBorder)

            if let errorMessage {
                Text(errorMessage)
                    .foregroundStyle(.red)
                    .font(.footnote)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .transition(.opacity.combined(with: .move(edge: .top)))
            }

            Button("Connexion") {
                validate()
            }
            .buttonStyle(.borderedProminent)
        }
        .padding()
    }

    private func validate() {
        withAnimation(.easeInOut) {
            if email.isEmpty || password.isEmpty {
                errorMessage = "Tous les champs sont obligatoires."
            } else {
                errorMessage = nil
            }
        }
    }
}
```

C’est typiquement le genre d’animation utile dans une vraie app.

## En UIKit (rappel)

En UIKit, tu animes **impérativement** : tu décris explicitement les valeurs de départ et d'arrivée dans un bloc d'animation.

```swift
// Animation de propriétés (alpha, transform, frame…)
UIView.animate(withDuration: 0.3) {
    self.cardView.alpha = 1
    self.chevron.transform = CGAffineTransform(rotationAngle: .pi)
}

// Spring + scrubbing (contrôle fin, interruptible)
let animator = UIViewPropertyAnimator(duration: 0.4, dampingRatio: 0.6) {
    self.likeButton.transform = .init(scaleX: 1.2, y: 1.2)
}
animator.startAnimation()
```

Pour un **layout** animé, tu modifies les contraintes puis tu appelles `layoutIfNeeded()` dans le bloc :

```swift
heightConstraint.constant = isExpanded ? 200 : 0
UIView.animate(withDuration: 0.25) {
    self.view.layoutIfNeeded()
}
```

Pour une **transition** (apparition/disparition, changement de contenu) : `UIView.transition(with:duration:options:animations:)` ou une `CATransition`.

La différence de mentalité : en UIKit tu pilotes l'animation pas à pas (quoi animer, vers quelle valeur). En SwiftUI tu changes l'état et tu laisses le framework interpoler la différence.

👉 En SwiftUI : ces blocs deviennent `withAnimation { state.toggle() }`, `.animation(_:value:)` et `.transition(...)`, en déclaratif.

## 7. Points à connaître

N’anime pas tout. Une app trop animée peut sembler lente ou amateur.

Les animations doivent aider à comprendre l’interface : afficher un état, guider l’œil, rendre une transition moins brutale.

Évite les traitements lourds pendant une animation. L’animation doit accompagner un changement d’état, pas masquer une logique compliquée.

## Résumé

- `withAnimation` anime un changement d’état.
- `.animation(..., value:)` attache une animation à une valeur.
- `.transition` anime l’apparition ou la disparition d’une vue.
- Les animations utiles sont souvent simples : opacité, déplacement, scale, rotation.
- Une bonne animation rend l’interface plus claire, pas plus chargée.
