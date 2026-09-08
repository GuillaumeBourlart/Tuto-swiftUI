# Fiche 07.08 — Concurrence avancée : actors, Sendable, Swift 6 et continuations

## Objectif

Comprendre les data races et comment les éliminer avec les `actor`, garantir la sécurité du passage entre threads avec `Sendable`, lire les erreurs de Swift 6 strict concurrency, et brancher n'importe quel SDK UIKit (completion/delegate) sur `async/await` via les continuations et `AsyncStream`.

---

## 1. Le problème : la data race

Une **data race**, c'est quand deux tâches accèdent au *même* état mutable depuis *deux threads différents*, et qu'au moins l'une écrit. Résultat : valeur corrompue, crash aléatoire, bug qui ne se reproduit pas.

```swift
// ❌ Compteur partagé, modifié depuis plusieurs tâches concurrentes
final class Counter {
    var value = 0
    func increment() { value += 1 } // lecture + écriture non atomique
}

let counter = Counter()
await withTaskGroup(of: Void.self) { group in
    for _ in 0..<1000 {
        group.addTask { counter.increment() } // accès concurrents
    }
}
// counter.value n'est PAS forcément 1000 → data race
```

**Rappel UIKit :** avant, tu protégeais ça à la main avec une `DispatchQueue` série (`queue.sync { ... }`), un `NSLock`, ou `os_unfair_lock`. C'était à toi de ne jamais oublier un verrou. Swift moderne déplace cette garantie dans le **compilateur** via les actors.

---

## 2. L'actor : un état isolé, accédé via `await`

Un `actor` est une référence (comme une `class`) mais qui **sérialise** tous les accès à son état mutable. Un seul accès à la fois, garanti par le compilateur. Pour y toucher depuis l'extérieur, tu dois `await` (l'accès peut suspendre le temps que l'actor soit libre).

```swift
actor Counter {
    private(set) var value = 0
    func increment() { value += 1 } // pas besoin de lock : isolé par l'actor
}

let counter = Counter()
await withTaskGroup(of: Void.self) { group in
    for _ in 0..<1000 {
        group.addTask { await counter.increment() } // await obligatoire
    }
}
print(await counter.value) // 1000, toujours
```

Cas réel : un **cache thread-safe** partagé par plusieurs écrans/tâches.

```swift
actor ImageCache {
    private var store: [URL: Data] = [:]

    func data(for url: URL) -> Data? { store[url] }

    func insert(_ data: Data, for url: URL) {
        store[url] = data
    }
}
```

À l'intérieur de l'actor, l'accès à `store` est synchrone (`self` est déjà isolé). De l'extérieur : `await cache.data(for: url)`.

> Piège classique : à l'intérieur d'une méthode `async` de l'actor, dès que tu fais un `await`, l'actor peut servir un autre appel pendant la suspension. Ne suppose pas que ton état est inchangé après un `await` (**reentrancy**). Revérifie tes invariants après chaque point de suspension.

---

## 3. `@MainActor` et `nonisolated`

`@MainActor` est un **acteur global** : tout ce qu'il annote tourne sur le main thread. C'est l'équivalent garanti par le compilateur de ton vieux `DispatchQueue.main.async`.

```swift
@Observable
@MainActor
final class ProfileViewModel {
    var name = ""                 // touché uniquement sur le main thread
    func load() async {
        let user = await api.fetchUser() // l’appel peut suspendre ; son isolation dépend du service
        name = user.name                 // de retour sur le main : sûr pour l'UI
    }
}
```

`nonisolated` retire l'isolation pour un membre qui n'a pas besoin du contexte de l'actor (souvent du calcul pur ou des constantes). Utile pour exposer du synchrone sans `await`.

```swift
actor Session {
    let id = UUID()                              // let immuable + Sendable
    private(set) var hitCount = 0                // état mutable isolé
    nonisolated var label: String { "Session" }  // pas d'accès à l'état mutable
}

let s = Session()
print(s.label)            // pas de await : nonisolated
print(s.id)               // pas de await non plus : un `let` Sendable est lisible directement
print(await s.hitCount)   // await ici : c'est de l'état mutable isolé par l'actor
```

