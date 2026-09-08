# Fiche 00.01 — Struct vs class : value types et reference types

## Objectif

Maîtriser la distinction value type (struct/enum) vs reference type (class) : copie vs partage, identité vs égalité, copy-on-write. C'est le socle mental de SwiftUI (pourquoi une View est une struct) et LA question d'entretien iOS n°1.

---

## 1. Le résumé en une phrase

- **Value type** (`struct`, `enum`, et les tuples) : copié à chaque affectation ou passage en paramètre. Chaque variable possède sa propre instance.
- **Reference type** (`class`) : partagé. Une variable contient une *référence* (un pointeur) vers une instance unique sur le heap. Deux variables peuvent pointer vers le même objet.

Pont UIKit : en UIKit, tout ce que tu manipules est une `class` (`UIView`, `UIViewController`, `UILabel`, `NSObject`…). Tu raisonnais donc en permanence en "référence partagée". En Swift moderne, **le défaut s'inverse** : tu modélises avec des `struct`, et la `class` devient le cas particulier.

---

## 2. Copie (struct) vs partage (class) — l'exemple chiffré

```swift
struct PointValue { var x: Int }
class  PointRef   { var x: Int; init(x: Int) { self.x = x } }

// --- struct : COPIE ---
var a = PointValue(x: 10)
var b = a            // b est une COPIE indépendante
b.x = 99
print(a.x)           // 10  ← a n'a pas bougé
print(b.x)           // 99

// --- class : PARTAGE ---
let c = PointRef(x: 10)
let d = c            // d pointe vers la MÊME instance que c
d.x = 99
print(c.x)           // 99  ← c a changé aussi
print(d.x)           // 99
```

Le réflexe à graver : avec une `struct`, `b = a` clone. Avec une `class`, `d = c` partage. Modifier `d`, c'est modifier `c`.

Note : `c` et `d` sont déclarés en `let` mais on peut quand même muter `d.x`. Avec une `class`, `let` verrouille *la référence* (tu ne peux pas réassigner `c = autreInstance`), pas le contenu de l'objet pointé.

---

## 3. Passage en paramètre : même règle

```swift
func bump(_ p: PointValue) { var p = p; p.x += 1 }   // reçoit une copie
func bump(_ p: PointRef)   { p.x += 1 }               // reçoit la référence

var v = PointValue(x: 0)
bump(v)
print(v.x)   // 0  ← la fonction a muté SA copie

let r = PointRef(x: 0)
bump(r)
print(r.x)   // 1  ← la fonction a muté l'objet partagé
```

Les paramètres struct arrivent en `let` (immuables) par défaut ; tu en fais une copie locale `var p = p` si tu veux les muter. C'est l'opposé du `inout` (voir plus bas).

---

## 4. Identité (`===`) vs égalité (`==`)

Deux notions différentes, souvent confondues en entretien.

- `==` : **égalité de valeur**. Tu l'obtiens en conformant ton type à `Equatable` (souvent synthétisé automatiquement pour les struct).
- `===` : **identité de référence** = "est-ce le même objet en mémoire ?". Réservé aux `class`. N'existe pas pour les struct (ça n'aurait aucun sens : une struct n'a pas d'identité).

```swift
class User: Equatable {
    let id: Int
    init(id: Int) { self.id = id }
    static func == (l: User, r: User) -> Bool { l.id == r.id }
}

let u1 = User(id: 1)
let u2 = User(id: 1)   // même valeur, instance différente
let u3 = u1            // même instance

print(u1 == u2)   // true   ← égalité de valeur (id égaux)
print(u1 === u2)  // false  ← objets distincts en mémoire
print(u1 === u3)  // true   ← même objet
```

Pont UIKit : `===` est ton ancien `if view == someView` au sens pointeur (Objective-C comparait les pointeurs). En Swift, ce pointeur-check s'écrit explicitement `===`.

---

## 5. Copy-on-write (CoW) : le compromis perf

