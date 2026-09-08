# Fiche 00.04 — Protocols et protocol-oriented programming

## Objectif

Maîtriser le protocol comme contrat et comme type, les protocol extensions (le cœur du POP), et l'usage des protocols pour l'injection de dépendances et la testabilité. C'est la base qui rend tes services mockables et tes ViewModels testables sans réseau.

---

## 1. Protocol = contrat

Un `protocol` décrit ce qu'un type **doit savoir faire**, sans dire comment. Un type qui le respecte est dit **conforme**.

```swift
protocol Identifiable2 {
    var id: String { get }
}

struct User: Identifiable2 {   // conformance
    let id: String
    let name: String
}
```

Pont UIKit : tu connais déjà ça avec `UITableViewDataSource`. Quand tu écrivais `class MyVC: UIViewController, UITableViewDataSource`, tu **conformais** ta classe au protocole, et le compilateur t'obligeait à implémenter `tableView(_:numberOfRowsInSection:)`. Même mécanique ici, mais on va s'en servir bien au-delà de la délégation.

---

## 2. Protocol comme type (abstraction)

Un protocol n'est pas qu'une checklist : c'est aussi un **type** que tu peux utiliser pour des paramètres, des propriétés, des retours. Tu manipules l'abstraction, pas le type concret.

```swift
protocol Shape {
    var area: Double { get }
}

struct Circle: Shape {
    let radius: Double
    var area: Double { .pi * radius * radius }
}

struct Square: Shape {
    let side: Double
    var area: Double { side * side }
}

// On accepte n'importe quel Shape, peu importe le type concret
func describe(_ shape: any Shape) {
    print("Aire : \(shape.area)")
}
```

`any Shape` = une boîte qui contient *un* `Shape` quelconque (existential, résolu au runtime). À distinguer de `some Shape` (opaque, un seul type concret connu à la compilation) — c'est exactement le `some View` que tu vois partout en SwiftUI.

```swift
func makeCircle() -> some Shape { Circle(radius: 1) }   // toujours un Circle, type figé
let shapes: [any Shape] = [Circle(radius: 1), Square(side: 2)] // mix hétérogène autorisé
```

---

## 3. Protocol extensions = le cœur du POP

C'est LA différence avec UIKit. Tu peux donner une **implémentation par défaut** à une méthode du protocole via une extension. Les types conformes en héritent gratuitement et peuvent surcharger.

```swift
protocol Greetable {
    var name: String { get }
    func greeting() -> String
}

extension Greetable {
    func greeting() -> String {   // implémentation par défaut
        "Bonjour, \(name)"
    }
}

struct Robot: Greetable {
    let name: String
    // pas besoin de redéfinir greeting() : il est offert par l'extension
}

struct Pirate: Greetable {
    let name: String
    func greeting() -> String { "Arrr, \(name) !" }   // surcharge
}
```

C'est ce qu'on appelle le **protocol-oriented programming** : composer du comportement par protocols + extensions plutôt que par héritage de classes. En UIKit tu factorisais via une `UIViewController` de base ; ici tu n'as pas besoin de classe parente.

Piège classique du dispatch statique :

```swift
extension Greetable {
    func bonus() -> String { "défaut" }   // PAS dans le protocol
}
struct Foo: Greetable {
    let name = "Foo"
    func bonus() -> String { "Foo" }
}
let g: Greetable = Foo()
g.bonus()   // "défaut" ! (méthode hors protocol → dispatch statique sur Greetable)
```

Règle : si une méthode doit être polymorphe via le protocol, **déclare-la dans le protocol**, pas seulement dans l'extension.

---

## 4. Associated types et contraintes (bref)

Un `associatedtype` est un type générique « à trous » dans le protocol, résolu par le type conforme. C'est le mécanisme derrière `Collection`, `Identifiable` (son `ID`), etc.

```swift
protocol Container {
    associatedtype Item
    var items: [Item] { get }
    mutating func add(_ item: Item)
}

struct IntBox: Container {
    var items: [Int] = []
    mutating func add(_ item: Int) { items.append(item) }   // Item = Int
}
```

Tu peux contraindre un générique à un protocol (`where`), ou contraindre l'`associatedtype` :

```swift
func total<C: Container>(_ c: C) -> Int where C.Item == Int {
    c.items.reduce(0, +)
}
```

