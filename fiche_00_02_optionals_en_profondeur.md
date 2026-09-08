# Fiche 00.02 — Les optionals en profondeur

## Objectif

Maîtriser les optionals Swift : ce qu'ils sont vraiment (un enum), comment les déballer proprement avec `if let` / `guard let`, et virer le réflexe `!` hérité d'Objective-C. C'est la base qui distingue un dev Swift propre d'un dev qui crashe en prod.

---

## 1. Un optional, c'est juste un enum

En Objective-C, n'importe quel objet pouvait être `nil` silencieusement. Tu envoyais un message à `nil`, il ne se passait rien (ou un crash plus loin, sans raison apparente). Swift refuse ce flou : un type **non optionnel ne peut jamais être `nil`**, point.

`Optional<T>` est littéralement un enum de la lib standard :

```swift
enum Optional<Wrapped> {
    case none           // équivaut à nil
    case some(Wrapped)  // contient une valeur
}
```

`String?` n'est que du sucre syntaxique pour `Optional<String>`. `nil` est `.none`. Une valeur est `.some(valeur)`.

```swift
let a: String? = "hello"   // .some("hello")
let b: String? = nil       // .none

// Tu peux même switcher dessus comme sur n'importe quel enum :
switch a {
case .some(let value): print("valeur : \(value)")
case .none:            print("vide")
}
```

Pont UIKit : en ObjC un `NSString *name` pouvait toujours être `nil` sans que le compilateur bronche. Ici, si le type est `String` (sans `?`), le compilateur **garantit** qu'il y a une valeur. L'absence devient explicite dans le type, pas une surprise à l'exécution.

---

## 2. `if let` — déballer dans une branche

Le pattern de base : tu déballes, et tu n'as accès à la valeur que dans le bloc.

```swift
func greet(_ name: String?) {
    if let name {            // Swift 5.7 : shorthand, plus besoin de `if let name = name`
        print("Bonjour \(name)")   // ici `name` est un String non optionnel
    } else {
        print("Inconnu")
    }
}
```

Avant Swift 5.7 tu écrivais `if let name = name { ... }`. Le shorthand `if let name` est devenu le standard quand le nom de la variable déballée est le même.

Tu peux enchaîner plusieurs déballages et ajouter des conditions :

```swift
if let user, let email = user.email, email.contains("@") {
    send(to: email)
}
```

---

## 3. `guard let` — déballer puis continuer (early return)

`if let` imbrique vers la droite (pyramid of doom). `guard let` fait l'inverse : il sort tôt si la valeur est absente, et la variable déballée **reste disponible dans tout le reste de la fonction**.

```swift
func process(_ name: String?) {
    guard let name else {
        print("Pas de nom, on arrête")
        return                       // guard EXIGE de quitter le scope
    }
    // `name` est utilisable ici jusqu'à la fin de la fonction
    print("Traitement de \(name)")
}
```

Cas réel courant : la forme courte `guard let self` (Swift 5.7+) dans une closure, pour éviter le `guard let self = self else { return }` verbeux :

```swift
Task { [weak self] in
    guard let self else { return }
    await self.refresh()
}
```

Le `else` d'un `guard` doit **obligatoirement** transférer le contrôle hors du scope : `return`, `throw`, `break`, `continue` ou `fatalError()`. Le compilateur le force.

---

## 4. `??` nil-coalescing — une valeur par défaut

Quand tu veux juste une valeur de repli, pas une branche :

```swift
let name: String? = nil
let display = name ?? "Anonyme"   // "Anonyme"
```

`??` court-circuite : la partie droite n'est évaluée que si la gauche est `nil`. Tu peux chaîner :

```swift
let value = primary ?? secondary ?? "défaut"
```

Pas idéal — utiliser `if let` juste pour fournir un défaut :

```swift
let display: String
if let name { display = name } else { display = "Anonyme" }
```

Préférable :

```swift
let display = name ?? "Anonyme"
```

---

## 5. `?.` optional chaining — appeler sans déballer

Tu accèdes à une propriété ou méthode sur un optionnel : si l'optionnel est `nil`, toute l'expression vaut `nil` (et le résultat est lui-même optionnel).

```swift
let count = user?.profile?.bio?.count   // Int?  — nil si un seul maillon est nil
```

Pont UIKit : exactement le comportement ObjC d'« envoyer un message à nil sans crash », mais ici c'est **explicite et typé** — le résultat est marqué `?`, tu sais que tu dois encore le gérer.

