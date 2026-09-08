# Fiche 00.09 — Mémo express : syntaxe, variables et types

## Objectif

Rappel ultra-rapide des bases de syntaxe Swift. Pas un cours : juste de quoi vérifier que rien n'est oublié.

## Variables et constantes

```swift
let nom = "Guillaume"     // constante (immuable) — à préférer par défaut
var age = 30              // variable (mutable)
let pi: Double = 3.14     // type explicite
var compteur = 0          // type inféré (Int)
```

## Types de base

```swift
let entier: Int = 42
let flottant: Double = 3.14
let texte: String = "Salut"
let booleen: Bool = true
let caractere: Character = "A"
```

## Interpolation de chaîne

```swift
let score = 10
print("Score : \(score) points")     // "Score : 10 points"
let message = "\(nom) a \(age) ans"
```

## Tuples

```swift
let point = (x: 3, y: 5)
print(point.x)                       // 3
let (largeur, hauteur) = (1920, 1080)
```

## Conversions

```swift
let n = 7
let d = Double(n)            // Int -> Double
let s = String(n)           // "7"
let back = Int("42")        // Int? (optionnel, peut échouer)
```

## typealias

```swift
typealias UserID = String
let id: UserID = "abc123"
```

## Résumé

- `let` par défaut, `var` si ça doit changer.
- Type inféré la plupart du temps ; explicite avec `: Type` si besoin.
- Interpolation avec `\(...)`.
- Les conversions entre types sont **explicites** (`Double(n)`), Swift ne convertit jamais tout seul.
