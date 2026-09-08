# Fiche 01.06 — Les modifiers SwiftUI en profondeur

## Objectif

Comprendre ce qu’est un modifier SwiftUI, pourquoi l’ordre des modifiers est important, et comment les utiliser proprement pour construire une interface lisible.

---

# 1. L’idée à comprendre

En SwiftUI, tu pars d’une vue simple, puis tu lui appliques des modifiers.

Exemple :

```swift
Text("Bonjour")
    .font(.title)
    .foregroundStyle(.blue)
    .padding()
```

Ici :

- `Text("Bonjour")` crée une vue texte ;
- `.font(.title)` modifie la police ;
- `.foregroundStyle(.blue)` modifie la couleur ;
- `.padding()` ajoute de l’espace autour.

Un modifier ne modifie pas exactement la vue “en place” comme en UIKit. Il retourne une nouvelle vue transformée.

Tu peux le retenir comme ça :

```text
Vue de départ
  ↓
Modifier 1
  ↓
Modifier 2
  ↓
Modifier 3
  ↓
Vue finale
```

---

# 2. Code minimal

```swift
struct ModifierExampleView: View {
    var body: some View {
        Text("Continuer")
            .font(.headline) // Change le style du texte
            .foregroundStyle(.white) // Change la couleur du texte
            .padding() // Ajoute de l’espace autour du texte
            .background(.blue) // Ajoute un fond derrière le texte + padding
            .clipShape(RoundedRectangle(cornerRadius: 12)) // Arrondit le fond
    }
}
```

---

# 3. L’ordre des modifiers compte

L’ordre des modifiers change le résultat visuel.

Exemple 1 :

```swift
Text("Bonjour")
    .padding()
    .background(.yellow)
```

Ici, le fond jaune est appliqué après le padding.

Résultat : le jaune couvre le texte + l’espace autour.

---

Exemple 2 :

```swift
Text("Bonjour")
    .background(.yellow)
    .padding()
```

Ici, le fond jaune est appliqué avant le padding.

Résultat : le jaune couvre seulement le texte, puis l’espace est ajouté autour.

À retenir :

```text
SwiftUI lit les modifiers de haut en bas.
Chaque modifier s’applique au résultat précédent.
```

---

# 4. Exemple important : bouton plein largeur

Version correcte :

```swift
Button {
    print("Action")
} label: {
    Text("Continuer")
        .frame(maxWidth: .infinity) // Le texte prend toute la largeur disponible
        .padding() // Ajoute de la hauteur autour du texte
        .background(.blue) // Le fond couvre toute la largeur + padding
        .foregroundStyle(.white)
        .clipShape(RoundedRectangle(cornerRadius: 12))
}
.padding(.horizontal)
```

Si tu mets `.frame(maxWidth: .infinity)` trop tard, le fond risque de ne pas prendre toute la largeur attendue.

Exemple moins adapté :

```swift
Text("Continuer")
    .padding()
    .background(.blue)
    .frame(maxWidth: .infinity)
```

Ici, le texte prend toute la largeur après que le fond a déjà été appliqué. Le fond bleu peut donc rester seulement autour du texte.

---

# 5. Modifiers de texte

Les modifiers les plus courants pour du texte :

```swift
Text("Titre")
    .font(.largeTitle) // Taille/style prédéfini
    .fontWeight(.bold) // Graisse du texte
    .foregroundStyle(.primary) // Couleur/style du texte
    .multilineTextAlignment(.center) // Alignement si plusieurs lignes
    .lineLimit(2) // Nombre maximum de lignes
    .truncationMode(.tail) // Coupe à la fin si le texte est trop long
```

Exemple réaliste :

```swift
Text("Un titre assez long qui peut prendre plusieurs lignes")
    .font(.title2)
    .fontWeight(.semibold)
    .lineLimit(2)
    .multilineTextAlignment(.leading)
```

---

# 6. Modifiers d’espace

Les modifiers les plus utiles pour gérer l’espace :

```swift
Text("Bonjour")
    .padding() // Padding par défaut sur tous les côtés
```

```swift
Text("Bonjour")
    .padding(.horizontal, 16) // Padding gauche/droite
```

```swift
Text("Bonjour")
    .padding(.top, 24) // Padding uniquement en haut
```

```swift
Text("Bonjour")
    .frame(width: 200, height: 60) // Taille fixe
```

```swift
Text("Bonjour")
    .frame(maxWidth: .infinity, alignment: .leading) // Prend toute la largeur disponible et aligne le contenu à gauche
```

---

# 7. Modifiers de fond et de forme

Pour créer des cards, boutons ou blocs visuels :

```swift
Text("Card")
    .padding()
    .background(.gray.opacity(0.15))
    .clipShape(RoundedRectangle(cornerRadius: 16))
```

Autre exemple avec bordure :

