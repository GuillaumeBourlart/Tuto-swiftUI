# Fiche 00.10 — Mémo express : conditions, boucles et optionals

## Objectif

Rappel rapide du control flow Swift et du déballage des optionals. Juste les formes à ne pas oublier.

## if / else

```swift
if age >= 18 {
    print("majeur")
} else if age >= 13 {
    print("ado")
} else {
    print("enfant")
}
```

## switch (exhaustif, pas de fallthrough par défaut)

```swift
switch note {
case 0..<10:   print("insuffisant")
case 10..<14:  print("correct")
case 14...20:  print("bien")
default:       print("hors barème")
}
```

## Boucles

```swift
for i in 1...5 { print(i) }          // 1 à 5
for i in 0..<5 { print(i) }          // 0 à 4
for nom in ["a", "b"] { print(nom) }
for (index, valeur) in tableau.enumerated() { }

var n = 3
while n > 0 { n -= 1 }
repeat { n += 1 } while n < 3
```

## Optionals — déballage

```swift
var prenom: String? = nil

// if let
if let p = prenom {
    print(p)            // p est déballé, non-optionnel
}

// guard let (early return)
func saluer(_ nom: String?) {
    guard let nom else { return }   // sort si nil
    print("Bonjour \(nom)")
}

// nil-coalescing
let affichage = prenom ?? "Anonyme"

// optional chaining
let longueur = prenom?.count        // Int?
```

## Résumé

- `switch` est **exhaustif** et sans fallthrough automatique.
- `for i in 0..<n` (exclusif) vs `1...n` (inclusif).
- Déballer un optional : `if let`, `guard let`, `??`, `?.` — jamais `!` sans certitude.
- `guard` sert à sortir tôt et garde le reste de la fonction « propre ».
