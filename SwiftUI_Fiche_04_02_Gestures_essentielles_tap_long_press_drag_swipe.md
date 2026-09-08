# Fiche 04.02 — Gestures essentielles : tap, long press, drag, swipe

## Objectif

Savoir ajouter des interactions tactiles simples dans SwiftUI : tap, appui long, drag et swipe. Ces gestes permettent de créer des boutons custom, des cards déplaçables, des actions rapides ou des interactions plus naturelles.

## 1. Tap gesture

Le geste le plus simple est le tap.

```swift
struct TapExampleView: View {
    @State private var count = 0

    var body: some View {
        Text("Tap : \(count)")
            .padding()
            .background(Color(.secondarySystemBackground))
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .onTapGesture {
                count += 1
            }
    }
}
```

Pour un vrai bouton, préfère `Button`, car il gère mieux l’accessibilité. `onTapGesture` est utile pour des composants custom.

## 2. Long press gesture

`onLongPressGesture` déclenche une action après un appui long.

```swift
struct LongPressExampleView: View {
    @State private var isFavorite = false

    var body: some View {
        Label(isFavorite ? "Favori" : "Maintenir pour ajouter", systemImage: isFavorite ? "heart.fill" : "heart")
            .padding()
            .background(Color(.secondarySystemBackground))
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .onLongPressGesture {
                withAnimation {
                    isFavorite.toggle()
                }
            }
    }
}
```

Utile pour confirmer une action, afficher une option secondaire ou éviter un déclenchement accidentel.

## 3. DragGesture simple

`DragGesture` permet de suivre le déplacement du doigt.

```swift
struct DraggableCardView: View {
    @State private var offset: CGSize = .zero

    var body: some View {
        RoundedRectangle(cornerRadius: 20)
            .fill(.blue)
            .frame(width: 220, height: 140)
            .overlay {
                Text("Déplace-moi")
                    .foregroundStyle(.white)
                    .font(.headline)
            }
            .offset(offset)
            .gesture(
                DragGesture()
                    .onChanged { value in
                        offset = value.translation
                    }
                    .onEnded { _ in
                        withAnimation(.spring()) {
                            offset = .zero // revient au centre
                        }
                    }
            )
    }
}
```

Pendant le drag, on met à jour `offset`. À la fin, on remet la card à zéro.

## 4. Swipe horizontal simple

Tu peux détecter un swipe avec la translation horizontale.

```swift
struct SwipeCardView: View {
    @State private var offset: CGSize = .zero
    @State private var result = "Aucune action"

    var body: some View {
        VStack(spacing: 20) {
            Text(result)
                .font(.headline)

            RoundedRectangle(cornerRadius: 20)
                .fill(Color(.secondarySystemBackground))
                .frame(height: 180)
                .overlay {
                    Text("Swipe gauche ou droite")
                }
                .offset(x: offset.width)
                .gesture(
                    DragGesture()
                        .onChanged { value in
                            offset = value.translation
                        }
                        .onEnded { value in
                            if value.translation.width > 120 {
                                result = "Accepté"
                            } else if value.translation.width < -120 {
                                result = "Refusé"
                            }

                            withAnimation(.spring()) {
                                offset = .zero
                            }
                        }
                )
        }
        .padding()
    }
}
```

C’est la base d’une interaction de type card Tinder, validation/refus, archive, etc.

## 5. Gesture et état métier

Une gesture ne doit pas contenir trop de logique métier.

Mauvais réflexe :

```swift
.onEnded { value in
    // 50 lignes : réseau, validation, navigation, analytics...
}
```

Meilleur réflexe :

```swift
.onEnded { value in
    handleSwipe(value.translation.width)
}
```

Puis :

```swift
private func handleSwipe(_ width: CGFloat) {
    if width > 120 {
        acceptCard()
    } else if width < -120 {
        rejectCard()
    }

    withAnimation(.spring()) {
        offset = .zero
    }
}
```

La vue reste lisible.

## 6. Gesture simultanée ou conflictuelle

Certaines gestures peuvent entrer en conflit avec `ScrollView`, `List` ou des boutons. Dans ce cas, il faut parfois utiliser :

```swift
.simultaneousGesture(...)
.highPriorityGesture(...)
```

Mais pour la majorité des écrans classiques, `onTapGesture`, `onLongPressGesture` et `.gesture(DragGesture())` suffisent.

## En UIKit (rappel)

En UIKit, chaque geste était un objet `UIGestureRecognizer` que tu instanciais, configurais, puis attachais à une vue avec `addGestureRecognizer(_:)`. L'action passait par un couple target/action (`#selector`), et tu lisais l'état via `recognizer.state`.

```swift
// Tap
let tap = UITapGestureRecognizer(target: self, action: #selector(handleTap))
view.addGestureRecognizer(tap)

// Long press
let longPress = UILongPressGestureRecognizer(target: self, action: #selector(handleLongPress))
longPress.minimumPressDuration = 0.5
view.addGestureRecognizer(longPress)
```

```swift
// Pan (drag) : translation + velocity, en suivant l'état du geste
let pan = UIPanGestureRecognizer(target: self, action: #selector(handlePan))
card.addGestureRecognizer(pan)

@objc private func handlePan(_ g: UIPanGestureRecognizer) {
    let translation = g.translation(in: card.superview)
    switch g.state {
    case .changed:
        card.transform = CGAffineTransform(translationX: translation.x, y: translation.y)
    case .ended:
        let velocity = g.velocity(in: card.superview)
        // décider accepté/refusé selon translation.x / velocity.x
        UIView.animate(withDuration: 0.3) { card.transform = .identity }
    default:
        break
    }
}
```

```swift
// Swipe directionnel dédié
let swipe = UISwipeGestureRecognizer(target: self, action: #selector(handleSwipe))
swipe.direction = .left
view.addGestureRecognizer(swipe)
```

Pour gérer les conflits (un geste qui coexiste avec un `UIScrollView` ou un autre recognizer), tu adoptais `UIGestureRecognizerDelegate` (`gestureRecognizer(_:shouldRecognizeSimultaneouslyWith:)`).

La mentalité change : en UIKit tu créais et câblais des objets recognizer impérativement, puis tu pilotais une transformation à la main selon `state`. En SwiftUI, le geste est un **modifier déclaratif** directement attaché à la vue.

👉 En SwiftUI : `.onTapGesture { }`, `.onLongPressGesture { }` et `.gesture(DragGesture().onChanged/.onEnded)` remplacent l'instanciation + `addGestureRecognizer` + gestion de `state`.

## Points à connaître

Utilise `Button` quand l’élément est vraiment un bouton.

Utilise les gestures pour des interactions custom : card draggable, swipe, appui long, drag.

Ne mets pas trop de logique dans `.onChanged` ou `.onEnded`. Appelle plutôt une fonction.

## Résumé

- `onTapGesture` détecte un tap simple.
- `onLongPressGesture` détecte un appui long.
- `DragGesture` permet de suivre le déplacement du doigt.
- Un swipe peut être détecté avec `translation.width`.
- Les gestures doivent rester lisibles et reliées à un état clair.
