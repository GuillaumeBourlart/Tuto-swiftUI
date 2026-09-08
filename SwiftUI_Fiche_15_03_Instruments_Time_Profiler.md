# Fiche 15.03 — Instruments Time Profiler

## Objectif

Comprendre à quoi sert Instruments Time Profiler et savoir l’utiliser pour repérer une lenteur ou un freeze UI.

Tu n’as pas besoin d’être expert performance, mais tu dois savoir diagnostiquer un problème simple.

## 1. Pourquoi utiliser Instruments ?

Quand une app rame, `print` ne suffit pas toujours.

Time Profiler montre quelles fonctions consomment le plus de temps CPU.

Cas typiques :

- écran qui freeze ;
- scroll saccadé ;
- traitement lourd dans le body SwiftUI ;
- parsing JSON trop gros ;
- image redimensionnée sur le main thread ;
- boucle coûteuse.

## 2. Lancer Time Profiler

Dans Xcode :

```text
Product
→ Profile
→ Instruments
→ Time Profiler
→ Record
```

Ensuite tu reproduis le problème dans l’app.

## 3. Ce qu’il faut regarder

Dans Time Profiler, cherche :

- les fonctions qui prennent beaucoup de temps ;
- les appels répétés trop souvent ;
- les traitements sur le main thread ;
- les fonctions de ton projet, pas seulement celles d’Apple.

La bonne question :

```text
Quelle fonction de mon code est appelée trop longtemps ou trop souvent ?
```

## 4. Exemple de mauvais code SwiftUI

```swift
struct ProductsView: View {
    let products: [Product]

    var body: some View {
        List(filteredProducts()) { product in
            Text(product.name)
        }
    }

    private func filteredProducts() -> [Product] {
        products.filter { $0.name.lowercased().contains("a") }
    }
}
```

Si la liste est grande, cette fonction peut être rappelée souvent.

Version plus propre :

```swift
struct ProductsView: View {
    let filteredProducts: [Product]

    var body: some View {
        List(filteredProducts) { product in
            Text(product.name)
        }
    }
}
```

Le calcul peut être fait dans un ViewModel.

## 5. Main thread

L’interface doit rester fluide. Les traitements lourds ne doivent pas bloquer le main thread.

Mauvais exemple :

```swift
Button("Traiter") {
    let result = heavyCalculation() // bloque l’UI : tout se passe sur le main thread
    self.result = result
}
```

### Piège fréquent : `Task {}` ne suffit PAS à libérer le main thread

Un `Button` SwiftUI, une `View` et un ViewModel `@MainActor` s’exécutent sur le **main actor**. Or un `Task {}` créé dans un contexte main-actor **hérite de cet acteur** : le travail reste sur le main thread tant qu’on ne quitte pas explicitement le main actor.

```swift
Button("Traiter") {
    Task {
        // ❌ Toujours sur le main thread si on est dans une View / un @MainActor.
        // heavyCalculation() gèle quand même l'UI.
        let result = heavyCalculation()
        self.result = result
    }
}
```

`await` ne déplace rien non plus si la fonction appelée tourne elle aussi sur le main actor.

### Faire le travail réellement hors du main thread

Pour décharger le main thread, le calcul lourd doit s’exécuter sur un contexte **non-isolé** ou en arrière-plan, puis on revient sur le main actor seulement pour mettre à jour l’UI.

Option A — une fonction `nonisolated` (ou dans un type non `@MainActor`) :

```swift
// Travail lourd, volontairement hors du main actor.
nonisolated func heavyCalculation(_ input: [Int]) async -> Int {
    input.reduce(0, +) // exemple : remplace par le vrai calcul coûteux
}

Button("Traiter") {
    Task {
        let result = await heavyCalculation(data) // s'exécute hors main thread
        self.result = result                      // retour auto sur le main actor
    }
}
```

Option B — `Task.detached` quand on veut explicitement se détacher de l’acteur courant :

```swift
Button("Traiter") {
    Task {
        let result = await Task.detached {
            heavyCalculation() // tourne sur un thread de fond
        }.value
        self.result = result   // self est @MainActor : MAJ UI sur le main thread
    }
}
```

À retenir : ce n’est pas `Task {}` qui sort du main thread, c’est le fait que le code exécuté ne soit **pas isolé sur le main actor**.

## 6. Ce qu’on peut dire en entretien

> J’utilise Instruments Time Profiler pour comprendre les lenteurs, repérer les fonctions coûteuses, vérifier si le main thread est bloqué et déplacer les traitements lourds hors de la vue. Et je sais qu’un simple `Task {}` dans une vue ou un `@MainActor` ne suffit pas à libérer le main thread : il faut que le calcul tourne sur un contexte non isolé (`nonisolated`, `Task.detached`, un `actor`), puis revenir sur le main actor pour l’UI.

## Résumé

- Time Profiler sert à trouver les fonctions coûteuses.
- Il est utile pour les freezes, scrolls saccadés et lenteurs.
- Évite les traitements lourds dans `body`.
- Le main thread doit rester disponible pour l’UI.
