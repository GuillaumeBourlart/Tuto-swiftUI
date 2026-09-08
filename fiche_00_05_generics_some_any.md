# Fiche 00.05 — Generics, `some` et `any` (opaque vs existential)

## Objectif

Maîtriser les génériques Swift (fonctions, types, contraintes, `where`), puis comprendre la différence cruciale entre `some` (type opaque, un type concret unique caché) et `any` (existential, une boîte hétérogène). Savoir lequel choisir, et pourquoi `AnyView`/type erasure existent encore.

---

# 1. Génériques : le rappel rapide

Tu connais déjà les génériques côté UIKit/Foundation (`Array<T>`, `Optional<T>`). En Swift tu en écris toi-même tout le temps.

```swift
// Fonction générique : T est un placeholder résolu au moment de l'appel
func first<T>(of array: [T]) -> T? {
    array.first
}

let n = first(of: [1, 2, 3])      // T = Int
let s = first(of: ["a", "b"])     // T = String
```

```swift
// Type générique : un conteneur qui marche pour n'importe quel Element
struct Box<Element> {
    var value: Element
}
```

Le compilateur génère une version spécialisée par type concret. Zéro coût d'indirection : c'est résolu statiquement.

---

# 2. Contraintes et clause `where`

Un placeholder libre ne sait rien faire. Tu le contrains à un protocole pour débloquer des capacités.

```swift
// T DOIT être Decodable : sinon impossible d'appeler le décodeur
func decode<T: Decodable>(_ data: Data) throws -> T {
    try JSONDecoder().decode(T.self, from: data)
}
```

Pour des contraintes plus fines, la clause `where` :

```swift
// Deux contraintes liées : Element conforme à Equatable
extension Array where Element: Equatable {
    func countOccurrences(of value: Element) -> Int {
        filter { $0 == value }.count
    }
}

// where sur les associated types (l'élément d'une séquence)
func sumAll<S: Sequence>(_ s: S) -> Int where S.Element == Int {
    s.reduce(0, +)
}
```

> Réflexe UIKit : tu utilisais déjà des contraintes sans le savoir avec `register(_:forCellReuseIdentifier:)` typé par `UITableViewCell`. Ici c'est la même idée mais explicite et générale.

---

# 3. `some` : le type opaque (un seul type concret, caché)

`some Protocol` veut dire : « il y a **un** type concret précis qui conforme à `Protocol`, mais je ne te dis pas lequel ». Le compilateur, lui, le connaît exactement.

C'est ce que tu écris des centaines de fois en SwiftUI sans y penser :

```swift
struct ProfileView: View {
    var body: some View {   // un type concret unique, ex: VStack<TupleView<...>>
        VStack {
            Text("Guillaume")
            Text("iOS dev")
        }
    }
}
```

Le type réel de `body` est un truc monstrueux (`VStack<TupleView<(Text, Text)>>`). Tu n'as pas envie de l'écrire : `some View` le cache, tout en gardant l'info de type pour le compilateur.

Règle clé : avec `some`, **toutes les branches doivent retourner le MÊME type concret**.

```swift
// ❌ NE COMPILE PAS : fonction simple, deux types concrets renvoyés (Text vs Image)
func makeView(loggedIn: Bool) -> some View {
    if loggedIn { return Text("OK") }        // underlying type: Text
    else { return Image(systemName: "x") }   // underlying type: Image
}
// error: opaque return type, mais les return n'ont pas le même underlying type
```

Attention au piège : dans un `var body`, ce même `if/else` **compile**, car SwiftUI applique implicitement `@ViewBuilder` qui emballe les branches dans un seul type (`_ConditionalContent`). C'est seulement **hors `@ViewBuilder`** (fonction/computed property ordinaire) que `some` exige un type concret unique — sinon tu unifies toi-même (souvent avec `Group` ou `AnyView`).

---

# 4. `some` côté API : un `request<Response>` propre

`some` n'est pas réservé à SwiftUI. Côté networking, on l'utilise pour les paramètres opaques.

```swift
protocol Endpoint {
    associatedtype Response: Decodable
    var path: String { get }
}

// some Endpoint en paramètre = "n'importe quel Endpoint concret, figé à l'appel"
func request<E: Endpoint>(_ endpoint: E) async throws -> E.Response {
    let url = URL(string: "https://api.example.com" + endpoint.path)!
    let (data, _) = try await URLSession.shared.data(from: url)
    return try JSONDecoder().decode(E.Response.self, from: data)
}
```

