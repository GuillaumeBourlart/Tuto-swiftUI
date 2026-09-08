# Fiche 14.06 — Tester l'async réel : spies et URLProtocol mock

## Objectif

Vérifier l'**interaction** (qui a appelé quoi, avec quels arguments, combien de fois) avec des spies, tester la séquence d'états `idle → loading → loaded/error`, et intercepter le vrai réseau avec un `URLProtocol` custom pour tester ton `APIClient` sans serveur. Le tout en async, avec Swift Testing (`confirmation`) et XCTest (`expectation`).

## 1. Stub vs Mock vs Spy : la distinction qui compte en entretien

En UIKit comme en SwiftUI, un mock qui renvoie juste une valeur (un **stub**) teste le *résultat*. Un **spy** enregistre les appels pour tester l'*interaction* : "est-ce que le ViewModel a bien appelé `logout()` une seule fois ?".

```text
Stub  → renvoie une valeur figée (vérifie le RÉSULTAT)
Spy   → enregistre callCount / arguments reçus (vérifie l'INTERACTION)
Mock  → stub + spy : configure un retour ET enregistre les appels
```

Tu testes l'interaction quand le résultat seul ne prouve rien : envoi d'analytics, invalidation d'un cache, déconnexion, appel d'un endpoint précis.

## 2. Un spy qui enregistre les appels

Le protocole d'abord (tu fais déjà ça en UIKit avec tes protocols de service) :

```swift
struct Credentials: Equatable {
    let email: String
    let password: String
}

protocol AuthServicing {
    func login(email: String, password: String) async throws -> String // token
    func logout() async
}
```

Le spy enregistre **callCount**, **lastArguments** et la liste **receivedMessages**. Le suffixe convention : `…Spy`.

```swift
final class AuthServiceSpy: AuthServicing {
    // Enregistrement des appels
    private(set) var loginCallCount = 0
    private(set) var lastCredentials: Credentials?
    private(set) var receivedMessages: [Message] = []

    enum Message: Equatable { case login(Credentials), logout }

    // Retour configurable (partie "stub" du mock)
    var stubbedToken = "token-123"
    var stubbedError: Error?

    func login(email: String, password: String) async throws -> String {
        loginCallCount += 1
        let creds = Credentials(email: email, password: password)
        lastCredentials = creds
        receivedMessages.append(.login(creds))
        if let stubbedError { throw stubbedError }
        return stubbedToken
    }

    func logout() async {
        receivedMessages.append(.logout)
    }
}
```

Réflexe UIKit : avant, tu mettais un `var loginWasCalled = false` à la main dans chaque mock. Ici on garde la même idée, mais structurée (`callCount`, `lastArguments`, `receivedMessages`) pour des assertions précises.

## 3. Tester l'interaction (pas seulement le résultat)

```swift
import Testing
@testable import MyApp

@MainActor
@Test func loginEnvoieLesBonsIdentifiants() async throws {
    let spy = AuthServiceSpy()
    let viewModel = LoginViewModel(auth: spy)

    await viewModel.login(email: "a@b.com", password: "secret")

    #expect(spy.loginCallCount == 1)
    #expect(spy.lastCredentials == Credentials(email: "a@b.com", password: "secret"))
    #expect(spy.receivedMessages == [.login(.init(email: "a@b.com", password: "secret"))])
}
```

`receivedMessages` capture aussi l'**ordre** et l'**absence** d'appels parasites : si le ViewModel appelait `logout()` par erreur après un login, le tableau ne matcherait plus.

> En XCTest, c'est la même logique : `XCTAssertEqual(spy.loginCallCount, 1)`.

## 4. Tester la séquence d'états idle → loading → loaded/error

Un piège classique : tu assertes l'état *final* (`.loaded`) mais tu ne vérifies jamais que `.loading` est bien passé. Avec un service à délai contrôlé, on capture chaque transition.

Le ViewModel moderne en `@Observable` (pas `ObservableObject`) :

```swift
import Observation

protocol UsersServicing {
    func fetchUsers() async throws -> [String]
}

enum LoadState: Equatable {
    case idle, loading, loaded([String]), error(String)
}

@MainActor
@Observable
final class UsersViewModel {
    private(set) var state: LoadState = .idle
    private let service: UsersServicing

    init(service: UsersServicing) { self.service = service }

    func load() async {
        state = .loading
        do {
            state = .loaded(try await service.fetchUsers())
        } catch {
            state = .error("Impossible de charger les utilisateurs.")
        }
    }
}
```

Pour observer la transition, on enregistre les états dans une `Task` parallèle via `withObservationTracking`, ou plus simplement on snapshot l'état pendant que le service est suspendu. Le plus lisible : un service qui se met en pause sur un signal.

```swift
actor GatedUsersService: UsersServicing {
    private var continuation: CheckedContinuation<Void, Never>?
    var stubbedUsers: [String] = ["Guillaume", "Sarah"]

    func fetchUsers() async throws -> [String] {
        await withCheckedContinuation { continuation = $0 } // suspend
        return stubbedUsers
    }

    func resume() { continuation?.resume(); continuation = nil }
}
```

