# Fiche 00.07 — Gestion des erreurs : Error, Result, throws

## Objectif

Maîtriser le modèle d'erreurs de Swift moderne : `throws`/`do-catch`, les variantes `try`/`try?`/`try!`, transformer une erreur technique en message UI affichable via `LocalizedError`, et savoir quand choisir `async throws` plutôt que `Result`.

---

## 1. Le pont avec UIKit / Objective-C

En UIKit/ObjC tu travaillais avec `NSError ** error` (paramètre out) et tu testais `if error != nil`. C'était optionnel, on pouvait l'ignorer. En Swift, une fonction marquée `throws` t'**oblige** à gérer l'erreur (ou à la propager) : le compilateur refuse de compiler sinon. Et `NSError` (domain + code) est remplacé par n'importe quel type conforme au protocole `Error`, le plus souvent une `enum`.

```swift
// UIKit/ObjC : erreur ignorable
NSError *error = nil;
NSString *content = [NSString stringWithContentsOfFile:path encoding:... error:&error];
// rien ne t'oblige à lire `error`

// Swift : erreur obligatoire à traiter
let content = try String(contentsOfFile: path, encoding: .utf8) // try imposé
```

---

## 2. Définir une erreur typée avec une enum

`Error` est juste un protocole vide (un marqueur). Une `enum` est le choix idiomatique : cas exhaustifs, valeurs associées pour le contexte.

```swift
enum APIError: Error {
    case invalidURL
    case unauthorized            // 401
    case server(statusCode: Int) // valeur associée = contexte
    case decoding(Error)         // on encapsule l'erreur d'origine
    case offline
}
```

C'est l'équivalent typé et exhaustif de tes anciens `NSError` avec des `code` magiques. Ici le `switch` sur l'erreur sera vérifié par le compilateur.

---

## 3. throw, throws, do-catch

- `throws` sur la signature : « cette fonction peut échouer ».
- `throw` dans le corps : on lève l'erreur (arrêt immédiat, comme un `return`).
- `do-catch` chez l'appelant : on attrape.

```swift
func fetchUser(id: Int) throws -> User {
    guard id > 0 else { throw APIError.invalidURL }
    // ...
    return User(id: id)
}

do {
    let user = try fetchUser(id: 42)
    print(user)
} catch APIError.unauthorized {
    // pattern matching sur un cas précis
    redirectToLogin()
} catch let APIError.server(code) {
    print("Serveur HS : \(code)")
} catch {
    // `error` est injecté automatiquement dans ce bloc
    print(error.localizedDescription)
}
```

Note : pas de `try`/`catch` à la Java où on attrape par hasard. En Swift, `catch` fait du pattern matching, et le dernier `catch` sans pattern est obligatoire si tu n'es pas exhaustif.

---

## 4. try, try?, try! : les trois variantes

```swift
let a = try fetchUser(id: 1)   // propage l'erreur (dans un contexte do ou throws)
let b = try? fetchUser(id: 1)  // -> User?  : nil si ça throw (l'erreur est PERDUE)
let c = try! fetchUser(id: 1)  // -> User   : CRASH si ça throw
```

- `try?` : tu transformes l'échec en `nil`. Pratique quand l'erreur précise ne t'intéresse pas (ex : un cache facultatif).
- `try!` : tu **garantis** que ça ne peut pas échouer ici (ex : une regex littérale valide, une ressource du bundle). En cas d'erreur → crash. À réserver aux invariants, jamais sur du réseau ou des entrées utilisateur.

### Anti-pattern : le `try?` qui avale l'erreur

```swift
// PAS IDÉAL : impossible de savoir pourquoi ça a échoué, debug infernal
let users = try? await api.fetchUsers()
// users == nil : réseau coupé ? 401 ? JSON cassé ? Aucune idée.

// PRÉFÉRABLE : on garde l'erreur pour la logger ET informer l'utilisateur
do {
    let users = try await api.fetchUsers()
    // ...
} catch {
    logger.error("fetchUsers: \(error)")
    state = .error(message(for: error)) // cf. section 6
}
```

Règle : `try?` est acceptable seulement si l'échec a une suite *réellement* neutre. Dès qu'un humain doit comprendre quelque chose, ne l'avale pas.

---

## 5. async throws : la norme moderne

Une fonction asynchrone qui peut échouer combine les deux mots-clés, dans cet ordre : `async throws`. À l'appel, l'ordre est `try await`.

