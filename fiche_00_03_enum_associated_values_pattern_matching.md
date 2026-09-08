# Fiche 00.03 — Enum, valeurs associées et pattern matching

## Objectif

Maîtriser les enums Swift au-delà du simple `NSInteger` UIKit : rawValue, `CaseIterable`, et surtout les **valeurs associées** qui modélisent les états d'écran et les routes de navigation. Le pattern matching (`switch`, `if case let`, `where`) est l'outil qui rend ce code exhaustif et sûr.

---

## 1. Enum simple, rawValue, CaseIterable

En UIKit tu utilisais souvent des enums C-style (`UITableViewCellStyle`) ou des constantes `Int`. En Swift, un enum est un vrai type, plus riche.

```swift
enum Direction {
    case north, south, east, west
}
```

Le `rawValue` donne une valeur brute optionnelle à chaque cas. Pratique pour mapper un backend.

```swift
enum Status: String {
    case active = "ACTIVE"
    case pending = "PENDING"
    case banned = "BANNED"
}

let s = Status(rawValue: "ACTIVE")   // Status? — init failable
print(Status.banned.rawValue)        // "BANNED"
```

`Int` raw values : auto-incrémentées si tu n'en mets pas.

```swift
enum Priority: Int {
    case low = 0, medium, high   // 0, 1, 2
}
```

