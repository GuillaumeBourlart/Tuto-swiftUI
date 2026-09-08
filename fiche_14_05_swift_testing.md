# Fiche 14.05 — Swift Testing : le framework de test moderne

## Objectif

Maîtriser **Swift Testing**, le framework de test introduit avec Xcode 16 qui remplace progressivement XCTest. Tu vas voir `@Test`, `#expect`, `#require`, les `@Suite`, les tests paramétrés, les tests async/throwing, et la table d'équivalence depuis XCTest pour migrer sans douleur.

---

## 1. Le réflexe XCTest puis l'équivalent moderne

En XCTest tu écrivais une **classe** héritant de `XCTestCase`, des méthodes `func testX()`, et des `XCTAssert*` :

```swift
import XCTest

final class MathTests: XCTestCase {
    func testAddition() {
        XCTAssertEqual(2 + 2, 4)
    }
}
```

En Swift Testing, c'est une **struct** (ou une classe), des fonctions annotées `@Test`, et une seule macro `#expect` :

```swift
import Testing

struct MathTests {
    @Test func addition() {
        #expect(2 + 2 == 4)
    }
}
```

Différences clés :
- pas besoin de préfixer par `test`, le nom de fonction est libre ;
- `#expect(condition)` au lieu de `XCTAssert*` — **une seule** macro pour tout, avec une expression booléenne normale ;
- une **nouvelle instance** de la struct est créée pour chaque test (isolation automatique, pas de state partagé qui fuit entre tests).

---

## 2. `#expect` : l'assertion universelle

`#expect` prend une expression booléenne. Si elle est fausse, le test échoue **mais continue** : les assertions suivantes s'exécutent quand même.

```swift
@Test func userDefaults() {
    let user = User(name: "Guillaume", age: 30)
    #expect(user.name == "Guillaume")
    #expect(user.age == 30)
    #expect(user.age > 18)
}
```

La macro capture l'expression : en cas d'échec tu vois les **valeurs réelles** (`age` était `17`), pas juste « assertion failed ». Plus besoin de `XCTAssertEqual`, `XCTAssertTrue`, `XCTAssertGreaterThan`… tout passe par `==`, `>`, `contains`, etc.

```swift
@Test func collection() {
    let tags = ["swift", "ios"]
    #expect(tags.contains("swift"))
    #expect(tags.count == 2)
    #expect(!tags.isEmpty)
}
```

Tu peux ajouter un commentaire affiché en cas d'échec :

```swift
#expect(total == 100, "Le total devrait toujours faire 100")
```

---

## 3. `#require` : échoue ET arrête

`#expect` continue après un échec. `#require` **arrête le test immédiatement** s'il échoue — c'est l'équivalent moderne de `XCTUnwrap` et des assertions « bloquantes ».

Usage typique : déballer un optionnel avant de continuer. `try #require(optionnel)` renvoie la valeur dépaquetée, ou stoppe le test si c'est `nil`.

```swift
@Test func parsing() throws {
    let url = try #require(URL(string: "https://api.example.com"))
    // si l'URL était nil, on s'arrête ici au lieu de crasher plus bas
    #expect(url.scheme == "https")
}
```

Réflexe : **`#require` dès qu'une assertion suivante n'a plus de sens si celle-ci échoue** (un `nil` qui ferait planter le reste, un cast obligatoire). `#expect` pour les vérifications indépendantes.

```swift
@Test func firstElement() throws {
    let items = loadItems()
    let first = try #require(items.first)   // inutile de continuer si vide
    #expect(first.id == 1)
}
```

---

## 4. `@Suite` : grouper les tests

Une struct contenant des `@Test` est déjà une suite implicite. `@Suite` rend le groupement explicite, donne un nom lisible et permet d'attacher des traits (tags, `.serialized`, etc.).

```swift
@Suite("Validation du panier")
struct CartTests {
    @Test func emptyCartTotalIsZero() {
        #expect(Cart().total == 0)
    }

    @Test func addingItemUpdatesTotal() {
        var cart = Cart()
        cart.add(Item(price: 9.99))
        #expect(cart.total == 9.99)
    }
}
```

Le **setup/teardown** se fait naturellement : pas de `setUp()`/`tearDown()`. L'`init` de la struct sert de setup (rejoué à chaque test), et `deinit` (sur une classe) sert de teardown.