```swift
func fetchUsers() async throws -> [User] {
    let (data, response) = try await URLSession.shared.data(from: url)
    guard let http = response as? HTTPURLResponse else {
        throw APIError.server(statusCode: -1)
    }
    guard http.statusCode == 200 else {
        throw APIError.server(statusCode: http.statusCode)
    }
    do {
        return try JSONDecoder().decode([User].self, from: data)
    } catch {
        throw APIError.decoding(error) // on re-mappe l'erreur de décodage
    }
}
```

Côté appelant (typiquement dans un ViewModel `@Observable`) :

```swift
@Observable
final class UsersViewModel {
    enum ViewState { case idle, loading, loaded([User]), error(String) }
    var state: ViewState = .idle

    @MainActor
    func load() async {
        state = .loading
        do {
            let users = try await api.fetchUsers()
            state = .loaded(users)
        } catch {
            state = .error(message(for: error)) // erreur -> message UI
        }
    }
}
```

C'est le couple `async throws` + `do-catch` + état `.error(String)` qui relie cette fiche aux vues d'erreur (cf. fiche 03.05).

---

## 6. Mapper une erreur technique en message UI

Ne montre **jamais** `URLError -1009` ou `The data couldn't be read` à l'utilisateur. Deux approches complémentaires.

### a) LocalizedError pour un message « par défaut »

Conformer ton erreur à `LocalizedError` permet à `error.localizedDescription` de renvoyer ton texte.

```swift
extension APIError: LocalizedError {
    var errorDescription: String? {
        switch self {
        case .invalidURL:           "Une erreur interne est survenue."
        case .unauthorized:         "Ta session a expiré, reconnecte-toi."
        case .server:               "Le service est momentanément indisponible."
        case .decoding:             "Réponse inattendue du serveur."
        case .offline:              "Pas de connexion. Vérifie ton réseau."
        }
    }
}
```

Attention : `errorDescription` n'est appelé que si l'erreur EST une `APIError`. Une `URLError` brute renverra encore son message système.

### b) Une fonction de mapping qui couvre aussi les erreurs système

Plus robuste : tu centralises la traduction « erreur quelconque → message actionnable ».

```swift
func message(for error: Error) -> String {
    switch error {
    case let api as APIError:
        return api.errorDescription ?? "Une erreur est survenue."
    case let url as URLError where url.code == .notConnectedToInternet:
        return "Pas de connexion. Vérifie ton réseau puis réessaie."
    case is URLError:
        return "Connexion impossible. Réessaie dans un instant."
    default:
        return "Une erreur inattendue est survenue."
    }
}
```

Un bon message UI est **actionnable** : il dit quoi faire (« réessaie », « reconnecte-toi », « vérifie ton réseau »), pas juste « erreur ».

---

## 7. Result<Success, Failure> : encore utile, mais legacy

`Result` est une `enum` à deux cas (`.success`, `.failure`) qui transporte le résultat OU l'erreur comme une **valeur**. Avant async/await, c'était LA façon de gérer l'erreur dans un callback (impossible de `throw` à travers une closure asynchrone).

```swift
// Style legacy : closure de complétion + Result
func fetchUsers(completion: @escaping (Result<[User], APIError>) -> Void) {
    URLSession.shared.dataTask(with: url) { data, _, error in
        if error != nil { return completion(.failure(.offline)) }
        guard let data else { return completion(.failure(.server(statusCode: -1))) }
        do {
            let users = try JSONDecoder().decode([User].self, from: data)
            completion(.success(users))
        } catch {
            completion(.failure(.decoding(error)))
        }
    }.resume()
}

// Côté appel : on switch sur le Result
fetchUsers { result in
    switch result {
    case .success(let users): print(users)
    case .failure(let error):  print(error.localizedDescription)
    }
}
```

Tu le croises encore dans : des SDK tiers, du code Combine (`Future`, `sink(receiveCompletion:)`), et des bases de code pré-2021.

---

## 8. Convertir Result ⇄ async throws

Le pont est utile pour wrapper une vieille API dans du code moderne, ou l'inverse.

```swift
// throws -> Result : capture l'éventuelle erreur sans la propager
let result = Result { try fetchUserSync(id: 1) } // Result<User, Error>

// Result -> throws : .get() renvoie la valeur ou throw le .failure
let user = try result.get()

// Wrapper une API à callback (Result) en async throws moderne
func fetchUsersAsync() async throws -> [User] {
    try await withCheckedThrowingContinuation { continuation in
        fetchUsers { result in
            continuation.resume(with: result) // résume avec succès OU erreur
        }
    }
}
```

`withCheckedThrowingContinuation` + `resume(with:)` est le pattern standard pour moderniser une API à completion handler sans la réécrire.

---

## 9. Typed throws (Swift 6) — intro courte

