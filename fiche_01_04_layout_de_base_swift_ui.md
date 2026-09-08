# Fiche 01.04 — Layout de base : VStack, HStack, ZStack, Spacer, padding et frame

## Objectif

Comprendre comment organiser les éléments à l’écran avec les containers SwiftUI les plus importants : `VStack`, `HStack`, `ZStack`, `Spacer`, `padding` et `frame`.

---

# 1. L’idée à comprendre

En SwiftUI, tu places les éléments en les empilant dans des containers.

Les trois containers de base sont :

- `VStack` : empile les vues verticalement ;
- `HStack` : empile les vues horizontalement ;
- `ZStack` : empile les vues les unes par-dessus les autres.

Ensuite, tu ajustes l’espace avec :

- `Spacer()` ;
- `.padding()` ;
- `.frame(...)`.

---

# 2. `VStack`

`VStack` place les vues les unes sous les autres.

```swift
struct VStackExampleView: View {
    var body: some View {
        VStack {
            Text("Titre")
            Text("Sous-titre")
            Button("Continuer") {}
        }
    }
}
```

Résultat logique :

```text
Titre
Sous-titre
Bouton
```

Tu peux régler l’espacement :

```swift
VStack(spacing: 16) {
    Text("Titre")
    Text("Sous-titre")
    Button("Continuer") {}
}
```

Tu peux aussi régler l’alignement horizontal :

```swift
VStack(alignment: .leading, spacing: 8) {
    Text("Guillaume")
        .font(.headline)

    Text("Développeur iOS")
        .foregroundStyle(.secondary)
}
```

Ici, les textes sont alignés à gauche.

---

# 3. `HStack`

`HStack` place les vues les unes à côté des autres.

```swift
struct HStackExampleView: View {
    var body: some View {
        HStack {
            Image(systemName: "person.circle.fill")
            Text("Profil")
            Spacer()
            Image(systemName: "chevron.right")
        }
        .padding()
    }
}
```

Résultat logique :

```text
[icône] Profil                       [chevron]
```

`HStack` est très utilisé pour :

- les lignes de liste ;
- les cellules ;
- les headers ;
- les boutons avec icône ;
- les barres d’action.

---

# 4. `ZStack`

`ZStack` place les vues les unes par-dessus les autres.

```swift
struct ZStackExampleView: View {
    var body: some View {
        ZStack {
            Color.blue

            Text("Bonjour")
                .font(.title)
                .foregroundStyle(.white)
        }
    }
}
```

Ici :

- `Color.blue` est le fond ;
- `Text("Bonjour")` est affiché au-dessus.

`ZStack` est utile pour :

- mettre un texte sur une image ;
- créer un fond ;
- superposer un badge ;
- afficher un loader par-dessus un écran ;
- créer des cartes avec overlay.

Exemple avec badge :

```swift
ZStack(alignment: .topTrailing) {
    Image(systemName: "bell.fill")
        .font(.largeTitle)

    Text("3")
        .font(.caption)
        .foregroundStyle(.white)
        .padding(6)
        .background(.red)
        .clipShape(Circle())
}
```

---

# 5. `Spacer`

`Spacer()` prend tout l’espace disponible.

Exemple dans un `HStack` :

```swift
HStack {
    Text("Profil")
    Spacer()
    Image(systemName: "chevron.right")
}
.padding()
```

Le `Spacer()` pousse le chevron tout à droite.

Exemple dans un `VStack` :

```swift
VStack {
    Text("Titre en haut")

    Spacer()

    Button("Bouton en bas") {}
}
.padding()
```

Le `Spacer()` pousse le bouton vers le bas.

À retenir :

```text
Spacer prend la place vide et pousse les autres vues.
```

---

# 6. `padding`

`padding` ajoute de l’espace autour d’une vue.

```swift
Text("Bonjour")
    .padding()
```

Tu peux préciser le côté :

```swift
Text("Bonjour")
    .padding(.horizontal)
```

```swift
Text("Bonjour")
    .padding(.top, 20)
```

Tu peux aussi choisir une valeur :

```swift
Text("Bonjour")
    .padding(24)
```

`padding` est très utilisé pour éviter que l’interface soit collée aux bords.

---

# 7. `frame`

`frame` permet de définir ou contraindre la taille d’une vue.

```swift
Text("Bonjour")
    .frame(width: 200, height: 60)
```

Tu peux aussi demander à une vue de prendre toute la largeur disponible :

```swift
Text("Continuer")
    .frame(maxWidth: .infinity)
```

Exemple pour un bouton plein largeur :

```swift
Button {
    print("Continuer")
} label: {
    Text("Continuer")
        .frame(maxWidth: .infinity) // Le texte prend toute la largeur disponible
        .padding()
        .background(.blue)
        .foregroundStyle(.white)
        .clipShape(RoundedRectangle(cornerRadius: 12))
}
.padding(.horizontal)
```

---

# 8. Attention à l’ordre entre `padding`, `background` et `frame`

L’ordre des modifiers change le résultat.

Exemple 1 :

```swift
Text("Bonjour")
    .padding()
    .background(.yellow)
```

Le fond jaune inclut le padding.

Exemple 2 :

```swift
Text("Bonjour")
    .background(.yellow)
    .padding()
```

