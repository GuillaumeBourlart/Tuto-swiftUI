# Fiche 07.10 — Réseau de production : refresh token réel (single-flight)

## Objectif

Gérer proprement l'expiration de l'access token côté client : une requête prend un 401, on rafraîchit le token, on rejoue la requête. Le vrai piège en prod, c'est la concurrence : 5 requêtes qui prennent un 401 en même temps ne doivent déclencher qu'**un seul** refresh. On résout ça avec un `actor` (single-flight) et un seul retry.

---

## 1. Le flux nominal

L'access token est court (15 min typiquement). Quand il expire, le serveur répond `401`. Le client a un refresh token (long, stocké au Keychain). Le flux :

```text
requête → 401 → refresh(access) → rejouer la requête → 200
                      ↳ échec → logout (le refresh token est mort)
```

En UIKit tu mettais souvent ça dans un `Alamofire RequestInterceptor` (`adapt` + `retry`). Ici on le code à la main au-dessus d'`URLSession`, avec `async/await`, ce qui rend le flux beaucoup plus lisible : pas de callback imbriqué, juste un `try await ... catch`.

---

## 2. Le vrai problème : refresh concurrents

Au lancement de l'app, tu déclenches souvent 5 appels en parallèle (profil, feed, notifs, settings, panier). Si l'access token vient d'expirer, **les 5** prennent un 401 quasi simultanément.

```swift
// PROBLÈME : chaque requête refresh de son côté
func handle401() async throws {
    let newToken = try await refresh()   // 5 appels => 5 refresh en parallèle
    // ...
}
```

Conséquences réelles :
- Le backend reçoit 5 `POST /refresh`. Beaucoup d'implémentations **invalident l'ancien refresh token** à chaque appel (rotation). Le 1er refresh marche, les 4 suivants utilisent un refresh token déjà rotaté → `401` → **logout intempestif**.
- Course de données sur le token stocké, écritures Keychain concurrentes.

**Solution : single-flight.** Un seul refresh à la fois. Si un refresh est déjà en vol, les autres requêtes **attendent son résultat** au lieu d'en lancer un nouveau.

---

## 3. L'actor TokenRefresher (single-flight)

L'idée clé : on garde la `Task` du refresh en cours. Tant qu'elle n'est pas finie, tout le monde `await` **la même** Task. Un `actor` sérialise l'accès à cet état, donc pas de data race possible.

```swift
struct TokenPair: Sendable {
    let accessToken: String
    let refreshToken: String
}

actor TokenRefresher {
    private let store: TokenStore           // lecture/écriture Keychain
    private let api: APIClient              // client "nu", sans logique d'auth
    private var inFlight: Task<TokenPair, Error>?

    init(store: TokenStore, api: APIClient) {
        self.store = store
        self.api = api
    }

    /// Renvoie un access token frais. Single-flight : un seul refresh réel à la fois.
    func validToken() async throws -> String {
        // Un refresh est déjà en cours -> on attend SON résultat.
        if let task = inFlight {
            return try await task.value.accessToken
        }

        let task = Task<TokenPair, Error> {
            // bloc effectivement exécuté une seule fois
            defer { inFlight = nil }                 // libère le slot quoi qu'il arrive
            let current = try await store.currentRefreshToken()
            let pair = try await api.refresh(refreshToken: current)
            try await store.save(pair)               // rotation persistée
            return pair
        }

        inFlight = task
        return try await task.value.accessToken
    }
}
```

Pourquoi ça marche : `inFlight = task` est posé **avant** le premier `await` du bloc. Comme l'actor sérialise `validToken()`, les appels concurrents qui arrivent ensuite voient `inFlight != nil` et tombent dans le `await task.value`. Une seule requête réseau de refresh part.

Le `defer { inFlight = nil }` tourne dans le contexte de l'actor (le closure de la Task est isolé sur l'actor car il capture `self`), donc la remise à zéro est sûre, et elle a lieu aussi bien en succès qu'en échec — sinon un refresh raté bloquerait tous les refresh futurs.

---

## 4. L'AuthenticatedAPIClient (gestion du 401 + retry unique)

Il enveloppe l'`APIClient` brut, injecte le header `Authorization`, et gère le 401 : refresh puis **un seul** rejeu.

```swift
struct AuthenticatedAPIClient {
    let api: APIClient
    let refresher: TokenRefresher
    let onLogout: @Sendable () async -> Void

    func send<T: Decodable>(_ request: URLRequest) async throws -> T {
        // 1er essai avec le token courant
        do {
            return try await sendAuthorized(request)
        } catch APIError.unauthorized {
            // 401 -> on rafraîchit (single-flight)
            do {
                _ = try await refresher.validToken()
            } catch {
                // le refresh lui-même a échoué -> session morte
                await onLogout()
                throw APIError.sessionExpired
            }
            // UN SEUL retry, avec le token frais
            return try await sendAuthorized(request)
        }
    }

    private func sendAuthorized<T: Decodable>(_ request: URLRequest) async throws -> T {
        var req = request
        let token = try await refresher.currentAccessToken()   // lit le token stocké
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        return try await api.perform(req)                      // throw APIError.unauthorized si 401
    }
}
```

