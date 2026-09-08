# Fiche 00.11 — Mémo express : fonctions et closures

## Objectif

Rappel rapide des fonctions et closures Swift, y compris la syntaxe trailing closure omniprésente en SwiftUI.

## Fonctions

```swift
func addition(_ a: Int, _ b: Int) -> Int {
    a + b                                 // return implicite si une seule expression
}

func saluer(nom: String, poli: Bool = true) -> String {
    poli ? "Bonjour \(nom)" : "Salut \(nom)"
}

saluer(nom: "Léa")                        // labels d'arguments
addition(2, 3)                            // _ = pas de label
```

## Paramètres in-out

```swift
func incremente(_ x: inout Int) { x += 1 }
var compteur = 0
incremente(&compteur)                     // compteur = 1
```

## Closures

```swift
// closure stockée
let carre: (Int) -> Int = { n in n * n }
carre(4)                                  // 16

// passée à une fonction
let nombres = [1, 2, 3, 4]
let pairs = nombres.filter { $0 % 2 == 0 } // $0 = 1er argument
let doubles = nombres.map { $0 * 2 }
```

## Trailing closure (la syntaxe de SwiftUI)

```swift
// si le dernier paramètre est une closure, on la sort des parenthèses
Button("OK") {
    print("tapé")
}
// équivaut à Button("OK", action: { print("tapé") })
```

## @escaping et capture

```swift
func charger(completion: @escaping (String) -> Void) {
    // @escaping : la closure est appelée plus tard (async, stockée)
    DispatchQueue.main.async { completion("fini") }
}

// capture de self dans une closure échappante : attention au cycle de rétention
{ [weak self] in self?.faireQuelqueChose() }
```

## Résumé

- `return` implicite si la fonction tient en une expression.
- Arguments avec labels ; `_` pour les omettre.
- Closure = bloc de code ; `$0`, `$1` pour les arguments courts.
- **Trailing closure** = la syntaxe `{ ... }` après l'appel, partout en SwiftUI.
- `@escaping` = appelée plus tard → penser `[weak self]` (voir fiche 15.08).