Bon à savoir : depuis Swift 5.7, tu peux écrire `any Container` même avec associated types (existentials généralisés). À garder simple tant que tu n'en as pas besoin.

---

## 5. Protocols pour la DI et la testabilité (l'usage central)

C'est ici que les protocols paient en pratique. Tu définis un service par son **interface** (un protocol), pas par son implémentation. Le ViewModel dépend de l'abstraction → tu peux injecter une vraie implémentation en prod et un **mock** en test.

```swift
struct Animal: Identifiable, Equatable {
    let id: UUID
    let name: String
}

// 1. Le contrat
protocol AnimalServicing {
    func fetchAnimals() async throws -> [Animal]
}

// 2. L'implémentation réelle (réseau)
struct AnimalService: AnimalServicing {
    func fetchAnimals() async throws -> [Animal] {
        // URLSession, décodage, etc.
        let (data, _) = try await URLSession.shared.data(from: URL(string: "https://api.example.com/animals")!)
        return try JSONDecoder().decode([Animal].self, from: data)
    }
}

// 3. Le ViewModel dépend du PROTOCOL, pas du type concret
@MainActor
@Observable
final class AnimalsViewModel {
    private let service: AnimalServicing
    var animals: [Animal] = []
    var errorMessage: String?

    init(service: AnimalServicing = AnimalService()) {   // injection avec défaut prod
        self.service = service
    }

    func load() async {
        do {
            animals = try await service.fetchAnimals()
        } catch {
            errorMessage = "Impossible de charger les animaux."
        }
    }
}
```

Note Swift moderne : `@Observable` (macro Observation, iOS 17+) remplace `ObservableObject` / `@Published`. Le ViewModel reste testable parce qu'il dépend d'`AnimalServicing`, jamais de `URLSession` directement.

Le mock pour les tests :

```swift
struct MockAnimalService: AnimalServicing {
    var result: Result<[Animal], Error> = .success([])
    func fetchAnimals() async throws -> [Animal] {
        try result.get()
    }
}

@MainActor
@Test
func loadPopulatesAnimals() async {
    let fake = [Animal(id: UUID(), name: "Rex")]
    let vm = AnimalsViewModel(service: MockAnimalService(result: .success(fake)))
    await vm.load()
    #expect(vm.animals == fake)
    #expect(vm.errorMessage == nil)
}

@MainActor
@Test
func loadSetsErrorOnFailure() async {
    struct Boom: Error {}
    let vm = AnimalsViewModel(service: MockAnimalService(result: .failure(Boom())))
    await vm.load()
    #expect(vm.animals.isEmpty)
    #expect(vm.errorMessage != nil)
}
```

Pas de réseau, pas de flakiness, test instantané. C'est le pattern DI repris en détail dans la Partie 06.

Pont UIKit : un `delegate` est un protocol, oui — mais c'est de la **délégation** (notifier un objet d'événements). Ici on utilise le protocol pour de l'**injection de dépendances** : remplacer une brique entière (le service) par une autre. Même outil, intention différente.

---

## 6. Les protocols standard à connaître

Ils ne sont pas décoratifs : SwiftUI et la stdlib s'appuient dessus pour fonctionner.

| Protocol | À quoi ça sert | Où ça compte |
|---|---|---|
| `Identifiable` | fournit un `id` stable | `List`, `ForEach` sans `id:`, diffing/animations |
| `Equatable` | comparer avec `==` | tests, `.onChange`, `Set`, optimisation des re-renders |
| `Hashable` | utilisable comme clé / dans un `Set` | `Set`, `Dictionary`, `NavigationStack` paths, `id` de `ForEach` |
| `Codable` | encode/décode JSON | réseau, persistance (`Codable` = `Encodable & Decodable`) |
| `Comparable` | tri (`<`, `sorted()`) | `sorted()`, ranges |

```swift
struct Animal: Identifiable, Hashable, Codable {
    let id: UUID
    let name: String
}
```

Le compilateur **synthétise** `Equatable`, `Hashable` et `Codable` automatiquement si toutes les propriétés sont elles-mêmes conformes. Tu déclares juste la conformance.

Pourquoi `Identifiable` change tout pour `List` :