> Subtilité : une propriété `let` d'un type `Sendable` (comme `id`) est lisible **sans** `await`, même sans `nonisolated` — elle ne peut pas changer, donc aucune data race possible. Le `await` n'est obligatoire que pour l'**état mutable** de l'actor.

**Rappel UIKit :** tu écrivais `DispatchQueue.main.async { self.label.text = ... }` au retour d'un appel réseau. Avec `@MainActor`, l'isolation est statique : impossible d'oublier, le compilateur refuse de toucher l'UI hors du main.

---

## 4. `Sendable` : ce qui peut traverser une frontière de concurrence

Pour qu'une valeur passe d'une tâche/actor à une autre **sans risque de data race**, son type doit être `Sendable`. C'est un contrat vérifié par le compilateur.

Peuvent être Sendable, avec déclaration ou inférence selon le type et sa visibilité :
- les **value types** (`struct`, `enum`) dont tous les membres sont `Sendable` (`Int`, `String`, `Date`, etc.) ;
- les `actor` (leur état est isolé par construction) ;
- une `final class` qui déclare sa conformance et dont les propriétés sont des `let` Sendable ; les classes isolées à un acteur global ont également un contrat spécifique.

```swift
struct User: Sendable {       // souvent inféré, mais on peut l'expliciter
    let id: UUID
    let name: String
}
```

Une classe mutable ordinaire et non isolée ne peut pas obtenir une conformance Sendable vérifiée simplement : c'est une référence partagée modifiable. Préfère un `struct` (value type) dès que possible.

### `@Sendable` closures

Une closure exécutée sur une autre tâche doit être `@Sendable` : elle ne peut capturer que des valeurs `Sendable`, et pas de référence mutable partagée.

```swift
func run(_ work: @Sendable @escaping () -> Void) {
    Task { work() }
}

let name = "Guillaume"        // String est Sendable
run { print(name) }           // OK : capture une valeur Sendable
```

### `@unchecked Sendable` : avec prudence

Quand tu garantis toi-même la thread-safety (par exemple une classe protégée en interne par un lock), tu peux désactiver la vérification. C'est une **promesse au compilateur** : si tu te trompes, la data race revient sans filet.

```swift
final class SafeCounter: @unchecked Sendable {
    private let lock = NSLock()
    private var _value = 0
    var value: Int { lock.withLock { _value } }
    func increment() { lock.withLock { _value += 1 } }
}
```

> N'utilise `@unchecked Sendable` que si tu as une vraie raison (interop, lock maison, type C). Sinon c'est un trou de sécurité que le compilateur ne couvre plus. Préfère un `actor`.

---

## 5. Swift 6 : strict concurrency

**Repère de version :** la version du compilateur, le mode Swift et les réglages « Default Actor Isolation » / « Approachable Concurrency » sont distincts. Des projets récents peuvent inférer l’isolation MainActor. Les règles d’exécution des fonctions async non isolées dépendent aussi des fonctionnalités de langage activées ; ne déduis jamais « background » du seul mot async. Depuis Swift 6.2, `@concurrent` exprime un choix d’exécution concurrente pour une fonction async adaptée, avec ses contraintes de transfert. Pour le parcours, lis d’abord les garanties d’isolation avant d’utiliser `nonisolated` ou `Task.detached` comme contournement.

