# Fiche 01.03 — Text, Image, Button et modifiers

## Objectif

Comprendre les éléments SwiftUI les plus simples pour afficher du contenu et déclencher une action : `Text`, `Image`, `Button`, et les `modifiers`.

---

# 1. L’idée à comprendre

En SwiftUI, tu construis une interface en assemblant des vues.

Les vues de base les plus fréquentes sont :

- `Text` pour afficher du texte ;
- `Image` pour afficher une image ;
- `Button` pour déclencher une action ;
- les `modifiers` pour modifier l’apparence ou le comportement d’une vue.

Exemple simple :

```swift
Button("Continuer") {
    print("Bouton cliqué")
}
.padding()
.background(.blue)
.foregroundStyle(.white)
.clipShape(RoundedRectangle(cornerRadius: 12))
```

Ici :

- `Button` crée le bouton ;
- `.padding()` ajoute de l’espace ;
- `.background(.blue)` ajoute un fond bleu ;
- `.foregroundStyle(.white)` met le texte en blanc ;
- `.clipShape(...)` arrondit les coins.

---

# 2. `Text`

`Text` sert à afficher une chaîne de caractères.

```swift
Text("Bonjour SwiftUI")
```

Avec des modifiers :

```swift
Text("Bonjour SwiftUI")
    .font(.title) // Change la taille et le style du texte
    .fontWeight(.bold) // Met le texte en gras
    .foregroundStyle(.blue) // Change la couleur du texte
    .padding() // Ajoute de l’espace autour du texte
```

Exemple dans une vue :

```swift
struct WelcomeView: View {
    var body: some View {
        Text("Bienvenue")
            .font(.largeTitle)
            .fontWeight(.bold)
            .foregroundStyle(.primary)
    }
}
```

---

# 3. Text avec une variable

Tu peux afficher une valeur dynamique dans un `Text`.

```swift
struct UsernameView: View {
    let username: String

    var body: some View {
        Text("Bonjour, \(username)") // Interpolation de variable dans le texte
            .font(.title2)
    }
}
```

Utilisation :

```swift
UsernameView(username: "Guillaume")
```

---

# 4. `Image`

`Image` sert à afficher une image.

Il y a deux cas fréquents :

- image depuis les assets du projet ;
- image système SF Symbols.

## Image depuis les assets

Si tu as une image appelée `profile_picture` dans tes assets :

```swift
Image("profile_picture")
    .resizable() // Permet à l’image de changer de taille
    .scaledToFit() // Garde les proportions de l’image
    .frame(width: 120, height: 120) // Définit une taille
```

## Image système

SwiftUI peut afficher des icônes système avec SF Symbols.

```swift
Image(systemName: "person.circle.fill")
    .font(.system(size: 60)) // Taille de l’icône
    .foregroundStyle(.blue) // Couleur de l’icône
```

Exemple complet :

```swift
struct ProfileIconView: View {
    var body: some View {
        Image(systemName: "person.circle.fill")
            .font(.system(size: 80))
            .foregroundStyle(.secondary)
    }
}
```

---

# 5. `Button`

`Button` sert à déclencher une action.

Version simple :

```swift
Button("Se connecter") {
    print("Connexion demandée") // Code exécuté au clic
}
```

Version avec contenu personnalisé :

```swift
Button {
    print("Profil ouvert")
} label: {
    HStack {
        Image(systemName: "person.fill")
        Text("Voir le profil")
    }
}
```

Cette deuxième forme est utile quand le bouton contient plusieurs éléments, comme une icône + un texte.

---

# 6. Button avec état SwiftUI

Un bouton modifie souvent un état.

```swift
struct LikeButtonView: View {
    @State private var isLiked = false

    var body: some View {
        Button {
            isLiked.toggle() // Inverse true/false
        } label: {
            Image(systemName: isLiked ? "heart.fill" : "heart")
                .font(.title)
                .foregroundStyle(isLiked ? .red : .gray)
        }
    }
}
```

Ici :

- `isLiked` contient l’état actuel ;
- quand on clique, `isLiked` change ;
- SwiftUI relit le `body` ;
- l’icône change automatiquement.

---

# 7. Les modifiers

Un modifier est une fonction qui transforme une vue.

Exemple :

```swift
Text("Titre")
    .font(.title)
    .foregroundStyle(.blue)
    .padding()
```

Chaque ligne modifie la vue précédente.

Tu peux retenir :

```text
Vue de base
  ↓
modifier
  ↓
modifier
  ↓
modifier
  ↓
vue finale affichée
```

---

# 8. L’ordre des modifiers compte

L’ordre des modifiers peut changer le résultat.

Exemple 1 :

```swift
Text("Bonjour")
    .padding()
    .background(.yellow)
```

Ici, le fond jaune couvre le texte + le padding.