Si chaque copie de struct dupliquait physiquement la mémoire, un `Array` de 100 000 éléments serait catastrophique à passer en paramètre. Swift triche avec le **copy-on-write** sur `Array`, `Dictionary`, `Set`, `String` (et tes propres types qui s'appuient dessus).

Principe : la copie est **logique** mais le stockage est **partagé physiquement** tant que personne ne mute. La duplication réelle ne se déclenche qu'à la **première mutation** (et seulement si le buffer est partagé).

```swift
var original = [1, 2, 3]
var copie = original          // pas de duplication mémoire ici : même buffer
// ... lecture seule : toujours partagé, gratuit ...
copie.append(4)               // ICI : le buffer est dupliqué (CoW se déclenche)

print(original)   // [1, 2, 3]
print(copie)      // [1, 2, 3, 4]
```

Implication perf concrète : copier un gros tableau pour le *lire* est gratuit. Le coût n'apparaît qu'au moment où tu écris. Tu peux observer le déclenchement avec `isKnownUniquelyReferenced(&ref)` quand tu implémentes ton propre type CoW.

Piège fréquent : muter en boucle un élément d'un tableau passé/copié peut déclencher des copies inutiles si le buffer est encore partagé. En pratique, garde la mutation localisée à un seul propriétaire.

---

## 6. `mutating func`, `let` vs `var`, immutabilité

Une méthode de struct qui modifie ses propres propriétés doit être marquée `mutating` (elle remplace `self` par une nouvelle valeur, conceptuellement).

```swift
struct Counter {
    private(set) var value = 0
    mutating func increment() { value += 1 }   // 'mutating' obligatoire
}

var c = Counter()
c.increment()   // OK, c est var

let frozen = Counter()
// frozen.increment()   // ❌ erreur compile : on ne peut pas muter une struct en let
```

`let` sur une struct = **immutabilité totale** : aucune `mutating func`, aucune écriture de propriété. C'est garanti par le compilateur, gratuitement. Sur une `class`, `let` ne fige que la référence (rappel §2).

Quand tu veux qu'une fonction modifie la struct de l'appelant (au lieu de travailler sur une copie), utilise `inout` :

```swift
func reset(_ c: inout Counter) { c = Counter() }
var k = Counter(); k.increment()
reset(&k)        // & explicite à l'appel
print(k.value)   // 0
```

---

## 7. Pourquoi une SwiftUI `View` est une struct (le pont clé)

En UIKit, une `UIView` est une `class` : lourde, mutable, avec un cycle de vie long, manipulée par référence (`addSubview`, `removeFromSuperview`…). Tu gardais des références et tu mutais l'arbre de vues.

En SwiftUI, une `View` est une **struct jetable** :

```swift
struct ProfileView: View {
    let name: String
    var body: some View {
        Text("Bonjour \(name)")
    }
}
```

SwiftUI recrée cette struct très souvent (à chaque invalidation). C'est *voulu* et *bon marché* précisément parce que c'est une struct légère, sans identité, sans héritage. Le framework compare l'ancienne et la nouvelle valeur (value type → comparaison de valeur facile) pour décider quoi redessiner. L'état persistant, lui, ne vit pas dans la struct : il est externalisé dans `@State`, `@Observable`, etc.

Réponse type en entretien : "Une View est une struct car elle décrit l'UI comme une *valeur* recalculée à la demande, pas un objet mutable à long terme. Ça rend le diffing déclaratif efficace et évite les bugs d'état partagé d'UIKit."

---

## 8. Quand choisir struct vs class

**Struct par défaut.** C'est la recommandation Apple. Modèles de données, DTO, valeurs, et toutes tes Views.

Choisis une **class** seulement si tu as besoin d'un de ces points :

- **Identité** : deux objets de même valeur doivent rester distincts (un compte bancaire, une session).
- **État partagé / mutable depuis plusieurs endroits** : un cache, un coordinateur, un service.
- **Cycle de vie partagé** : plusieurs parties de l'app pointent vers le même objet et observent ses changements.
- **Héritage** : tu dois étendre une classe (souvent imposé par UIKit/Foundation, ex. `UIViewController`).
- **Interop Objective-C / `@objc`**.

Cas SwiftUI moderne : un **ViewModel est une class**, en `@Observable` (macro Observation, iOS 17+) :

```swift
import Observation

@Observable
final class ProfileViewModel {
    var name = ""
    var isLoading = false

    func load() async { /* ... */ }
}
```

Pourquoi class ici ? Parce qu'on veut une **identité stable** et un **état partagé observable** qui survit aux recréations de la View. La struct (la View) est jetable ; la class (le ViewModel) persiste et notifie. C'est la division du travail centrale en SwiftUI.

(Legacy à connaître : avant iOS 17 on utilisait `ObservableObject` + `@Published`. `@Observable` le remplace : moins de boilerplate, et le redessin se déclenche seulement sur les propriétés réellement lues par la View.)

---

## Points à connaître

- `let` sur une **class** ne fige que la référence, pas le contenu — piège n°1 des candidats. Sur une **struct**, `let` fige tout.
- `===` n'existe **que** pour les class. Le proposer sur une struct est une erreur conceptuelle (une struct n'a pas d'identité).
- Le copy-on-write rend les copies de gros `Array`/`String` gratuites en lecture ; le coût n'arrive qu'à la première mutation d'un buffer partagé.
- Mettre tout l'état mutable dans une struct partagée "comme en UIKit" → bugs : tu modifies une copie en croyant modifier l'original. Si tu veux du partage, c'est une class (ou un binding).

---

## Exercice

Prédis **sans compiler** la sortie de ce snippet, puis vérifie dans un Playground :

```swift
struct S { var n: Int }
class  C { var n: Int; init(_ n: Int) { self.n = n } }

var s1 = S(n: 1); var s2 = s1; s2.n = 5
let c1 = C(1);    let c2 = c1;   c2.n = 5

print(s1.n, s2.n)        // ?
print(c1.n, c2.n)        // ?
print(c1 === c2)         // ?
```

Justifie chaque ligne en une phrase (copie vs partage, identité).

---

## Question d'entretien

**Q : "Struct ou class, comment tu choisis ?"**
R : "Struct par défaut, conformément aux guidelines Apple : value semantics, pas d'état partagé surprise, copie sûre, et c'est ce qu'attend SwiftUI pour ses Views. Je passe à une class uniquement si j'ai besoin d'identité, d'héritage, d'interop Objective-C, ou d'un état mutable partagé observable — typiquement un ViewModel `@Observable` ou un service singleton."

**Q : "Quelle est la différence entre `==` et `===` ?"**
R : "`==` compare la *valeur* (via `Equatable`), `===` compare l'*identité*, c'est-à-dire si deux variables pointent vers le même objet en mémoire. `===` n'a de sens que pour les class."

**Q : "Pourquoi une SwiftUI View est-elle une struct alors qu'une UIView est une class ?"**
R : "Parce qu'une View décrit l'UI comme une valeur recalculée fréquemment et jetée. Une struct légère sans identité rend ces recréations bon marché et le diffing déclaratif simple. L'état persistant est externalisé dans `@State` ou un ViewModel `@Observable`, pas stocké dans la struct."

---

## Résumé

- **Value type** (struct/enum) = copié à l'affectation et au passage ; chaque variable a sa propre instance.
- **Reference type** (class) = partagé ; plusieurs variables peuvent pointer vers la même instance.
- `==` = égalité de valeur (`Equatable`) ; `===` = identité, réservé aux class.
- **Copy-on-write** : copie logique, partage physique du buffer jusqu'à la première mutation (`Array`, `String`, `Dictionary`, `Set`).
- `let` fige tout sur une struct, seulement la référence sur une class ; `mutating func` pour modifier une struct.
- **Struct par défaut** ; **class** pour identité, héritage, interop ObjC, ou état partagé observable (ViewModel `@Observable`).
- En SwiftUI, la View est une struct jetable, le ViewModel est une class persistante — d'où l'inversion du réflexe UIKit (où tout était class).
