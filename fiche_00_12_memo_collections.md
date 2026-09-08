# Fiche 00.12 — Mémo express : collections et leurs méthodes

## Objectif

Rappel rapide des 3 collections Swift et des méthodes fonctionnelles utilisées partout (map/filter/reduce…).

## Array (ordonné, doublons OK)

```swift
var fruits = ["pomme", "poire"]
fruits.append("kiwi")
fruits.count                      // 3
fruits[0]                         // "pomme"
fruits.first                      // Optional("pomme")
fruits.isEmpty
fruits.contains("kiwi")           // true
fruits.remove(at: 0)
```

## Dictionary (clé → valeur, non ordonné)

```swift
var ages = ["Léa": 30, "Tom": 25]
ages["Léa"]                       // Optional(30)
ages["Max"] = 40                  // ajoute
ages["Tom"] = nil                 // supprime
for (nom, age) in ages { }
```

## Set (unique, non ordonné)

```swift
var tags: Set<String> = ["swift", "ios"]
tags.insert("swift")              // ignoré (déjà présent)
tags.contains("ios")             // true
```

## Méthodes fonctionnelles (à connaître absolument)

```swift
let n = [1, 2, 3, 4, 5]

n.map { $0 * 2 }                  // [2, 4, 6, 8, 10]
n.filter { $0 % 2 == 0 }          // [2, 4]
n.reduce(0, +)                    // 15 (somme)
n.first { $0 > 3 }                // Optional(4)
n.contains { $0 > 4 }             // true
n.sorted()                        // [1, 2, 3, 4, 5]
n.sorted(by: >)                   // [5, 4, 3, 2, 1]
n.compactMap { Int("\($0)") }     // retire les nil
n.forEach { print($0) }
```

## Chaînage

```swift
let result = n
    .filter { $0 % 2 == 1 }       // impairs
    .map { $0 * $0 }              // au carré
    .reduce(0, +)                 // somme
```

## Résumé

- `Array` ordonné, `Dictionary` clé/valeur, `Set` valeurs uniques.
- L'accès `dico[clé]` et `array.first` renvoient des **optionals**.
- `map` transforme, `filter` garde, `reduce` agrège, `compactMap` retire les nil.
- Ces méthodes se **chaînent** et remplacent la plupart des boucles `for`.