```swift
Text("Premium")
    .padding(.horizontal, 12)
    .padding(.vertical, 6)
    .overlay {
        RoundedRectangle(cornerRadius: 12)
            .stroke(.blue, lineWidth: 1)
    }
```

Différence importante :

- `.background(...)` met quelque chose derrière la vue ;
- `.overlay(...)` met quelque chose par-dessus la vue ;
- `.clipShape(...)` découpe la forme visible.

---

# 8. `background` vs `overlay`

## `background`

```swift
Text("Bonjour")
    .padding()
    .background(.yellow)
```

Le jaune est derrière le texte.

---

## `overlay`

```swift
Text("Bonjour")
    .padding()
    .overlay {
        RoundedRectangle(cornerRadius: 12)
            .stroke(.blue, lineWidth: 2)
    }
```

La bordure bleue est dessinée par-dessus la zone de la vue.

---

## Les deux ensemble

```swift
Text("Bonjour")
    .padding()
    .background(.yellow)
    .overlay {
        RoundedRectangle(cornerRadius: 12)
            .stroke(.blue, lineWidth: 2)
    }
    .clipShape(RoundedRectangle(cornerRadius: 12))
```

Ici, tu as :

- un fond ;
- une bordure ;
- une forme arrondie.

---

# 9. Modifier l’interaction

Certains modifiers ajoutent du comportement.

```swift
Text("Clique ici")
    .onTapGesture {
        print("Tap détecté")
    }
```

```swift
Text("Chargement")
    .onAppear {
        print("La vue apparaît")
    }
```

```swift
Text("Donnée")
    .task {
        print("Tâche async lancée")
    }
```

Ces modifiers seront vus plus en détail dans les fiches sur le cycle de vie, l’état et l’asynchrone.

---

# 10. Modifiers conditionnels simples

Tu peux modifier l’apparence selon un état.

```swift
struct StatusBadgeView: View {
    let isActive: Bool

    var body: some View {
        Text(isActive ? "Actif" : "Inactif")
            .font(.caption)
            .padding(.horizontal, 10)
            .padding(.vertical, 6)
            .background(isActive ? .green.opacity(0.2) : .gray.opacity(0.2))
            .foregroundStyle(isActive ? .green : .secondary)
            .clipShape(Capsule())
    }
}
```

Ici, le texte, le fond et la couleur changent selon `isActive`.

---

# 11. Créer un modifier réutilisable

Si tu répètes souvent le même style, tu peux créer un `ViewModifier`.

```swift
struct CardStyle: ViewModifier {
    func body(content: Content) -> some View {
        content
            .padding()
            .background(.gray.opacity(0.1))
            .clipShape(RoundedRectangle(cornerRadius: 16))
    }
}
```

Utilisation :

```swift
Text("Contenu")
    .modifier(CardStyle())
```

Tu peux rendre ça plus agréable avec une extension :

```swift
extension View {
    func cardStyle() -> some View {
        modifier(CardStyle())
    }
}
```

Puis :

```swift
Text("Contenu")
    .cardStyle()
```

C’est utile pour un design system simple.

---

# 12. Exemple réaliste : card réutilisable

```swift
struct ArticleCardView: View {
    let title: String
    let subtitle: String

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(.headline)
                .lineLimit(2)

            Text(subtitle)
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .lineLimit(3)
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
ArticleCardView(
    title: "Comprendre les modifiers SwiftUI",
    subtitle: "Les modifiers permettent de transformer progressivement une vue."
)
.padding(.horizontal)
```

---

# 13. Points à connaître

## Évite les chaînes de modifiers trop longues dans une grosse vue

Si un style devient trop long ou répété, crée :

- un composant réutilisable ;
- un `ViewModifier` ;
- une extension de `View`.

---

## `foregroundStyle` est plus moderne que `foregroundColor`

Tu peux encore voir :

```swift
.foregroundColor(.blue)
```

Mais tu peux préférer :

```swift
.foregroundStyle(.blue)
```

`foregroundStyle` est plus flexible, notamment pour les styles avancés.

---

## Un modifier peut changer la taille prise par une vue

Par exemple :

```swift
.frame(maxWidth: .infinity)
```

change la place que la vue demande à son parent.

Alors que :

```swift
.foregroundStyle(.blue)
```

change seulement son apparence.

---

# Résumé

À retenir :

- un modifier transforme une vue et retourne une nouvelle vue ;
- les modifiers sont appliqués dans l’ordre où ils sont écrits ;
- l’ordre entre `padding`, `background`, `frame` et `clipShape` est très important ;
- `background` ajoute quelque chose derrière ;
- `overlay` ajoute quelque chose au-dessus ;
- `frame` contrôle l’espace occupé ;
- les modifiers peuvent aussi ajouter du comportement avec `onAppear`, `task` ou `onTapGesture` ;
- si un style se répète, crée un composant ou un `ViewModifier` réutilisable.