```swift
@MainActor
@Test func loadPasseParLoadingPuisLoaded() async {
    let service = GatedUsersService()
    let vm = UsersViewModel(service: service)

    let task = Task { await vm.load() }
    await Task.yield()                       // laisse load() démarrer

    #expect(vm.state == .loading)            // état intermédiaire capturé

    await service.resume()
    await task.value

    #expect(vm.state == .loaded(["Guillaume", "Sarah"]))
}
```

Pour le chemin erreur, même structure mais le service throw au lieu de renvoyer : tu assertes `.loading` puis `.error(...)`.

## 5. URLProtocol mock : intercepter le vrai réseau sans serveur

C'est LA technique pro pour tester un `APIClient` basé sur `URLSession`. Tu enregistres un `URLProtocol` custom dans une `URLSessionConfiguration` éphémère : toutes les requêtes de cette session passent par ton code, qui renvoie data + statusCode + erreur à volonté. **Aucun appel réseau réel.**

```swift
final class URLProtocolMock: URLProtocol {
    // Handler injecté par le test : décide quoi répondre selon la requête
    nonisolated(unsafe) static var requestHandler: (@Sendable (URLRequest) throws -> (HTTPURLResponse, Data))?

    override class func canInit(with request: URLRequest) -> Bool { true }
    override class func canonicalRequest(for request: URLRequest) -> URLRequest { request }

    override func startLoading() {
        guard let handler = Self.requestHandler else {
            client?.urlProtocol(self, didFailWithError: URLError(.badServerResponse))
            return
        }
        do {
            let (response, data) = try handler(request)
            client?.urlProtocol(self, didReceive: response, cacheStoragePolicy: .notAllowed)
            client?.urlProtocol(self, didLoad: data)
            client?.urlProtocolDidFinishLoading(self)
        } catch {
            client?.urlProtocol(self, didFailWithError: error)
        }
    }

    override func stopLoading() {}
}
```

La session de test, montée sur une config éphémère qui ne touche ni le cache ni les cookies :

```swift
extension URLSession {
    static func mocked() -> URLSession {
        let config = URLSessionConfiguration.ephemeral
        config.protocolClasses = [URLProtocolMock.self]
        return URLSession(configuration: config)
    }
}
```

## 6. Tester l'APIClient via URLProtocol

L'`APIClient` réel reçoit sa `URLSession` par injection (jamais `URLSession.shared` en dur — sinon intestable) :

```swift
struct User: Decodable, Equatable { let id: Int; let name: String }

enum APIError: Error, Equatable { case badStatus(Int), decoding }

struct APIClient {
    let session: URLSession

    func fetchUsers() async throws -> [User] {
        let url = URL(string: "https://api.example.com/users")!
        let (data, response) = try await session.data(from: url)
        guard let http = response as? HTTPURLResponse else { throw URLError(.badServerResponse) }
        guard (200...299).contains(http.statusCode) else { throw APIError.badStatus(http.statusCode) }
        do { return try JSONDecoder().decode([User].self, from: data) }
        catch { throw APIError.decoding }
    }
}
```

Test du cas succès :

```swift
@Test func fetchUsersDecodeLaReponse200() async throws {
    URLProtocolMock.requestHandler = { request in
        #expect(request.url?.path == "/users")     // on vérifie aussi la requête sortante
        let json = #"[{"id":1,"name":"Guillaume"}]"#.data(using: .utf8)!
        let response = HTTPURLResponse(url: request.url!, statusCode: 200,
                                       httpVersion: nil, headerFields: nil)!
        return (response, json)
    }

    let client = APIClient(session: .mocked())
    let users = try await client.fetchUsers()

    #expect(users == [User(id: 1, name: "Guillaume")])
}
```

Test du cas erreur HTTP, sans changer une ligne de l'`APIClient` :

```swift
@Test func fetchUsersMappe500EnBadStatus() async {
    URLProtocolMock.requestHandler = { request in
        let response = HTTPURLResponse(url: request.url!, statusCode: 500,
                                       httpVersion: nil, headerFields: nil)!
        return (response, Data())
    }

    let client = APIClient(session: .mocked())

    await #expect(throws: APIError.badStatus(500)) {
        try await client.fetchUsers()
    }
}
```

Réflexe UIKit : avant tu injectais peut-être une `URLSession` sous-classée ou un protocole `NetworkSession` maison. `URLProtocol` est plus propre car tu testes le **vrai** `URLSession.data(from:)` (donc le vrai décodage, le vrai mapping de statut), pas une couche que tu as réécrite.

## 7. Async en test : confirmation() et XCTestExpectation

Quand le code ne s'`await` pas directement (callback, notification, `@Observable` qui mute via une `Task` interne), il faut **attendre un événement**.

Swift Testing — `confirmation` (compte les occurrences attendues) :

```swift
@Test func leCompletionEstAppeleUneFois() async {
    await confirmation("completion appelé") { confirm in
        await withCheckedContinuation { cont in
            doWorkWithCallback {
                confirm()        // doit être appelé exactement 1 fois (défaut)
                cont.resume()
            }
        }
    }
}
```