Ici le générique `<E: Endpoint>` te donne accès à `E.Response` (l'associated type), ce qu'un `any Endpoint` ne te permettrait pas aussi facilement. C'est le pont entre génériques et protocoles à associated type.

> Note : `func f(_ x: some P)` est juste du sucre pour `func f<T: P>(_ x: T)`. Même chose, syntaxe plus légère.

---

# 5. `any` : l'existential (une boîte hétérogène)

`any Protocol` veut dire : « **n'importe quel** type conforme à `Protocol`, et ça peut changer d'un élément à l'autre ». C'est une boîte runtime qui efface le type concret.

```swift
protocol Shape { func area() -> Double }
struct Circle: Shape { /* ... */ func area() -> Double { 3.14 } }
struct Square: Shape { /* ... */ func area() -> Double { 4 } }

// Tableau hétérogène : impossible avec some, naturel avec any
let shapes: [any Shape] = [Circle(), Square(), Circle()]
let total = shapes.reduce(0) { $0 + $1.area() }
```

Le coût : `any Shape` est une **existential box**. Le compilateur ne connaît pas le type à la compilation, donc il y a une indirection (boîte sur le tas si la valeur est grosse, dispatch dynamique via une table de témoins). Négligeable dans 99 % des cas, mais réel dans les boucles chaudes.

`some` vs `any` en une phrase :

```text
some View  -> UN type concret précis, fixé, caché au lecteur (mais connu du compilateur)
any View   -> N'IMPORTE quel type conforme, peut varier, type effacé (connu au runtime)
```

---

# 6. Quand `some`, quand `any` ?

| Situation | Choix | Pourquoi |
|---|---|---|
| Valeur de retour avec un seul type concret | `some` | rapide, statique, garde l'identité de type |
| Paramètre « accepte tout type conforme » | `some` (= générique) | spécialisé, performant |
| Collection de types mélangés | `any` | hétérogénéité impossible autrement |
| Stockage d'une valeur dont le type varie à l'exécution | `any` | il faut effacer le type |

Réflexe : commence par `some`. Passe à `any` seulement quand tu as besoin d'hétérogénéité ou de stocker des types qui varient.

```swift
// ❌ Pas idéal : any inutile pour un simple retour
func makeLabel() -> any View { Text("hi") }

// ✅ Préférable : some, type concret unique, zéro indirection
func makeLabel() -> some View { Text("hi") }
```

---

# 7. Type erasure : `AnyView`, `AnyEncodable` (et pourquoi)

Le type erasure sert à **forcer** des types différents dans une même « case ». C'est le boulot d'`any`, mais avant Swift 5.7 les existentials étaient limités, d'où les wrappers maison `AnyView`, `AnyPublisher`, `AnyEncodable`.

`AnyView` : utile quand tu DOIS retourner des types de vue différents sans `@ViewBuilder`.

```swift
// Quand some View ne passe pas (types vraiment différents, pas de ViewBuilder)
func icon(for state: State) -> AnyView {
    switch state {
    case .ok:    return AnyView(Image(systemName: "checkmark"))
    case .text:  return AnyView(Text("..."))
    }
}
```

> Anti-pattern : abuser d'`AnyView`. Ça casse les optimisations de diffing de SwiftUI (il perd l'identité de type). Préfère `@ViewBuilder` / `Group` ; `AnyView` est le dernier recours.

`AnyEncodable` : historiquement, encoder un dictionnaire de valeurs hétérogènes obligeait à un wrapper, car `Encodable` (avec ses exigences `Self`) ne s'utilisait pas comme type existential.

```swift
// Le contournement legacy : wrapper la valeur dans un type qui efface
struct AnyEncodable: Encodable {
    private let encodeImpl: (Encoder) throws -> Void
    init<T: Encodable>(_ value: T) {
        self.encodeImpl = value.encode
    }
    func encode(to encoder: Encoder) throws {
        try encodeImpl(encoder)
    }
}
```

**Important (Swift 5.7+)** : depuis SE-0309, tu peux passer une **valeur** `any Encodable` directement à `JSONEncoder().encode(_:)`, sans wrapper.

```swift
// ✅ Moderne : une valeur any Encodable s'encode directement
let value: any Encodable = "Guillaume"
let data = try JSONEncoder().encode(value)   // OK depuis Swift 5.7
```

Attention à la limite : un **conteneur** d'existentials comme `[String: any Encodable]` ne conforme **toujours pas** à `Encodable` (`type 'any Encodable' cannot conform to 'Encodable'`). Pour sérialiser un dictionnaire hétérogène d'un coup, il faut encore un wrapper qui efface le type :

```swift
// Toujours nécessaire pour un dictionnaire hétérogène en un seul encode
let params: [String: AnyEncodable] = [
    "name": AnyEncodable("Guillaume"),
    "age": AnyEncodable(31),
    "pro": AnyEncodable(true),
]
let data = try JSONEncoder().encode(params)
```

Donc : `any Encodable` règle le cas d'**une** valeur ; `AnyEncodable` reste utile pour les **collections** hétérogènes encodées en un seul appel.

