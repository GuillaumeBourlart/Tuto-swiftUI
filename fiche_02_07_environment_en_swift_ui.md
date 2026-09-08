# Fiche 02.07 — `@Environment` en SwiftUI

## Objectif

Comprendre à quoi sert `@Environment`, comment récupérer des valeurs fournies par SwiftUI, et dans quels cas l’utiliser.

---

# 1. L’idée à comprendre

`@Environment` permet de lire une valeur disponible dans l’environnement SwiftUI.

Ces valeurs peuvent venir :

- du système ;
- de SwiftUI ;
- d’un parent ;
- d’une configuration injectée plus haut.

Exemples fréquents :

```swift
@Environment(\.dismiss) private var dismiss
@Environment(\.colorScheme) private var colorScheme
@Environment(\.horizontalSizeClass) private var horizontalSizeClass
@Environment(\.dynamicTypeSize) private var dynamicTypeSize
```

À retenir :

```text
@Environment = je lis une valeur contextuelle fournie par SwiftUI.
```

---

# 2. Différence entre `@Environment` et `@EnvironmentObject`

Les deux noms se ressemblent, mais ils ne servent pas à la même chose.

```swift
@Environment(\.dismiss) private var dismiss
```

Ici, tu lis une valeur précise de l’environnement.

```swift
@EnvironmentObject var session: SessionManager
```

Ici, tu récupères un objet observable complet injecté avec `.environmentObject(...)`.

Résumé :

```text
@Environment       → valeur système ou contextuelle
@EnvironmentObject → objet observable partagé
```

---

# 3. Exemple avec `dismiss`

`dismiss` sert à fermer une vue présentée, par exemple une sheet.

```swift
struct ParentView: View {
    @State private var isShowingSheet = false

    var body: some View {
        Button("Afficher") {
            isShowingSheet = true
        }
        .sheet(isPresented: $isShowingSheet) {
            SheetView()
        }
    }
}
```

Dans la sheet :

```swift
struct SheetView: View {
    @Environment(\.dismiss) private var dismiss // Permet de fermer la vue actuelle

    var body: some View {
        VStack(spacing: 16) {
            Text("Contenu de la sheet")
                .font(.title)

            Button("Fermer") {
                dismiss() // Ferme la sheet
            }
        }
        .padding()
    }
}
```

Ici, la sheet n’a pas besoin de recevoir un `@Binding` pour se fermer.

Elle utilise directement `dismiss` fourni par SwiftUI.

---

# 4. Exemple avec `colorScheme`

`colorScheme` permet de savoir si l’app est en light mode ou dark mode.

```swift
struct ThemeStatusView: View {
    @Environment(\.colorScheme) private var colorScheme

    var body: some View {
        Text(colorScheme == .dark ? "Dark mode" : "Light mode")
            .padding()
    }
}
```

Tu peux t’en servir pour adapter une vue selon le thème actuel.

Exemple :

```swift
struct AdaptiveCardView: View {
    @Environment(\.colorScheme) private var colorScheme

    var body: some View {
        Text("Carte")
            .padding()
            .background(colorScheme == .dark ? .white.opacity(0.1) : .gray.opacity(0.15))
            .clipShape(RoundedRectangle(cornerRadius: 16))
    }
}
```

Mais dans beaucoup de cas, il vaut mieux utiliser des couleurs adaptatives plutôt que tester manuellement `colorScheme` partout.

---

# 5. Exemple avec `dynamicTypeSize`

`dynamicTypeSize` permet de connaître la taille de texte choisie par l’utilisateur dans les réglages d’accessibilité.

```swift
struct DynamicTypeExampleView: View {
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize

    var body: some View {
        VStack(spacing: 12) {
            Text("Taille dynamique")
                .font(.title)

            Text("Valeur actuelle : \(dynamicTypeSize.description)")
                .font(.body)
        }
        .padding()
    }
}
```

C’est utile pour adapter certains layouts quand le texte devient très grand.

---

# 6. Exemple avec `horizontalSizeClass`

`horizontalSizeClass` permet de savoir si l’espace horizontal est compact ou régulier.

Sur iPhone, c’est souvent compact.

Sur iPad, ça peut être régulier.

```swift
struct AdaptiveLayoutView: View {
    @Environment(\.horizontalSizeClass) private var horizontalSizeClass

    var body: some View {
        if horizontalSizeClass == .compact {
            VStack {
                Text("Layout compact")
                Text("Adapté iPhone")
            }
        } else {
            HStack {
                Text("Layout large")
                Text("Adapté iPad")
            }
        }
    }
}
```

C’est utile pour adapter une interface selon la taille disponible.

---

# 7. Exemple avec `openURL`