Référence : [Swift 6.2 — Swift.org](https://www.swift.org/blog/swift-6.2-released/).


Avant (Swift 5 mode), les problèmes de concurrence étaient au mieux des warnings, souvent rien. En **Swift 6 language mode**, les violations de `Sendable` et d'isolation deviennent des **erreurs de compilation**. Tu peux activer la transition progressivement avec le flag `-strict-concurrency=complete` en restant en Swift 5.

Les erreurs typiques au build, et comment les lire :

```
Capture of 'self' with non-sendable type 'MyClass' in a '@Sendable' closure
```
→ Tu passes un objet non-`Sendable` dans une `Task` / closure concurrente. Solution : rends-le `Sendable`, transforme-le en `struct`, ou isole-le dans un `actor`.

```
Main actor-isolated property 'name' can not be referenced from a non-isolated context
```
→ Tu touches une propriété `@MainActor` depuis un contexte qui n'est pas sur le main. Solution : marque la fonction appelante `@MainActor`, ou `await MainActor.run { ... }`.

```
Sending 'value' risks causing data races
```
→ Tu envoies une valeur dont l'usage pourrait continuer des deux côtés de la frontière. Solution : passe une copie value type, ou un type `Sendable`.

**Réflexe :** ne « fais pas taire » l'erreur avec `@unchecked Sendable` ou `nonisolated(unsafe)` sans comprendre. 90 % du temps, la bonne réponse est *un value type* ou *un actor*.

---

## 6. Bridger un SDK à completion → `async` : la continuation

La majorité des SDK (UIKit, frameworks Apple anciens, libs tierces) exposent encore des API à **completion handler**. Pour les consommer en `async/await`, tu les enveloppes une fois avec une continuation.

**Règle absolue :** tu dois appeler `resume` **exactement une fois**. Zéro fois → la tâche reste suspendue à vie (fuite). Deux fois → **crash**.

```swift
// API legacy à completion (typique d'un SDK)
func legacyFetch(completion: @escaping (Result<Data, Error>) -> Void) { /* ... */ }

// Pont moderne
func fetch() async throws -> Data {
    try await withCheckedThrowingContinuation { continuation in
        legacyFetch { result in
            switch result {
            case .success(let data): continuation.resume(returning: data)
            case .failure(let error): continuation.resume(throwing: error)
            }
        }
    }
}
```

- `withCheckedThrowingContinuation` : la closure peut `throw` (resume avec `throwing:`).
- `withCheckedContinuation` : version non-throwing.
- `withChecked...` ajoute une **vérification runtime** qui crashe avec un message clair si tu resume deux fois (ou jamais) — garde-le en dev. Les variantes `withUnsafe...` n'ont pas ce filet : réserve-les à du code chaud déjà validé.

**Rappel UIKit :** c'est exactement ainsi qu'on modernise `requestAuthorization(completion:)`, `requestWhenInUseAuthorization` suivi d'un delegate, `loadItem(forTypeIdentifier:completionHandler:)`, etc. Le pattern est toujours le même : 1 callback → 1 `resume`.

---

## 7. Un flux d'événements → `AsyncStream`

Une continuation = **une** valeur. Pour un **flux** d'événements (un delegate qui appelle plusieurs fois), c'est `AsyncStream`. Cas réel : transformer `CLLocationManagerDelegate` en séquence asynchrone que tu consommes avec `for await`.

```swift
import CoreLocation

final class LocationProvider: NSObject, CLLocationManagerDelegate {
    private let manager = CLLocationManager()
    private var continuation: AsyncStream<CLLocation>.Continuation?

    func locations() -> AsyncStream<CLLocation> {
        AsyncStream { continuation in
            self.continuation = continuation
            manager.delegate = self
            manager.startUpdatingLocation()
            continuation.onTermination = { [weak self] _ in
                self?.manager.stopUpdatingLocation()
            }
        }
    }

    func locationManager(_ manager: CLLocationManager,
                         didUpdateLocations locations: [CLLocation]) {
        for location in locations {
            continuation?.yield(location) // émet chaque mise à jour
        }
    }
}

// Consommation
let provider = LocationProvider()
for await location in provider.locations() {
    print(location.coordinate)
}
```

- `yield(_:)` pousse un élément dans le flux.
- `finish()` termine le flux proprement.
- `onTermination` est appelé quand le consommateur arrête (annulation, sortie du `for await`) : c'est là que tu coupes le SDK sous-jacent.

> Note Swift 6 : ce pattern compile tel quel en mode Swift 5 (selon les réglages du projet). En **mode Swift 6 strict**, le compilateur signale deux frontières sur ce code : la conformance à `CLLocationManagerDelegate` (protocole d'un framework Apple non encore annoté `Sendable`) et la capture de `self` (type non-`Sendable`) dans la closure `@Sendable` `onTermination`. Il n'y a pas de correctif d'une ligne : selon le SDK tu isoles la classe (`@MainActor`) et marques le delegate `nonisolated`, ou tu enveloppes le manager dans un wrapper que tu garantis thread-safe. C'est exactement la friction « API d'un vieux SDK vs strict concurrency » décrite en section 5 — d'où l'intérêt d'isoler ces ponts dans un seul type bien testé.

> Pont UIKit général : tout SDK delegate (Bluetooth `CBCentralManagerDelegate`, scanner, capteur, upload avec progression…) se modernise en `AsyncStream`. Un appel unique avec completion → continuation. Plusieurs callbacks dans le temps → `AsyncStream`.

---

## Points à connaître

- **Reentrancy** : après un `await` dans une méthode d'actor, l'état a pu changer (l'actor a servi un autre appel). Revérifie tes invariants, ne caches pas une valeur lue avant le `await`.
- **`resume` exactement une fois** : la double-resume crashe, la zéro-resume fuit silencieusement. Avec un delegate qui peut appeler success *puis* failure, ajoute un garde `if let c = continuation { self.continuation = nil; c.resume(...) }`.
- **`@unchecked Sendable` et `nonisolated(unsafe)`** désactivent la vérif : tu reprends la responsabilité de la thread-safety. À éviter sauf interop/lock maison.
- **Ne mets pas tout en `@MainActor`** : le réseau, le décodage JSON, le calcul lourd doivent tourner hors du main. Seul l'état d'UI doit y rester.

---

## Exercice

Tu as cette API legacy d'un SDK :

```swift
func loadProfile(id: String, completion: @escaping (Result<Profile, Error>) -> Void)
```

Écris une fonction `loadProfile(id:) async throws -> Profile` qui l'enveloppe avec `withCheckedThrowingContinuation`, en appelant `resume` exactement une fois dans chaque branche. (10-20 min)

---

## Question d'entretien

**« C'est quoi un `actor` ? »**
> Un type référence dont le compilateur sérialise tous les accès à l'état mutable : un seul à la fois. Ça élimine les data races sans lock manuel. On y accède de l'extérieur via `await`, car l'accès peut suspendre.

**« C'est quoi `Sendable` ? »**
> Un protocole-marqueur qui certifie qu'une valeur peut traverser une frontière de concurrence (tâche, actor) sans data race. Les value types dont les membres sont `Sendable` le sont automatiquement ; une `class` mutable ne l'est pas.

**« Pourquoi une continuation ? »**
> Pour ponter une API à completion handler (typiquement un SDK UIKit) vers `async/await`. `withCheckedThrowingContinuation` suspend la tâche jusqu'à ce que le callback appelle `resume` — exactement une fois, sinon crash (double) ou fuite (jamais). Pour un flux multi-événements, on utilise `AsyncStream` à la place.

---

## Résumé

- une **data race** = accès concurrent à un état mutable, au moins une écriture → corruption ;
- un **`actor`** isole son état et sérialise les accès (`await` de l'extérieur), sans lock manuel ;
- **`@MainActor`** force le main thread (UI), **`nonisolated`** retire l'isolation pour du code sans état partagé ;
- **`Sendable`** = peut traverser une frontière de concurrence ; préfère les value types ; `@unchecked Sendable` seulement si tu garantis la sécurité toi-même ;
- **Swift 6 strict concurrency** transforme ces violations en erreurs de build ; la bonne réponse est presque toujours *value type* ou *actor* ;
- **continuation** (`withCheckedThrowingContinuation`) pour ponter un callback unique → `async` : `resume` exactement une fois ;
- **`AsyncStream`** pour ponter un delegate multi-événements (ex : `CLLocationManagerDelegate`) → `for await`.