---

# 8. Tout ensemble : un `APIClient` générique

Le cas réel qui combine génériques + protocoles + `some`/`any`.

```swift
protocol APIClient {
    func send<Response: Decodable>(_ request: URLRequest) async throws -> Response
}

struct LiveAPIClient: APIClient {
    private let decoder = JSONDecoder()

    // <Response: Decodable> : le type de retour est résolu par l'appelant
    func send<Response: Decodable>(_ request: URLRequest) async throws -> Response {
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse,
              (200..<300).contains(http.statusCode) else {
            throw URLError(.badServerResponse)
        }
        return try decoder.decode(Response.self, from: data)
    }
}
```

Appel : le type concret est déduit du contexte.

```swift
struct User: Decodable { let id: Int; let name: String }

let req = URLRequest(url: URL(string: "https://api.example.com/me")!)
let me: User = try await client.send(req)   // Response = User, déduit du `: User`
```

Et si tu veux injecter le client sans exposer son type concret :

```swift
// any APIClient : on stocke n'importe quelle implémentation (Live, Mock...)
@Observable
final class UserStore {
    private let client: any APIClient   // existential : utile pour l'injection / les mocks
    init(client: any APIClient) { self.client = client }
}
```

C'est l'usage légitime d'`any` : pouvoir glisser un `MockAPIClient` en test sans rendre `UserStore` lui-même générique.

---

# Points à connaître

- **`some` = un type concret unique caché** (connu du compilateur), **`any` = type effacé** (connu au runtime). `some` est rapide/statique ; `any` paie une indirection.
- Avec `some` en retour, **toutes les branches doivent rendre le même type concret** — sinon `@ViewBuilder`, `Group`, ou `AnyView`.
- **`func f(_ x: some P)` ≡ `func f<T: P>(_ x: T)`** : `some` en paramètre n'est que du sucre générique.
- **N'abuse pas d'`AnyView`** : il casse le diffing de SwiftUI (perte d'identité de type). Pour `Encodable` : depuis Swift 5.7, **une valeur** `any Encodable` s'encode directement ; mais `[String: any Encodable]` ne conforme toujours pas à `Encodable`, donc `AnyEncodable` reste utile pour les collections hétérogènes.

---

# Exercice

Écris une fonction générique `decode<T: Decodable>(_ data: Data) throws -> T` qui utilise `JSONDecoder`. Puis crée un struct `Product: Decodable { let id: Int; let title: String }`, fabrique un `Data` à partir d'un JSON littéral (`#"{"id": 1, "title": "Café"}"#`), et appelle `let product: Product = try decode(json)`. Affiche `product.title`. Bonus : ajoute un `let count: Int = try decode(...)` à partir de `"42"` pour vérifier que la même fonction marche pour deux types différents.

---

# Question d'entretien

**Q : Quelle est la différence entre `some View` et `any View` ?**
R : `some View` est un type opaque : il y a un seul type concret précis derrière, fixé à la compilation et connu du compilateur, juste caché au lecteur — c'est rapide, statique, et ça préserve l'identité de type (essentiel pour le diffing SwiftUI). `any View` est un existential : le type est effacé, il peut varier au runtime, au prix d'une indirection. En SwiftUI on veut presque toujours `some View` ; `any View`/`AnyView` ne sert que quand on doit mélanger des types de vue réellement différents.

**Q : Pourquoi `AnyView` peut nuire aux performances ?**
R : Il efface le type concret, donc SwiftUI perd l'identité de la vue et ne peut plus diff finement entre deux rendus — il a tendance à reconstruire le sous-arbre au lieu de le mettre à jour. On préfère `@ViewBuilder` ou `Group`.

**Q : `func f(_ x: some P)` et `func f<T: P>(_ x: T)`, c'est pareil ?**
R : Oui, sémantiquement identique. `some` en position de paramètre est juste une syntaxe abrégée pour un générique contraint anonyme.

---

# Résumé

- Génériques : `func f<T>`, `struct Box<T>`, contraintes `<T: Decodable>`, affinage avec `where`.
- `some` (opaque) : un type concret **unique** caché, statique, performant — c'est `some View`.
- `any` (existential) : boîte **hétérogène**, type effacé au runtime, légère indirection.
- Choisis `some` par défaut ; passe à `any` pour l'hétérogénéité (collections mixtes, injection de mocks).
- Type erasure (`AnyView`, `AnyEncodable`) : contournements ; depuis Swift 5.7 une **valeur** `any Encodable` s'encode directement, mais `AnyEncodable` reste utile pour les dictionnaires hétérogènes et `AnyView` reste un dernier recours.
- `APIClient` : `send<Response: Decodable>` combine génériques + protocoles ; `any APIClient` pour injecter Live/Mock.