`CaseIterable` te donne `allCases`, idéal pour remplir un `Picker` ou itérer (l'équivalent de lister tes constantes à la main en UIKit).

```swift
enum Tab: String, CaseIterable, Identifiable {
    case home, search, profile
    var id: Self { self }
}

ForEach(Tab.allCases) { tab in
    Text(tab.rawValue.capitalized)
}
```

> Piège : un enum avec valeurs associées **ne peut pas** avoir de `rawValue`. Les deux sont mutuellement exclusifs.

---

## 2. Valeurs associées : le vrai pouvoir

Une valeur associée = de la donnée attachée à un cas. C'est ça qui change tout par rapport à un `enum` C.

```swift
enum LoadState {
    case idle
    case loading
    case loaded(Profile)
    case error(String)
}
```

Chaque cas porte **exactement** la donnée qui a du sens dans cet état : `loaded` a un `Profile`, `error` a un message, `loading` n'a rien. Impossible d'avoir un `Profile` ET une erreur en même temps — l'état est cohérent par construction.

C'est l'outil idéal pour modéliser les **états d'écran** (loading / loaded / empty / error) que tu verras partout en SwiftUI, et les **routes de navigation** :

```swift
enum Route: Hashable {
    case profile(userID: String)
    case settings
    case article(id: Int, scrollToComment: Bool)
}

// Utilisé avec NavigationStack :
navigationPath.append(Route.profile(userID: "42"))
```

En UIKit tu poussais un `UIViewController` concret (`pushViewController(_:)`). Ici tu pousses une **valeur** qui décrit la destination, et la View décide quel écran construire. Plus testable, plus découplé.

---

## 3. switch exhaustif et extraction

Le `switch` sur un enum doit être **exhaustif** : le compilateur t'oblige à traiter tous les cas (ou un `default`). C'est un filet de sécurité énorme — ajoute un cas à l'enum, et tous les `switch` non exhaustifs ne compilent plus. Tu ne peux pas oublier un état.

Pour lire la valeur associée, tu la lies avec `let` (ou `var`) :

```swift
switch state {
case .idle:
    EmptyView()
case .loading:
    ProgressView()
case .loaded(let profile):          // extraction
    Text(profile.name)
case .error(let message):
    Text(message).foregroundStyle(.red)
}
```

Raccourci quand **toutes** les valeurs sont des `let` : tu factorises le mot-clé.

```swift
case let .article(id, scrollToComment):
    ArticleView(id: id, scrollToComment: scrollToComment)
```

---

## 4. where et binding multiple

`where` ajoute une condition au cas. Pas idéal :

```swift
case .loaded(let profile):
    if profile.isPremium {
        PremiumBadge()
    } else {
        StandardView(profile)
    }
```

Préférable — la condition est dans le `case`, le code reste plat :

```swift
case .loaded(let profile) where profile.isPremium:
    PremiumBadge()
case .loaded(let profile):
    StandardView(profile)
```

Tu peux aussi regrouper plusieurs cas qui partagent le même traitement :

```swift
switch state {
case .idle, .loading:
    ProgressView()
case .loaded, .error:           // pas besoin de la donnée ici
    ContentView()
}
```

Et matcher sur un tuple de deux enums (transition d'état, par ex.) :

```swift
switch (oldState, newState) {
case (.loading, .loaded(let profile)):
    print("Chargement terminé : \(profile.name)")
case (_, .error(let msg)):
    log(msg)
default:
    break
}
```

---

## 5. if case let / guard case let

Quand tu n'as besoin que **d'un seul** cas, le `switch` est trop lourd. `if case let` extrait une valeur sans exhaustivité.

```swift
if case .loaded(let profile) = state {
    print(profile.name)
}

// Avec condition :
if case .error(let msg) = state, !msg.isEmpty {
    showAlert(msg)
}
```

`guard case let` pour le early-exit (réflexe que tu avais déjà avec `guard let` sur les optionnels) :

```swift
func nameOrThrow() throws -> String {
    guard case .loaded(let profile) = state else {
        throw AppError.notLoaded
    }
    return profile.name
}
```

Comparaison directe d'un cas **sans** valeur associée : pas de `==` automatique, utilise `if case`.

```swift
if case .loading = state { /* en cours */ }
```

> Astuce : si l'enum est `Equatable`, tu peux écrire `state == .loading`. Mais dès qu'il y a une valeur associée à comparer, `if case` reste le bon outil.

---

## 6. Méthodes et propriétés calculées sur un enum

Un enum peut porter du comportement. Plutôt que d'éparpiller des `switch` dans tes Views, centralise la logique sur l'enum lui-même.

```swift
enum LoadState {
    case idle, loading
    case loaded(Profile)
    case error(String)

    var isLoading: Bool {
        if case .loading = self { return true }
        return false
    }

    var profile: Profile? {
        guard case .loaded(let p) = self else { return nil }
        return p
    }

    func iconName() -> String {
        switch self {
        case .idle:    "circle"
        case .loading: "arrow.clockwise"
        case .loaded:  "checkmark.circle"
        case .error:   "exclamationmark.triangle"
        }
    }
}
```

Note : depuis Swift 5.9, un `switch` qui n'a qu'une expression par cas **retourne** sa valeur sans `return` (comme ci-dessus). Idem dans un `body` SwiftUI.

---

## 7. Indirect enum (bref)

Un enum ne peut pas se contenir lui-même… sauf avec `indirect`, qui ajoute une indirection mémoire. Utile pour des structures récursives (arbre, expression).

```swift
indirect enum Expr {
    case value(Int)
    case add(Expr, Expr)
    case multiply(Expr, Expr)
}

func eval(_ e: Expr) -> Int {
    switch e {
    case .value(let v):        v
    case .add(let a, let b):   eval(a) + eval(b)
    case .multiply(let a, let b): eval(a) * eval(b)
    }
}

// (2 + 3) * 4
let expr = Expr.multiply(.add(.value(2), .value(3)), .value(4))
eval(expr) // 20
```

Rare en dev app classique, mais ça tombe parfois en entretien. `indirect` peut aussi être posé sur un seul cas plutôt que tout l'enum.

---

## 8. Enum d'état > plusieurs booléens (le refactor clé)

C'est LE point qui te rend crédible. Le pattern "trois propriétés indépendantes" est partout dans le code legacy.

Pas idéal — états impossibles représentables :

```swift
@Observable
final class ProfileViewModel {
    var isLoading = false
    var profile: Profile?
    var errorMessage: String?
}
```

Le problème : `isLoading == true` **et** `profile != nil` **et** `errorMessage != nil` est un état que rien n'interdit. La View doit deviner la priorité (`if isLoading { } else if let error { } else if let profile { }`), et tu oublieras un cas un jour. 3 booléens/optionnels = 8 combinaisons, dont 5 illégales.

Préférable — un seul enum, états illégaux **impossibles** :

```swift
enum ViewState {
    case loading
    case loaded([Friend])
    case empty
    case error(String)
}

@Observable
final class FriendsViewModel {
    var state: ViewState = .loading
    private let api: FriendsAPI

    init(api: FriendsAPI = .live) {
        self.api = api
    }

    func load() async {
        state = .loading
        do {
            let friends = try await api.fetchFriends()
            state = friends.isEmpty ? .empty : .loaded(friends)
        } catch {
            state = .error("Impossible de charger la liste.")
        }
    }
}
```

La View devient un `switch` exhaustif, lisible, sans else-if imbriqués :

```swift
struct FriendsView: View {
    @State private var viewModel = FriendsViewModel()

    var body: some View {
        Group {
            switch viewModel.state {
            case .loading:
                ProgressView()
            case .loaded(let friends):
                List(friends) { friend in
                    Text(friend.name)
                }
            case .empty:
                ContentUnavailableView("Aucun ami", systemImage: "person.slash")
            case .error(let message):
                Text(message)
            }
        }
        .task { await viewModel.load() }
    }
}
```

> "Make impossible states impossible" : c'est la phrase à retenir et à ressortir en entretien.

---

## Points à connaître

- Un enum avec valeurs associées **n'a pas** de `rawValue` ni de conformité `Equatable`/`Hashable` automatique si les valeurs portées ne sont pas elles-mêmes conformes — ajoute `: Equatable` explicitement si besoin.
- `if case .loading = state` (un seul `=`) n'est PAS une comparaison `==` : c'est un pattern match. Erreur classique : écrire `state == .loading` sur un enum non `Equatable` → ça ne compile pas.
- Oublier un cas dans un `switch` ne compile pas — c'est voulu. **Évite `default`** sur tes enums d'état : tu perds le filet de sécurité quand tu ajoutes un cas plus tard.
- Pour la navigation `NavigationStack`, ton enum de route doit être `Hashable`. Les valeurs associées doivent donc l'être aussi.

---

## Exercice

Pars de ce ViewModel "à l'ancienne" et refactore-le.

```swift
@Observable
final class TodoViewModel {
    var isLoading = false
    var todos: [String] = []
    var errorMessage: String?
}
```

1. Crée un `enum ViewState` avec `loading`, `loaded([String])`, `empty`, `error(String)`.
2. Remplace les 3 propriétés par une seule `var state: ViewState`.
3. Écris la `body` d'une View qui `switch` sur `state` (un cas chacun, `empty` affiche un `ContentUnavailableView`).

Objectif : zéro `if`/`else if` imbriqué dans la View. Faisable en 15 min.

---

## Question d'entretien

**Q : À quoi servent les valeurs associées d'un enum ? Donne un cas réel.**
R : Elles attachent de la donnée spécifique à chaque cas, ce qui permet de modéliser un état où seules certaines données existent. Cas réel : un `ViewState` (`loading` / `loaded(Data)` / `error(String)`) — l'état `loaded` porte la donnée, `error` porte le message, et il est **impossible** d'avoir les deux à la fois. Ça remplace plusieurs booléens/optionnels indépendants et élimine les états illégaux (« make impossible states impossible »).

**Q : Différence entre `if case let` et un `switch` ?**
R : `switch` est exhaustif (le compilateur exige tous les cas) — idéal quand on traite tous les états. `if case let` extrait un **seul** cas sans exhaustivité — idéal quand on ne s'intéresse qu'à une situation, en early-exit avec `guard case let`.

**Q : Pourquoi préférer un enum d'état à `isLoading` + `data?` + `error?` ?**
R : Trois propriétés indépendantes autorisent des combinaisons incohérentes (chargement ET erreur ET data en même temps). Un enum rend ces états impossibles, force la View à tout gérer via un `switch` exhaustif, et casse la compilation si on ajoute un cas sans l'afficher — donc moins de bugs.

---

## Résumé

- `rawValue` mappe un enum à une valeur brute (`String`/`Int`) ; `CaseIterable` donne `allCases`.
- Les **valeurs associées** attachent de la donnée à un cas : l'outil pour les états d'écran et les routes de navigation.
- Un enum avec valeurs associées n'a pas de `rawValue`.
- `switch` exhaustif + `case .x(let y)` extrait la donnée ; `where` filtre ; on peut grouper et matcher des tuples.
- `if case let` / `guard case let` pour un seul cas sans exhaustivité.
- Un enum porte méthodes et propriétés calculées : centralise la logique d'état.
- `indirect enum` pour les structures récursives (rare, mais bon à connaître).
- Un `enum ViewState` bat plusieurs booléens : il rend les états illégaux impossibles. C'est le réflexe pro à montrer.