Depuis Swift 6, tu peux préciser le type d'erreur jeté : `throws(APIError)`. L'appelant attrape alors une erreur **typée** (le `catch` connaît le type exact, plus besoin de cast).

```swift
func fetchUser(id: Int) throws(APIError) -> User {
    guard id > 0 else { throw .invalidURL } // type inféré : pas besoin de "APIError."
    return User(id: id)
}

do {
    let user = try fetchUser(id: 1)
} catch {
    // ici `error` est de type APIError, pas `any Error`
    switch error { case .invalidURL: break; default: break }
}
```

`throws` « classique » équivaut en fait à `throws(any Error)`, et une fonction **non-jetante** équivaut à `throws(Never)` (`Never` = le type bottom, qui n'a aucune valeur, donc « ne peut rien jeter »). En pratique : utile pour des libs/algorithmes au domaine d'erreur fermé. Pour de l'app classique (réseau, décodage), `throws` simple reste recommandé — le typage strict devient vite contraignant dès qu'une couche relaie des erreurs hétérogènes.

---

## Points à connaître

- **`try?` n'avale pas que l'erreur, il avale l'info de debug.** Logge avant de réduire à `nil`, sinon tu pilotes à l'aveugle en prod.
- **`localizedDescription` ≠ message produit.** Sur une erreur non-`LocalizedError`, c'est le message système (souvent en anglais, technique). Passe toujours par ta fonction de mapping pour l'UI.
- **`errorDescription` doit retourner une `String?`** (pas `String`) : c'est une propriété du protocole `LocalizedError`. Oublier le `?` = ne conforme pas.
- **Ordre des mots-clés.** Signature : `async throws`. Appel : `try await`. Inverser ne compile pas.

---

## Exercice

Crée une enum `LoginError: Error, LocalizedError` avec au moins 3 cas réalistes (`wrongPassword`, `accountLocked`, `network`). Implémente `errorDescription` pour que chaque cas renvoie un message clair et actionnable destiné à l'utilisateur (pas un jargon technique). Bonus : écris une fonction `func login(email: String, password: String) async throws -> Void` qui `throw` un de ces cas selon des conditions bidon, et appelle-la dans un `do-catch` qui affecte `error.localizedDescription` à une variable `var uiMessage`.

---

## Question d'entretien

**« Result ou async throws : lequel choisis-tu en 2026, et pourquoi ? »**
> `async throws` par défaut. C'est la norme depuis Swift Concurrency : code linéaire (pas de pyramide de callbacks), propagation gratuite de l'erreur, et intégration native avec `Task`/`@MainActor`. Je réserve `Result` aux ponts avec du code legacy : SDK à completion handler, Combine, ou quand je veux stocker un succès-ou-échec comme une *valeur* (ex : dans un cache ou un état). Et je sais convertir l'un en l'autre via `withCheckedThrowingContinuation` ou `result.get()`.

**« Quelle différence entre `try?` et `try!` ? »**
> `try?` transforme l'échec en `nil` (l'erreur est perdue) — pour un échec sans conséquence. `try!` affirme que l'appel ne peut pas échouer ici et **crashe** sinon — réservé aux invariants (ressource du bundle, regex littérale), jamais sur du réseau ou une entrée utilisateur.

**« À quoi sert `LocalizedError` ? »**
> À fournir le texte renvoyé par `localizedDescription` via `errorDescription`. Ça permet de produire un message lisible par défaut. Mais comme il n'est appelé que sur tes propres types, je double toujours d'une fonction de mapping qui gère aussi les `URLError` et autres erreurs système pour ne jamais afficher de code technique.

---

## Résumé

- `Error` est un protocole marqueur ; une `enum` avec valeurs associées est le choix idiomatique pour une erreur typée.
- `throws` rend la gestion d'erreur **obligatoire** (contrairement au `NSError**` ignorable d'UIKit) ; `do-catch` fait du pattern matching.
- `try` propage, `try?` réduit à `nil` (et perd l'erreur), `try!` crashe — `try?` silencieux est un anti-pattern dès qu'un humain doit comprendre l'échec.
- `async throws` (`try await`) est la norme moderne ; `Result` reste utile pour callbacks legacy/Combine, et on convertit via `withCheckedThrowingContinuation` / `.get()`.
- Ne jamais montrer une erreur technique (`URLError -1009`) à l'utilisateur : mappe vers un message **actionnable**, via `LocalizedError.errorDescription` + une fonction `message(for:)` qui couvre aussi les erreurs système.
- `typed throws` (Swift 6, `throws(MonError)`) donne une erreur typée au `catch` ; utile pour un domaine d'erreur fermé, `throws` simple reste le défaut en app.