Combiné avec `??` c'est ultra fréquent :

```swift
let length = user?.name?.count ?? 0
```

---

## 6. `map` / `flatMap` sur Optional

Un optionnel est un conteneur, donc il a `map` : transformer la valeur **si elle existe**, sinon rester `nil`. Évite un `if let` pour une simple transformation.

```swift
let raw: String? = "42"

// map : (String) -> Int  =>  donne Int?
let asInt = raw.map { Int($0) }        // Int??  ⚠️ double optionnel !

// flatMap : aplatit quand la transfo renvoie elle-même un optionnel
let clean = raw.flatMap { Int($0) }    // Int?   ✅
```

Règle simple : si ta closure renvoie un **non-optionnel**, prends `map`. Si elle renvoie déjà un **optionnel** (comme `Int(String)` qui peut échouer), prends `flatMap` pour éviter le `Int??`.

```swift
let trimmed = userInput.map { $0.trimmingCharacters(in: .whitespaces) }  // String?
let id      = idString.flatMap(UUID.init)                                // UUID?
```

---

## 7. Force unwrap `!` — rare et risqué

`valeur!` déballe brutalement : si c'est `nil`, **crash immédiat** (`fatalError`). C'est l'équivalent moderne du `nil` silencieux d'ObjC… sauf qu'ici ça plante fort au lieu de pourrir tes données en douce.

Acceptable dans de rares cas où l'absence est un **bug de programmeur**, pas un état runtime possible :

```swift
// URL littérale codée en dur : si elle est invalide, c'est une faute de frappe, pas un cas runtime
let url = URL(string: "https://api.monservice.com/v1")!

// Ressource embarquée dans le bundle : son absence = build cassé
let image = UIImage(named: "logo")!
```

Dangereux dès que la valeur vient de l'extérieur (réseau, JSON, saisie utilisateur, `Optional` d'une API système) :

```swift
// ❌ NE FAIS PAS ÇA : la moindre réponse inattendue crashe l'app en prod
let name = json["name"] as! String
let first = array.first!
```

Préférable — déballe proprement et gère l'absence :

```swift
guard let first = array.first else { return }
let name = (json["name"] as? String) ?? "Inconnu"
```

Astuce crédibilité : `array.first!` se réécrit souvent sans optionnel du tout. Pour un défaut, `??`. Pour une garantie, `guard`.

---

## 8. Optionnels imbriqués, `try?`, `as?`

**Optionnels imbriqués** (`Int??`) arrivent surtout via `map` ou des dictionnaires de valeurs optionnelles. Évite-les : utilise `flatMap`, ou aplatis avec `??`.

```swift
let nested: Int?? = .some(nil)
let flat = nested ?? nil   // Int?
```

**`try?`** transforme une fonction qui `throw` en optionnel : succès → la valeur, erreur → `nil` (l'erreur est avalée).

```swift
let data = try? Data(contentsOf: fileURL)   // Data?, nil si ça throw
```

Pratique quand l'erreur précise ne t'intéresse pas. À éviter quand tu dois savoir *pourquoi* ça a échoué — là, utilise `do/catch`. Note : depuis Swift 5.0, `try?` n'ajoute plus de niveau d'optionnel superflu (pas de `Data??`).

**`as?`** est le cast conditionnel : réussit → valeur typée, échoue → `nil`. C'est l'équivalent sûr du `as!` d'ObjC.

```swift
if let label = view as? UILabel {
    label.text = "OK"   // on ne rentre ici que si le cast réussit
}
```

---

## 9. Pont UIKit : les IBOutlet `!` (implicitly unwrapped optionals)

Tu connais ça par cœur :

```swift
@IBOutlet var titleLabel: UILabel!
```

Le `!` après le type, c'est un **implicitly unwrapped optional** (IUO). Ce n'est pas un type à part : c'est un `Optional` ordinaire (`UILabel?` ici) que le compilateur s'autorise à déballer automatiquement à chaque usage, comme s'il n'était pas optionnel.

Pourquoi UIKit l'utilise : l'outlet est `nil` entre `init` et le chargement de la vue (`viewDidLoad`), puis garanti non-`nil` ensuite. Le `!` te laisse l'écrire `titleLabel.text = ...` sans déballer partout.

Le piège : si tu touches l'outlet **avant** que la vue soit chargée (ex. depuis l'`init`, ou un outlet jamais branché dans le storyboard), c'est un crash `unexpectedly found nil while unwrapping`.