`openURL` permet d’ouvrir une URL depuis SwiftUI.

```swift
struct OpenURLExampleView: View {
    @Environment(\.openURL) private var openURL

    var body: some View {
        Button("Ouvrir le site Apple") {
            if let url = URL(string: "https://apple.com") {
                openURL(url)
            }
        }
    }
}
```

Tu peux l’utiliser pour ouvrir :

- une page web ;
- un lien de support ;
- une page de conditions générales ;
- un lien vers les réglages si nécessaire avec une URL système adaptée.

---

# 8. Exemple avec `scenePhase`

`scenePhase` permet de connaître l’état de l’app : active, inactive ou en arrière-plan.

```swift
struct ScenePhaseExampleView: View {
    @Environment(\.scenePhase) private var scenePhase

    var body: some View {
        Text("État app : \(scenePhaseText)")
            .onChange(of: scenePhase) { _, newPhase in
                print("Nouvel état : \(newPhase)")
            }
    }

    private var scenePhaseText: String {
        switch scenePhase {
        case .active:
            return "active"
        case .inactive:
            return "inactive"
        case .background:
            return "background"
        @unknown default:
            return "inconnu"
        }
    }
}
```

C’est utile pour :

- rafraîchir des données quand l’app revient au premier plan ;
- sauvegarder un état quand l’app passe en arrière-plan ;
- mettre en pause certaines opérations.

---

# 9. Injecter une valeur d’environnement

Certaines valeurs d’environnement peuvent être modifiées plus haut dans la hiérarchie.

Exemple avec le color scheme :

```swift
ContentView()
    .preferredColorScheme(.dark)
```

Exemple avec une locale :

```swift
ContentView()
    .environment(\.locale, Locale(identifier: "fr"))
```

Exemple pour une preview :

```swift
#Preview("Français") {
    ContentView()
        .environment(\.locale, Locale(identifier: "fr"))
}

#Preview("Anglais") {
    ContentView()
        .environment(\.locale, Locale(identifier: "en"))
}
```

Cela permet de tester une vue dans différents contextes.

---

# 10. Quand utiliser `@Environment`

Utilise `@Environment` quand tu veux lire une information contextuelle.

Exemples :

```swift
@Environment(\.dismiss) private var dismiss
@Environment(\.colorScheme) private var colorScheme
@Environment(\.scenePhase) private var scenePhase
@Environment(\.openURL) private var openURL
@Environment(\.dynamicTypeSize) private var dynamicTypeSize
@Environment(\.locale) private var locale
```

Cas courants :

- fermer une sheet ;
- adapter une vue au dark mode ;
- détecter le retour au premier plan ;
- ouvrir une URL ;
- tester l’accessibilité ;
- adapter le layout à iPhone/iPad.

---

# 11. Quand ne pas utiliser `@Environment`

N’utilise pas `@Environment` pour stocker la logique métier de ton app.

Par exemple, pour une session utilisateur complète, préfère souvent :

```swift
@EnvironmentObject var session: SessionManager
```

ou un ViewModel selon le cas.

`@Environment` est plutôt fait pour lire des valeurs déjà présentes dans le contexte SwiftUI.

---

# 12. Points à connaître

## `@Environment` est en lecture contextuelle

Tu lis une valeur fournie par SwiftUI ou injectée plus haut.

Tu ne crées pas la donnée dans la vue.

---

## Certaines valeurs changent automatiquement

Par exemple :

- `colorScheme` change si l’utilisateur passe en dark mode ;
- `scenePhase` change quand l’app passe en arrière-plan ;
- `dynamicTypeSize` dépend des réglages d’accessibilité.

SwiftUI peut mettre à jour la vue si ces valeurs changent.

---

## Pour fermer une sheet, `dismiss` est souvent plus simple qu’un `@Binding`

Avec `@Binding` :

```swift
SheetView(isPresented: $isShowingSheet)
```

Avec `dismiss` :

```swift
@Environment(\.dismiss) private var dismiss
```

Si la vue a juste besoin de se fermer elle-même, `dismiss` est souvent plus propre.

---

# Résumé

À retenir :

- `@Environment` permet de lire une valeur contextuelle fournie par SwiftUI ;
- `@EnvironmentObject` sert à récupérer un objet observable partagé ;
- `dismiss` permet de fermer une vue présentée ;
- `colorScheme` permet de connaître light/dark mode ;
- `scenePhase` permet de savoir si l’app est active ou en arrière-plan ;
- `openURL` permet d’ouvrir une URL ;
- `dynamicTypeSize` aide à gérer l’accessibilité ;
- `@Environment` est utile pour le contexte système, pas pour toute la logique métier de l’app.