Le fond jaune est seulement derrière le texte, puis le padding est ajouté autour.

Même chose avec `frame` :

```swift
Text("Bouton")
    .frame(maxWidth: .infinity)
    .padding()
    .background(.blue)
```

Ici, le padding est ajouté après que le texte prend toute la largeur.

Souvent, pour un bouton custom, tu veux plutôt :

```swift
Text("Bouton")
    .frame(maxWidth: .infinity)
    .padding()
    .background(.blue)
    .foregroundStyle(.white)
    .clipShape(RoundedRectangle(cornerRadius: 12))
```

---

# 9. Exemple réaliste : cellule de liste

```swift
struct UserRowView: View {
    let name: String
    let subtitle: String

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: "person.circle.fill")
                .font(.system(size: 44))
                .foregroundStyle(.blue)

            VStack(alignment: .leading, spacing: 4) {
                Text(name)
                    .font(.headline)

                Text(subtitle)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }

            Spacer()

            Image(systemName: "chevron.right")
                .foregroundStyle(.secondary)
        }
        .padding()
    }
}
```

Utilisation :

```swift
UserRowView(
    name: "Guillaume",
    subtitle: "Développeur iOS"
)
```

Ce genre de structure est très courant :

```text
HStack
  Image
  VStack
    Text
    Text
  Spacer
  Chevron
```

---

# 10. Exemple réaliste : écran simple

```swift
struct WelcomeScreenView: View {
    var body: some View {
        VStack(spacing: 24) {
            Spacer()

            Image(systemName: "swift")
                .font(.system(size: 80))
                .foregroundStyle(.orange)

            VStack(spacing: 8) {
                Text("Apprendre SwiftUI")
                    .font(.largeTitle)
                    .fontWeight(.bold)

                Text("Un cours progressif pour comprendre les bases et construire de vraies apps.")
                    .font(.body)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
            }

            Spacer()

            Button {
                print("Commencer")
            } label: {
                Text("Commencer")
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(.blue)
                    .foregroundStyle(.white)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
            }
        }
        .padding()
    }
}
```

Ici :

- le premier `Spacer()` pousse le contenu vers le centre ;
- le deuxième `Spacer()` sépare le contenu du bouton ;
- le bouton reste en bas ;
- `.padding()` évite que l’écran soit collé aux bords.

---

# En UIKit (rappel)

En UIKit, l’équivalent direct de `VStack` / `HStack`, c’est `UIStackView` : tu choisis l’axe et tu règles l’espace avec `spacing`, `distribution` et `alignment`.

```swift
let stack = UIStackView(arrangedSubviews: [titleLabel, subtitleLabel, button])
stack.axis = .vertical          // .horizontal = HStack
stack.spacing = 16              // ≈ VStack(spacing: 16)
stack.alignment = .leading      // ≈ VStack(alignment: .leading)
stack.distribution = .fill
```

Quand il n’y a pas de stack, tu poses des contraintes Auto Layout à la main via les anchors (et tu dois penser à désactiver les masques) :

```swift
let label = UILabel()
label.translatesAutoresizingMaskIntoConstraints = false
view.addSubview(label)

NSLayoutConstraint.activate([
    label.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 16),
    label.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -16),
    label.centerYAnchor.constraint(equalTo: view.centerYAnchor)
])
```

La différence clé : en UIKit tu décris **comment** poser et activer les contraintes (impératif), alors qu’en SwiftUI tu décris **ce que** tu veux voir, et le layout se calcule tout seul — pas de contrainte à activer, pas de `translatesAutoresizingMaskIntoConstraints`.

👉 En SwiftUI : `UIStackView` devient `VStack` / `HStack`, et les `NSLayoutConstraint` disparaissent au profit de `Spacer`, `.padding()` et `.frame(...)`.

---

# 11. Points à connaître

## `VStack`, `HStack`, `ZStack` peuvent être combinés

La plupart des interfaces SwiftUI sont des combinaisons de stacks.

Exemple :

```swift
VStack {
    HStack {
        Image(systemName: "person")
        Text("Profil")
        Spacer()
    }

    ZStack {
        Color.gray.opacity(0.1)
        Text("Contenu")
    }
}
```

---

## `Spacer` dépend de l’espace disponible

Si le parent n’a pas beaucoup d’espace, le `Spacer` ne fera pas grand-chose.

`Spacer` est surtout utile dans des containers qui peuvent s’étendre, comme un `VStack` qui prend toute la hauteur ou un `HStack` qui prend toute la largeur.

---

## `frame(maxWidth: .infinity)` ne force pas toujours toute la largeur de l’écran

Il prend toute la largeur disponible dans son parent.

Si le parent est petit, la vue restera limitée par ce parent.

---

# Résumé

À retenir :

- `VStack` empile verticalement ;
- `HStack` empile horizontalement ;
- `ZStack` superpose les vues ;
- `Spacer()` prend l’espace disponible ;
- `.padding()` ajoute de l’espace autour d’une vue ;
- `.frame(...)` contrôle la taille ou l’espace occupé ;
- l’ordre des modifiers change le résultat ;
- la plupart des interfaces SwiftUI se construisent en combinant plusieurs stacks.