```swift
@Suite struct DatabaseTests {
    let db: Database

    init() {            // équivalent de setUp(), rejoué par test
        db = Database(inMemory: true)
    }

    @Test func insert() {
        db.insert(User(name: "Sarah"))
        #expect(db.count == 1)
    }
}
```

---

## 5. Tests async et throwing

Un test **asynchrone** se déclare simplement `async`. Pas de `XCTestExpectation`, pas de `wait(for:)` : tu fais `await` directement.

```swift
@Test func fetchUser() async throws {
    let service = UserService()
    let user = try await service.fetchUser(id: 1)
    #expect(user.name == "Guillaume")
}
```

Rappel du pont depuis XCTest : là où tu jonglais avec `XCTestExpectation` + `fulfill()` + `wait(for: [exp], timeout: 5)`, ici **`async` + `await` suffit**. Beaucoup moins de code et zéro timeout arbitraire.

Un test **throwing** se déclare `throws` : si une erreur non attendue est lancée, le test échoue automatiquement avec le détail de l'erreur.

```swift
@Test func decoding() throws {
    let data = Data("{\"id\":1}".utf8)
    let item = try JSONDecoder().decode(Item.self, from: data)
    #expect(item.id == 1)
}
```

---

## 6. Tester qu'une erreur est bien lancée

En XCTest, vérifier qu'une fonction throw était pénible (`XCTAssertThrowsError` avec une closure). Ici c'est intégré à `#expect`.

```swift
enum ValidationError: Error { case tooShort, empty }

@Test func rejectsEmptyPassword() {
    #expect(throws: ValidationError.empty) {
        try validate(password: "")
    }
}
```

Tu peux matcher juste le **type** d'erreur :

```swift
#expect(throws: ValidationError.self) {
    try validate(password: "ab")
}
```

Ou vérifier qu'**aucune** erreur n'est lancée :

```swift
#expect(throws: Never.self) {
    try validate(password: "motdepasse-valide")
}
```

Pour inspecter l'erreur capturée, utilise `#require(throws:)` qui **renvoie** l'erreur :

```swift
let error = try #require(throws: ValidationError.self) {
    try validate(password: "ab")
}
#expect(error == .tooShort)
```

---

## 7. Tests paramétrés : `@Test(arguments:)`

C'est l'arme la plus rentable de Swift Testing. **Un seul test** est exécuté avec plusieurs jeux de données — chaque cas apparaît séparément dans le rapport (et tu peux relancer juste celui qui échoue).

En XCTest tu écrivais soit une boucle `for` dans un test (échec illisible), soit 5 méthodes copiées-collées. Ici :

```swift
@Test(arguments: [0, 2, 4, 100, -8])
func isEven(_ number: Int) {
    #expect(number % 2 == 0)
}
```

Avec des paires d'entrée/sortie via des tuples :

```swift
@Test(arguments: [
    ("user@mail.com", true),
    ("invalide", false),
    ("a@b.fr", true),
    ("", false)
])
func emailValidation(_ input: String, _ expected: Bool) {
    #expect(isValidEmail(input) == expected)
}
```

`zip` pour combiner deux collections en parallèle (pas le produit cartésien) :

```swift
@Test(arguments: zip([1, 2, 3], [2, 4, 6]))
func doubling(_ input: Int, _ expected: Int) {
    #expect(input * 2 == expected)
}
```

⚠️ Avec deux tableaux séparés `arguments: [1,2], [10,20]`, Swift Testing fait le **produit cartésien** (4 cas). Utilise `zip` si tu veux des paires alignées.

---

## 8. Tags : organiser et filtrer

Les **tags** permettent de regrouper des tests à travers plusieurs suites (ex. tous les tests « réseau » ou « critiques ») et de les filtrer dans le Test Navigator de Xcode ou via un test plan.

```swift
extension Tag {
    @Tag static var network: Self
    @Tag static var critical: Self
}

@Suite struct CheckoutTests {
    @Test(.tags(.critical))
    func paymentSucceeds() async throws { /* ... */ }

    @Test(.tags(.network, .critical))
    func fetchPrices() async throws { /* ... */ }
}
```