```swift
// ❌ crash : la vue (et donc l'outlet) n'existe pas encore
init() {
    super.init(nibName: nil, bundle: nil)
    titleLabel.text = "Hello"   // titleLabel est nil ici
}
```

À retenir côté SwiftUI : tu n'as **plus du tout** ce mécanisme. Pas d'outlets, pas de cycle de vie de vue à attendre. Une `@State`/`let` a sa valeur dès la création de la View. Les `T!` ne survivent en Swift moderne que pour le pont UIKit/storyboard ; ailleurs, considère-les comme une odeur de code.

---

## Points à connaître

- `if let` limite la valeur déballée à **son bloc** ; `guard let` la rend dispo **dans tout le reste du scope** et impose un early exit. Choisis selon où tu as besoin de la valeur.
- `map` vs `flatMap` : si ta closure renvoie déjà un optionnel, `flatMap` évite le `T??`. Confondre les deux est l'erreur classique.
- `try?` **avale** l'erreur. Si tu as besoin du *pourquoi*, c'est `do/catch`, pas `try?`.
- Un `T!` (implicitly unwrapped) crashe pareil qu'un `!` si tu y accèdes alors qu'il est `nil` — ce n'est pas « plus sûr », juste plus discret.

---

## Exercice

Refactore ce code truffé de force unwrap en version propre avec `guard let` et early return. Le but : zéro `!`, et la fonction sort proprement si une donnée manque.

```swift
func makeURL(from dict: [String: String]) -> URL {
    let host = dict["host"]!
    let path = dict["path"]!
    let scheme = dict["scheme"]!
    return URL(string: "\(scheme)://\(host)\(path)")!
}
```

Objectif : signature `func makeURL(from dict: [String: String]) -> URL?`, déballage par `guard let`, et construction de l'URL sans `!`. Faisable en 15 min.

---

## Question d'entretien

**Q : Quelle est la différence entre `if let` et `guard let`, et quand utiliser l'un plutôt que l'autre ?**

R : Les deux déballent un optionnel de façon sûre. `if let` rend la valeur disponible uniquement *dans le bloc `if`* — pratique pour un traitement local et optionnel. `guard let` impose de **quitter le scope** dans son `else` (`return`, `throw`, etc.) et rend la valeur disponible *dans tout le reste de la fonction* — idéal pour valider les préconditions en début de fonction et garder le « chemin heureux » non imbriqué (early return). Règle : si l'absence doit interrompre la suite, c'est `guard` ; si c'est juste une branche parmi d'autres, c'est `if let`.

**Q : Pourquoi `Int("abc")` renvoie un optionnel et pas un crash ?**

R : Parce que la conversion peut légitimement échouer à l'exécution (la chaîne n'est pas un nombre). Swift modélise cet échec dans le *type* (`Int?`) au lieu d'un crash ou d'une valeur sentinelle comme `0`. Le compilateur force alors l'appelant à gérer l'échec.

**Q : C'est quoi un implicitly unwrapped optional, et où en croise-t-on en pratique ?**

R : Un `T!` : un optionnel qui se déballe automatiquement à l'usage. On le trouve surtout sur les `@IBOutlet` UIKit, qui sont `nil` entre l'init et le chargement de la vue puis garantis non-`nil` ensuite. Y accéder trop tôt crashe pareil qu'un force unwrap. En Swift moderne hors pont UIKit, on l'évite.

---

## Résumé

- `Optional<T>` est un enum `.some` / `.none` ; Swift force à gérer l'absence au lieu du `nil` silencieux d'ObjC.
- `if let` (shorthand Swift 5.7) déballe dans un bloc ; `guard let` déballe + early return pour le reste du scope.
- `??` donne une valeur par défaut, `?.` chaîne sans déballer, `map`/`flatMap` transforment la valeur si elle existe (`flatMap` évite le double optionnel).
- `!` (force unwrap) : acceptable seulement quand `nil` = bug de prog (URL littérale, ressource bundle) ; dangereux sur toute donnée externe.
- `try?` → optionnel en avalant l'erreur ; `as?` → cast conditionnel sûr.
- Les `@IBOutlet var x: UILabel!` sont des implicitly unwrapped optionals : crash si accédés avant le chargement de la vue. Ce mécanisme disparaît en SwiftUI.