Exemple 2 :

```swift
Text("Bonjour")
    .background(.yellow)
    .padding()
```

Ici, le fond jaune couvre seulement le texte, puis le padding est ajouté autour.

À retenir :

```text
SwiftUI applique les modifiers dans l’ordre où tu les écris.
```

---

# 9. Modifiers fréquents

## Texte

```swift
Text("Hello")
    .font(.title)
    .fontWeight(.bold)
    .foregroundStyle(.primary)
    .multilineTextAlignment(.center)
```

## Taille et espace

```swift
Text("Hello")
    .padding()
    .frame(maxWidth: .infinity)
```

## Fond et forme

```swift
Text("Hello")
    .padding()
    .background(.blue)
    .foregroundStyle(.white)
    .clipShape(RoundedRectangle(cornerRadius: 12))
```

## Visibilité et opacité

```swift
Text("Hello")
    .opacity(0.5)
    .hidden()
```

## Interaction

```swift
Text("Clique ici")
    .onTapGesture {
        print("Tap")
    }
```

---

# 10. Exemple réaliste : carte de profil simple

```swift
struct ProfileCardView: View {
    let name: String
    let subtitle: String

    var body: some View {
        HStack(spacing: 16) {
            Image(systemName: "person.circle.fill")
                .font(.system(size: 50))
                .foregroundStyle(.blue)

            VStack(alignment: .leading, spacing: 4) {
                Text(name)
                    .font(.headline)

                Text(subtitle)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }

            Spacer()

            Button {
                print("Profil ouvert")
            } label: {
                Image(systemName: "chevron.right")
                    .foregroundStyle(.secondary)
            }
        }
        .padding()
        .background(.gray.opacity(0.1))
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .padding(.horizontal)
    }
}
```

Utilisation :

```swift
ProfileCardView(
    name: "Guillaume",
    subtitle: "Développeur iOS"
)
```

---

# 11. `Label`

`Label` est pratique quand tu veux afficher une icône + un texte.

```swift
Label("Réglages", systemImage: "gear")
```

Exemple dans un bouton :

```swift
Button {
    print("Réglages")
} label: {
    Label("Réglages", systemImage: "gear")
}
```

Exemple dans une tabbar :

```swift
.tabItem {
    Label("Accueil", systemImage: "house")
}
```

---

# En UIKit (rappel)

En UIKit, tu instancies un objet puis tu configures ses propriétés une par une, de façon impérative.

`UILabel` (équivalent de `Text`) :

```swift
let label = UILabel()
label.text = "Bonjour"
label.font = .preferredFont(forTextStyle: .title1)
label.textColor = .systemBlue
label.numberOfLines = 0 // 0 = multiligne, comme .lineLimit(nil)
```

`UIImageView` (équivalent de `Image`) :

```swift
let imageView = UIImageView(image: UIImage(systemName: "person.circle.fill"))
imageView.contentMode = .scaleAspectFit // équivalent de .scaledToFit()
imageView.tintColor = .systemBlue
```

`UIButton` (équivalent de `Button`), avec `UIButton.Configuration` et une `UIAction` closure (iOS 16/17) :

```swift
var config = UIButton.Configuration.filled()
config.title = "Se connecter"
config.cornerStyle = .medium

let button = UIButton(configuration: config, primaryAction: UIAction { _ in
    print("Connexion demandée")
})
```

Différence clé de mentalité : en UIKit tu **modifies des propriétés sur un objet** que tu gardes en référence (impératif). En SwiftUI, une vue est une **description** et tu enchaînes des **modifiers** qui renvoient une nouvelle vue (déclaratif).

👉 En SwiftUI : `Button("Se connecter") { ... }.padding().background(.blue).foregroundStyle(.white)` remplace l'instanciation + configuration de propriétés.

---

# 12. Points à connaître

## Une vue peut être très petite

Tu peux créer un composant juste pour un bouton :

```swift
struct PrimaryButton: View {
    let title: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
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

---

## `foregroundStyle` est souvent préférable à `foregroundColor`

Tu verras parfois :

```swift
.foregroundColor(.blue)
```

Mais dans les versions modernes de SwiftUI, on utilise souvent :

```swift
.foregroundStyle(.blue)
```

`foregroundStyle` est plus flexible, notamment pour gérer des styles plus avancés.

---

# Résumé

À retenir :

- `Text` affiche du texte ;
- `Image` affiche une image ou une icône système ;
- `Button` déclenche une action ;
- `Label` combine une icône et un texte ;
- les modifiers changent l’apparence ou le comportement d’une vue ;
- l’ordre des modifiers compte ;
- une interface SwiftUI se construit en combinant des petites vues simples ;
- dès qu’un morceau d’interface devient réutilisable, tu peux en faire une `View` dédiée.