Dans Xcode tu filtres par tag depuis le Test Navigator (ou un test plan qui n'inclut que certains tags). En ligne de commande, SwiftPM n'a pas de flag dédié aux tags : `swift test` ne propose que `--filter <regex>` (sur le nom) et `--skip <regex>`. Pour cibler un tag en CI, le moyen le plus simple reste de nommer les tests de façon cohérente, ou de passer par un test plan.

```bash
swift test --filter CheckoutTests   # filtre par nom (regex), pas par tag
```

Autres traits utiles : `.disabled("raison")` (au lieu de commenter ou de renommer le test), `.bug("https://...", "titre")` (lien vers un ticket), `.timeLimit(.minutes(1))`.

```swift
@Test(.disabled("API tierce instable, voir TICKET-42"))
func flakyExternalCall() async throws { /* ... */ }
```

---

## 9. Tester un ViewModel `@Observable`

Cas concret pour l'entretien. Un ViewModel moderne en `@Observable`, isolé sur `@MainActor` :

```swift
@MainActor
@Observable
final class CounterViewModel {
    private(set) var count = 0
    var isAtLimit: Bool { count >= 3 }

    func increment() {
        guard !isAtLimit else { return }
        count += 1
    }
}
```

Le test annoté `@MainActor` pour matcher l'acteur du ViewModel. On lit directement les propriétés `@Observable` (pas de `@Published`, pas de Combine) :

```swift
@Suite @MainActor
struct CounterViewModelTests {
    @Test func incrementIncreasesCount() {
        let vm = CounterViewModel()
        vm.increment()
        #expect(vm.count == 1)
    }

    @Test func stopsAtLimit() {
        let vm = CounterViewModel()
        for _ in 0..<5 { vm.increment() }
        #expect(vm.count == 3)
        #expect(vm.isAtLimit)
    }
}
```

Avec une charge async (fetch via un service mocké) :

```swift
@Test func loadFillsItems() async {
    let vm = ListViewModel(service: MockService(items: [.sample]))
    await vm.load()
    #expect(vm.items.count == 1)
    #expect(vm.errorMessage == nil)
}
```

---

## 10. Table d'équivalence XCTest → Swift Testing

| XCTest | Swift Testing |
|---|---|
| `XCTAssertEqual(a, b)` | `#expect(a == b)` |
| `XCTAssertNotEqual(a, b)` | `#expect(a != b)` |
| `XCTAssertTrue(x)` | `#expect(x)` |
| `XCTAssertFalse(x)` | `#expect(!x)` |
| `XCTAssertNil(x)` | `#expect(x == nil)` |
| `XCTAssertNotNil(x)` | `#expect(x != nil)` |
| `XCTAssertGreaterThan(a, b)` | `#expect(a > b)` |
| `let v = try XCTUnwrap(x)` | `let v = try #require(x)` |
| `XCTAssertThrowsError(try f())` | `#expect(throws: (any Error).self) { try f() }` |
| `XCTAssertNoThrow(try f())` | `#expect(throws: Never.self) { try f() }` |
| `XCTFail("msg")` | `Issue.record("msg")` |
| `class … : XCTestCase` | `struct …` (ou `@Suite`) |
| `func testX()` | `@Test func x()` |
| `setUp()` / `tearDown()` | `init()` / `deinit` |
| `XCTestExpectation` + `wait(for:)` | `@Test … async` + `await` |

**Cohabitation** : les deux frameworks tournent dans la **même target de test**, dans le même projet. Tu n'es pas obligé de tout migrer d'un coup — garde tes anciens fichiers XCTest et écris les nouveaux tests en Swift Testing. Xcode lance les deux. Limite à connaître : on ne met pas de fonctions `@Test` **à l'intérieur** d'une sous-classe `XCTestCase` (et on n'appelle pas les `XCTAssert*` depuis un `@Test`). Les deux styles peuvent vivre dans le même fichier tant qu'ils sont dans des types distincts.

---

## Points à connaître

- **`#expect` continue, `#require` arrête.** Mauvais réflexe : enchaîner des `#expect` qui déréférencent un optionnel `nil` → cascade d'échecs. Utilise `try #require` pour stopper net dès la première condition bloquante.
- **Nouvelle instance par test.** Contrairement à une crainte fréquente, le state d'une struct `@Suite` ne fuit **pas** entre tests : chaque `@Test` a son propre `init`. N'utilise pas de `static var` mutable pour partager du state.
- **Produit cartésien vs `zip`.** `@Test(arguments: a, b)` croise tout (`a.count × b.count` cas). Pour des paires alignées, passe `zip(a, b)`. Erreur classique qui fait exploser le nombre de cas.
- **`@MainActor` sur les tests de ViewModel.** Un ViewModel `@Observable @MainActor` exige que le test soit aussi sur le main actor, sinon erreur de concurrence (surtout sous Swift 6). Annote la suite `@MainActor`.

---

## Exercice

Réécris ces deux tests XCTest en Swift Testing, dont un en version **paramétrée**.

```swift
import XCTest

final class StringTests: XCTestCase {
    func testReversed() {
        XCTAssertEqual(String("abc".reversed()), "cba")
    }
    func testIsPalindrome() {
        XCTAssertTrue(isPalindrome("kayak"))
        XCTAssertFalse(isPalindrome("swift"))
    }
}
```

Objectif (10-20 min) : un fichier `StringTests.swift` avec `import Testing`, une `@Suite`, un `@Test` pour `reversed`, et un **seul** `@Test(arguments:)` paramétré couvrant au moins 3 paires `(mot, estPalindrome)` pour remplacer `testIsPalindrome`.

<details>
<summary>Solution</summary>

```swift
import Testing

@Suite("String utils")
struct StringTests {
    @Test func reversed() {
        #expect(String("abc".reversed()) == "cba")
    }

    @Test(arguments: [
        ("kayak", true),
        ("swift", false),
        ("ressasser", true),
        ("ios", false)
    ])
    func palindrome(_ word: String, _ expected: Bool) {
        #expect(isPalindrome(word) == expected)
    }
}
```
</details>

---

## Question d'entretien

**« Swift Testing vs XCTest, qu'est-ce qui change concrètement ? »**

> Swift Testing (Xcode 16, framework `Testing`) remplace les classes `XCTestCase` par des **structs** avec des fonctions `@Test`, et remplace toute la famille `XCTAssert*` par deux macros : `#expect(condition)` qui continue après un échec, et `#require(condition)` qui arrête le test (équivalent de `XCTUnwrap` + assertions bloquantes). Les gros gains : une **nouvelle instance par test** donc isolation automatique, les **tests paramétrés** via `@Test(arguments:)` qui remplacent les boucles ou méthodes dupliquées, l'**async natif** (`async`/`await` au lieu de `XCTestExpectation`), la vérification d'erreurs avec `#expect(throws:)`, et les **tags** pour filtrer transversalement. En cas d'échec, les macros affichent les valeurs réelles de l'expression. Les deux frameworks **cohabitent** dans la même target, donc la migration est progressive — pas besoin de tout réécrire d'un coup.

**« Différence entre `#expect` et `#require` ? »**

> `#expect` enregistre l'échec mais **laisse le test continuer** (utile pour vérifier plusieurs propriétés indépendantes en un seul run). `#require` est `throws` : il **interrompt le test** si la condition échoue, et `try #require(optionnel)` **déballe** la valeur. On utilise `#require` quand la suite du test n'a aucun sens si la condition échoue (un `nil` qui ferait planter le reste).

---

## Résumé

- `import Testing`, `@Test func`, et une struct au lieu d'une classe `XCTestCase`.
- `#expect(expr)` = assertion universelle qui **continue** ; `#require(expr)` **arrête** et déballe les optionnels.
- `@Suite` pour grouper, `init`/`deinit` pour setup/teardown, nouvelle instance par test.
- `@Test(arguments:)` = un test, plusieurs jeux de données ; `zip` pour des paires alignées (sinon produit cartésien).
- Tests `async` (juste `async`), `throws` pour les erreurs attendues, `#expect(throws: MyError.self)` pour vérifier qu'une erreur est lancée.
- **Tags** (`.tags(...)`) et traits (`.disabled`, `.bug`) pour organiser et filtrer.
- ViewModel `@Observable @MainActor` → suite de test `@MainActor`, on lit les propriétés directement.
- Table d'équivalence : `XCTAssertEqual(a,b)` → `#expect(a == b)`, `XCTUnwrap` → `#require`, etc.
- XCTest et Swift Testing **cohabitent** dans la même target : migration progressive.