XCTest — l'équivalent que tu connais, `XCTestExpectation` :

```swift
func testCallbackEstAppele() {
    let expectation = expectation(description: "callback")
    doWorkWithCallback {
        expectation.fulfill()
    }
    wait(for: [expectation], timeout: 1)
}
```

`confirmation` vérifie aussi le **nombre** d'appels (`expectedCount:`), ce qui en fait un mini-spy intégré : `confirmation(expectedCount: 0)` prouve qu'un callback n'est *jamais* appelé.

## 8. Quoi tester en priorité sur une app client

Tu n'es pas QA d'Apple. Ne teste pas que `List` affiche des lignes ou que `NavigationStack` pousse un écran — c'est le boulot d'Apple, et ces tests sont fragiles et sans valeur.

```text
Priorité HAUTE   → logique métier (calculs, règles, validation)
Priorité HAUTE   → mapping des erreurs (500 → APIError, decoding → message user)
Priorité HAUTE   → ViewModels (transitions d'état, interactions service)
Priorité MOYENNE → parsing/décodage (Decodable de payloads réels)
Priorité BASSE   → l'UI SwiftUI elle-même (laisse ça aux previews / snapshot tests si besoin)
```

## Points à connaître

- **`URLProtocolMock.requestHandler` est statique et partagé** : remets-le à `nil` entre les tests (ou utilise une session dédiée par test) pour éviter qu'un test pollue le suivant. Avec XCTest, fais-le en `tearDown`.
- **Config `.ephemeral` obligatoire** : une config par défaut peut servir du cache et te donner un faux succès. `.ephemeral` ne persiste rien.
- **N'injecte jamais `URLSession.shared` en dur** dans ton `APIClient` : sans injection, `URLProtocol` ne peut pas s'insérer et le code est intestable.
- **`await Task.yield()` ≠ délai** : il rend la main une fois pour laisser une autre tâche démarrer. Pour capturer un état `.loading`, c'est plus fiable qu'un `Task.sleep` qui introduit du flaky.
- **Spy ≠ stub** : si ton test n'asserte que le résultat, un stub suffit. Sors le spy quand l'interaction *est* le comportement à prouver.

## Exercice

Dans un projet de test, fais les deux :

1. Écris un `AuthServiceSpy` conforme à `AuthServicing` (login + logout) qui enregistre `loginCallCount`, `lastCredentials` et `receivedMessages`. Écris un `@Test` qui appelle un `LoginViewModel`, vérifie que `login` est appelé **une seule fois** avec les bons identifiants, et qu'`aucun logout` n'a eu lieu.
2. Écris un `URLProtocolMock` + `URLSession.mocked()`, puis un `@Test` qui fait renvoyer un JSON valide en 200 à `APIClient.fetchUsers()` et asserte le décodage, plus un second test qui renvoie un 404 et asserte `APIError.badStatus(404)` via `await #expect(throws:)`.

Faisable en 15-20 min en repartant des blocs des sections 2, 5 et 6.

## Question d'entretien

**Q : Comment testes-tu du code réseau sans appeler le vrai serveur ?**
R : J'injecte une `URLSession` configurée avec un `URLProtocol` custom sur une `URLSessionConfiguration.ephemeral`. Le protocol intercepte chaque requête et renvoie data, statusCode ou erreur à la demande. Ça teste le vrai `URLSession.data(from:)`, donc le vrai décodage et le vrai mapping d'erreurs, sans réseau, sans flaky, et en quelques millisecondes. Je remets le handler à `nil` entre les tests pour éviter les fuites d'état.

**Q : Différence entre un stub et un spy ?**
R : Un stub renvoie une valeur figée pour tester le *résultat*. Un spy enregistre les appels (`callCount`, arguments, ordre) pour tester l'*interaction* — par exemple prouver que le ViewModel a appelé `logout()` exactement une fois et rien d'autre. Un mock combine les deux.

**Q : Comment vérifies-tu qu'un ViewModel passe bien par l'état `.loading` ?**
R : Je rends le service contrôlable (il se suspend sur une `continuation` ou un signal). Je lance `load()` dans une `Task`, je fais `await Task.yield()` pour la laisser démarrer, j'asserte `.loading` pendant que le service est suspendu, puis je le débloque et j'asserte l'état final. Asserter seulement l'état final raterait une transition cassée.

## Résumé

- Un **spy** enregistre `callCount` / `lastArguments` / `receivedMessages` pour tester l'**interaction**, pas seulement le résultat.
- Teste la **séquence d'états** (`loading` inclus) avec un service à délai/résultat contrôlé, pas juste l'état final.
- **`URLProtocolMock` + config `.ephemeral`** intercepte le réseau : tu testes l'`APIClient` réel (data, statusCode, erreur) sans serveur.
- Async sans `await` direct : **`confirmation`** (Swift Testing) ou **`XCTestExpectation`** (XCTest) ; `confirmation` vérifie aussi le nombre d'appels.
- Priorise **logique métier, mapping d'erreurs et ViewModels** ; ne teste pas l'UI d'Apple.
- Toujours **injecter** la `URLSession` et **réinitialiser** le handler statique entre les tests.