```swift
// Pas idéal : id: \.self impose Hashable et peut casser si deux éléments sont "égaux"
List(animals, id: \.self) { ... }

// Préférable : Animal: Identifiable → diffing fiable, animations correctes à l'insertion/suppression
List(animals) { animal in Text(animal.name) }
```

---

## 7. Composer plusieurs protocols

Un type peut être conforme à plusieurs protocols, et tu peux exiger une combinaison.

```swift
protocol Persistable: Identifiable, Codable {}

// Exiger plusieurs conformances dans une fonction
func cache<T: Identifiable & Codable>(_ value: T) { /* ... */ }
```

C'est aussi pour ça que `Codable` existe : c'est un simple alias `typealias Codable = Encodable & Decodable`.

---

## Points à connaître

- **Méthode dans l'extension uniquement ≠ polymorphe.** Si elle n'est pas déclarée dans le protocol, l'appel via le type protocol part en dispatch statique (cf. section 3). Déclare-la dans le protocol si tu veux la surcharge.
- **`any` a un coût, `some` non.** `any Shape` = existential (indirection runtime) ; `some Shape` = type opaque résolu à la compilation. En hot path préfère les génériques / `some`.
- **Ne mocke pas en sous-classant ta vraie classe.** Extrais un protocol (`AnimalServicing`) et fais un struct mock conforme. Plus propre, pas besoin d'`open`/`override`, et ça marche avec des `struct`.
- **N'oublie pas `Identifiable` sur tes modèles de liste.** `id: \.self` est un signe que ton modèle devrait être `Identifiable`.

---

## Exercice

Pars de ce service concret :

```swift
struct WeatherService {
    func temperature(for city: String) async throws -> Double { 21.0 }
}
```

1. Extrais un protocol `WeatherProviding` avec la méthode `temperature(for:)`.
2. Fais conformer `WeatherService` au protocol (sans changer son corps).
3. Écris un `MockWeatherProvider` qui renvoie une valeur fixe que tu passes à l'init.
4. Bonus : écris un `@Test` qui vérifie qu'un ViewModel `@Observable` recevant le mock affiche bien la température.

Objectif : 10-20 min, aucun appel réseau réel.

---

## Question d'entretien

**Q : Pourquoi utiliser des protocols pour tester ?**
R : Pour casser la dépendance à des briques lentes ou non déterministes (réseau, base de données, horloge). Le code dépend d'une abstraction (`AnimalServicing`) injectée ; en test j'injecte un mock qui renvoie des résultats contrôlés, succès ou erreur. Tests rapides, déterministes, sans I/O réel — c'est de l'inversion de dépendance (le « D » de SOLID).

**Q : Quelle différence entre `some View` et `any View` ?**
R : `some View` est un type opaque : un seul type concret, connu à la compilation, sans coût d'indirection — c'est ce qu'on retourne d'un `body`. `any View` est un existential : il peut contenir des types différents au runtime, au prix d'une indirection. Pour `body` on veut `some`.

**Q : C'est quoi le protocol-oriented programming face à l'héritage de classes ?**
R : Composer du comportement via des protocols + protocol extensions (implémentations par défaut) plutôt que via une hiérarchie de classes. Ça marche avec les `struct` (value types), évite les problèmes d'héritage multiple/fragile, et permet de mixer des capacités à la carte. Apple pousse cette approche depuis « Protocol-Oriented Programming in Swift » (WWDC 2015).

---

## Résumé

- Un protocol est à la fois un **contrat** (ce qu'un type sait faire) et un **type** (`any`/`some`).
- Les **protocol extensions** donnent des implémentations par défaut : c'est le cœur du POP, et ça remplace souvent l'héritage de classes.
- Une méthode définie **uniquement** dans une extension n'est pas polymorphe via le type protocol (dispatch statique).
- L'usage clé en pratique : **DI + testabilité**. On dépend d'un protocol service (`AnimalServicing`), on injecte la vraie implémentation en prod et un **mock** en test.
- `Identifiable`, `Equatable`, `Hashable`, `Codable` sont des protocols standard que SwiftUI/stdlib utilisent pour `List`, `Set`, le diffing et le JSON — souvent synthétisés par le compilateur.
- Pont UIKit : un `delegate` est un protocol (délégation) ; ici on se sert des protocols surtout pour l'**injection de dépendances**.