Point capital : la branche `catch APIError.unauthorized` **ne se rappelle pas elle-même**. Si le retry reprend un 401, l'erreur remonte telle quelle — pas de boucle. On refresh une fois, on rejoue une fois, terminé.

> `currentAccessToken()` est une petite méthode `actor` qui lit juste le token stocké (sans déclencher de refresh), à ajouter à `TokenRefresher`.

---

## 5. Ne JAMAIS refresher la requête de refresh

Le piège classique de la boucle infinie : ton appel `POST /refresh` part **aussi** via le client authentifié → il prend un 401 → il déclenche un refresh → qui re-prend un 401 → boucle.

Règle : la requête de refresh utilise l'`APIClient` **brut**, jamais l'`AuthenticatedAPIClient`.

```swift
extension APIClient {
    // Endpoint d'auth : aucune logique de 401/retry ici.
    func refresh(refreshToken: String) async throws -> TokenPair {
        var req = URLRequest(url: baseURL.appendingPathComponent("auth/refresh"))
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.httpBody = try JSONEncoder().encode(["refresh_token": refreshToken])
        return try await perform(req)   // si 401 ici -> on laisse throw, pas de retry
    }
}
```

Dans le `TokenRefresher` (section 3), on appelle bien `api.refresh(...)` (client brut). Le single-flight et le « pas de re-refresh » se combinent : un seul refresh part, et s'il échoue il n'est pas relancé — il remonte vers le `onLogout`.

---

## Points à connaître

- **Pose `inFlight` avant le premier `await`.** Si tu fais une opération `await` *avant* d'assigner `inFlight = task`, deux appels concurrents peuvent tous deux voir `inFlight == nil` et lancer deux refresh. L'`actor` ne protège que tant que tu ne suspends pas entre la lecture et l'écriture.
- **`defer { inFlight = nil }` obligatoire en succès ET en échec.** Oublier le cas échec laisse `inFlight` rempli avec une Task morte : tous les refresh suivants attendent une Task déjà finie en erreur → plus aucune session ne se répare.
- **Un seul retry, point.** Le retry ne doit jamais se rappeler récursivement. Un 401 après refresh = vrai problème d'autorisation (token révoqué côté serveur, scope manquant) → logout, pas re-boucle.
- **Le refresh n'utilise jamais le client authentifié.** Sinon : boucle infinie. Sépare l'endpoint d'auth du reste.
- **Rends `onLogout` idempotent.** Avec le single-flight tu n'as qu'un échec de refresh, mais protège quand même : un double logout ne doit pas crasher ni naviguer deux fois.

---

## Exercice

Implémente l'`actor SingleFlightRefresher` avec une méthode `func token() async throws -> String` qui :
1. si un refresh est déjà en cours, attend et renvoie son résultat (sans relancer) ;
2. sinon, stocke la `Task` en `inFlight`, exécute le refresh, et remet `inFlight = nil` à la fin (succès comme échec).

Teste-le : lance 5 appels concurrents avec `withTaskGroup` et un compteur `actor` qui incrémente à chaque vrai appel réseau simulé (`Task.sleep(for: .seconds(0.3))`). Vérifie que le compteur vaut **1**, pas 5.

---

## Question d'entretien

**« Que se passe-t-il si 5 requêtes prennent un 401 en même temps ? »**
Sans précaution, 5 refresh partent en parallèle : avec la rotation des refresh tokens côté serveur, seul le 1er réussit, les 4 autres invalident la session → logout intempestif. La solution est le **single-flight** : un `actor` garde la `Task` du refresh en cours ; le 1er appel la crée, les 4 autres `await` la même Task. Un seul `POST /refresh` part, les 5 requêtes initiales sont rejouées avec le token frais.

**« Comment évites-tu la boucle infinie sur le 401 ? »**
Deux règles : (1) un seul retry — après refresh, je rejoue la requête une fois ; si elle reprend un 401, l'erreur remonte sans nouveau refresh ; (2) la requête de refresh elle-même passe par le client *brut*, jamais le client authentifié, donc elle ne peut pas déclencher son propre handler de 401.

**« Pourquoi un `actor` plutôt qu'un `NSLock` ou une `DispatchQueue` ? »**
L'`actor` sérialise l'accès à `inFlight` sans bloquer de thread (suspension coopérative), s'intègre naturellement à `async/await`, et garantit l'absence de data race à la compilation sous Swift 6. Un lock classique bloquerait un thread pendant tout le refresh réseau.

---

## Résumé

- Flux : `401 → refresh → rejouer → 200`, sinon `refresh échoue → logout`.
- Le danger en prod, c'est les **401 concurrents** : plusieurs refresh en parallèle invalident la session.
- **Single-flight** avec un `actor` : on mémorise la `Task` du refresh ; les appels concurrents attendent la même.
- Pose `inFlight` **avant** tout `await`, et `defer { inFlight = nil }` en succès comme en échec.
- **Un seul retry** ; la requête de refresh passe par le client **brut** pour éviter la boucle infinie.
- `AuthenticatedAPIClient` enveloppe l'`APIClient`, injecte le `Bearer` et orchestre 401 → refresh → retry → logout.
