# Fiche 00.06 — Codable en conditions réelles

## Objectif

Décoder/encoder du JSON propre et résilient avec `Codable` : renommage de clés, snake_case, dates, champs optionnels, `init(from:)` custom, séparation DTO/Model et erreurs lisibles. Pas la version « tutoriel » : la version qu'on attend en mission.

---

## 1. Le rappel UIKit → Swift moderne

En UIKit/Objective-C tu parsais souvent à la main avec `JSONSerialization` et des casts `as? [String: Any]`. Verbeux, fragile, plein de `?? ""`.

```swift
// L'ancien réflexe (à éviter aujourd'hui)
let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
let name = json?["name"] as? String ?? ""
```

`Codable` (= `Decodable & Encodable`) génère le parsing pour toi à partir du type. Trois protocoles :

- `Decodable` : JSON → struct (le plus courant, réponses API).
- `Encodable` : struct → JSON (corps de requête POST).
- `Codable` : les deux.

```swift
struct User: Codable {
    let id: Int
    let name: String
}

let user = try JSONDecoder().decode(User.self, from: data)
let body = try JSONEncoder().encode(user)
```

Règle : si tu n'as besoin que de décoder, déclare `Decodable` (pas `Codable`). Ça force à réfléchir au sens des flux.

---

## 2. CodingKeys : renommer une clé

Quand une clé JSON ne correspond pas à un nom Swift idiomatique, tu déclares un enum `CodingKeys`.

```json
{ "user_id": 42, "full_name": "Sarah", "avatar_url": "https://..." }
```

```swift
struct User: Decodable {
    let id: Int
    let fullName: String
    let avatarURL: URL

    enum CodingKeys: String, CodingKey {
        case id = "user_id"
        case fullName = "full_name"
        case avatarURL = "avatar_url"
    }
}
```

Piège classique : dès que tu déclares `CodingKeys`, tu dois lister **toutes** les propriétés décodées, pas seulement celles renommées. Oublier une propriété = elle n'est plus décodée (et erreur si non optionnelle).

---

## 3. keyDecodingStrategy = .convertFromSnakeCase

Si **toute** l'API est en snake_case, ne fais pas 40 `CodingKeys` à la main. Pose la stratégie sur le décodeur.

```swift
let decoder = JSONDecoder()
decoder.keyDecodingStrategy = .convertFromSnakeCase

struct User: Decodable {
    let userId: Int      // mappé depuis "user_id"
    let fullName: String // mappé depuis "full_name"
}
```

`.convertFromSnakeCase` transforme `full_name` → `fullName` automatiquement. Tu n'écris plus de `CodingKeys` pour le simple snake_case.

À retenir : la stratégie s'applique d'abord, **puis** tes `CodingKeys` si tu en as. Donc si une clé est irrégulière (`avatar_url` → `avatarURL` et pas `avatarUrl`), tu remets un `CodingKeys` ciblé pour cette clé-là, et la stratégie gère le reste.

### Pose le décodeur une seule fois (partagé)

Anti-pattern : recréer un `JSONDecoder` configuré dans chaque appel réseau.

```swift
// Pas idéal : config dupliquée, facile à oublier
let decoder = JSONDecoder()
decoder.keyDecodingStrategy = .convertFromSnakeCase
decoder.dateDecodingStrategy = .iso8601
```

Préférable : un décodeur unique, partagé par tout l'`APIClient`.

```swift
enum JSON {
    static let decoder: JSONDecoder = {
        let d = JSONDecoder()
        d.keyDecodingStrategy = .convertFromSnakeCase
        d.dateDecodingStrategy = .iso8601
        return d
    }()

    static let encoder: JSONEncoder = {
        let e = JSONEncoder()
        e.keyEncodingStrategy = .convertToSnakeCase
        e.dateEncodingStrategy = .iso8601
        return e
    }()
}

// Usage
let user = try JSON.decoder.decode(User.self, from: data)
```

C'est l'équivalent moderne d'avoir une config réseau centralisée : une source de vérité.

---

## 4. Dates : .iso8601 et formats custom

La plupart des API REST renvoient de l'ISO 8601 (`2026-06-28T14:30:00Z`).

```swift
let decoder = JSONDecoder()
decoder.dateDecodingStrategy = .iso8601

struct Event: Decodable {
    let title: String
    let startsAt: Date   // décode "2026-06-28T14:30:00Z"
}
```

Attention : `.iso8601` **ne gère pas** les millisecondes (`...30.123Z`). Si l'API en envoie, il te faut un format custom via un `DateFormatter` ou, mieux, une closure.

```swift
let decoder = JSONDecoder()
decoder.dateDecodingStrategy = .custom { decoder in
    let container = try decoder.singleValueContainer()
    let string = try container.decode(String.self)

    let formatter = ISO8601DateFormatter()
    formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]

    guard let date = formatter.date(from: string) else {
        throw DecodingError.dataCorruptedError(
            in: container,
            debugDescription: "Date ISO8601 invalide : \(string)"
        )
    }
    return date
}
```

Pour un format vraiment maison (`"28/06/2026"`), même principe avec un `DateFormatter` dont tu fixes `locale = Locale(identifier: "en_US_POSIX")` et `timeZone`. Sans `en_US_POSIX`, un appareil configuré en calendrier non grégorien parse faux : erreur classique en prod.

---

## 5. Champs optionnels, manquants et valeurs par défaut

Trois cas distincts à ne pas confondre :

```json
{ "id": 1, "name": "Sarah" }   // "bio" absent
{ "id": 1, "name": "Sarah", "bio": null }  // "bio" présent mais null
```

**Cas optionnel** : si la propriété est `Optional`, une clé absente OU `null` donne `nil`. `Codable` gère ça gratuitement.

```swift
struct Profile: Decodable {
    let id: Int
    let name: String
    let bio: String?   // absent ou null → nil, pas d'erreur
}
```

**Valeur par défaut** : `Codable` ne sait PAS appliquer une valeur par défaut sur une clé absente automatiquement (la valeur par défaut du struct est ignorée au décodage). Il faut `decodeIfPresent` dans un `init(from:)`.

```swift
struct Settings: Decodable {
    let theme: String
    let notificationsEnabled: Bool

    enum CodingKeys: String, CodingKey {
        case theme, notificationsEnabled
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        theme = try c.decodeIfPresent(String.self, forKey: .theme) ?? "system"
        notificationsEnabled = try c.decodeIfPresent(Bool.self, forKey: .notificationsEnabled) ?? true
    }
}
```

`decodeIfPresent` renvoie `nil` si la clé est absente ou `null`, sans throw. Tu combines avec `??` pour ta valeur par défaut.

Astuce entretien : un `@propertyWrapper` `@Default` est une réponse « senior » à ce besoin, mais `decodeIfPresent` + `init(from:)` est la solution standard sans dépendance.

---

## 6. init(from:) custom et nestedContainer

Quand le JSON ne colle pas à la forme que tu veux dans ton code, tu écris `init(from:)`. Cas typique : aplatir une structure imbriquée.

```json
{
  "id": 10,
  "name": "iPhone",
  "price": { "amount": 999, "currency": "EUR" }
}
```

Tu veux un `Product` plat (`amount` et `currency` directement), pas un sous-struct.

```swift
struct Product: Decodable {
    let id: Int
    let name: String
    let amount: Int
    let currency: String

    enum CodingKeys: String, CodingKey {
        case id, name, price
    }
    enum PriceKeys: String, CodingKey {
        case amount, currency
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(Int.self, forKey: .id)
        name = try c.decode(String.self, forKey: .name)

        let price = try c.nestedContainer(keyedBy: PriceKeys.self, forKey: .price)
        amount = try price.decode(Int.self, forKey: .amount)
        currency = try price.decode(String.self, forKey: .currency)
    }
}
```

`nestedContainer` descend dans l'objet imbriqué. C'est l'outil quand l'API impose une forme que tu ne veux pas reproduire dans ton modèle.

---

## 7. DTO vs Model : sépare le réseau du domaine

Erreur fréquente en mission : utiliser le type décodé directement partout dans l'app, vues comprises. Problème : ton modèle métier devient prisonnier du JSON. L'API change une clé, et toute l'app casse.

Solution propre : un **DTO** (Data Transfer Object) qui colle au JSON, et un **Model** propre pour le domaine, reliés par un mapping.

```swift
// DTO : épouse exactement le JSON
struct UserDTO: Decodable {
    let userId: Int
    let fullName: String
    let avatarURL: URL?
    let createdAt: Date
}

// Model : ce que ton app manipule vraiment
struct User: Identifiable {
    let id: Int
    let name: String
    let avatar: URL?
    let memberSince: Date
}

// Mapping isolé dans une extension
extension UserDTO {
    func toModel() -> User {
        User(
            id: userId,
            name: fullName,
            avatar: avatarURL,
            memberSince: createdAt
        )
    }
}
```

Dans l'`APIClient` :

```swift
func fetchUser() async throws -> User {
    let (data, _) = try await URLSession.shared.data(from: url)
    let dto = try JSON.decoder.decode(UserDTO.self, from: data)
    return dto.toModel()
}
```

Bénéfices : tes vues et ViewModels (`@Observable`) ne connaissent que `User`. Le DTO absorbe les bizarreries du JSON. Tu peux même rendre le `Model` non-`Codable` du tout — il n'a aucune raison de l'être.

---

## 8. DecodingError lisible en debug

Quand ça plante, le message brut est cryptique. Centralise un log clair dans ton client réseau.

```swift
func decode<T: Decodable>(_ type: T.Type, from data: Data) throws -> T {
    do {
        return try JSON.decoder.decode(type, from: data)
    } catch let error as DecodingError {
        switch error {
        case let .keyNotFound(key, context):
            print("Clé manquante : '\(key.stringValue)' — \(context.debugDescription)")
        case let .typeMismatch(expected, context):
            print("Type incohérent (\(expected)) à \(context.codingPath.map(\.stringValue)) — \(context.debugDescription)")
        case let .valueNotFound(expected, context):
            print("Valeur null inattendue (\(expected)) à \(context.codingPath.map(\.stringValue))")
        case let .dataCorrupted(context):
            print("Données corrompues : \(context.debugDescription)")
        @unknown default:
            print("DecodingError inconnue : \(error)")
        }
        throw error
    }
}
```

Les deux erreurs que tu verras 90 % du temps :

- `keyNotFound` : une clé non-optionnelle manque → rends-la `Optional` ou ajoute un défaut.
- `typeMismatch` : l'API renvoie `"42"` (String) là où tu attends `Int`, ou un objet là où tu attends un tableau.

`context.codingPath` te donne le chemin exact dans le JSON où ça casse. C'est ton premier réflexe de debug.

---

## Points à connaître

- Dès que tu écris un `CodingKeys`, **toutes** les propriétés décodées doivent y figurer, pas seulement celles renommées — sinon elles ne sont plus décodées.
- `.convertFromSnakeCase` et tes `CodingKeys` se cumulent : la stratégie agit d'abord, le `CodingKeys` raffine les cas irréguliers (`avatar_url` → `avatarURL`).
- La valeur par défaut d'une propriété (`var x = true`) est **ignorée** au décodage : pour un défaut sur clé absente, c'est `decodeIfPresent(...) ?? défaut`.
- `.iso8601` ne gère pas les millisecondes : si l'API en envoie, passe en `.custom`. Et toujours `Locale(identifier: "en_US_POSIX")` pour les `DateFormatter` maison.
- Ne décode pas directement vers tes modèles de domaine : DTO `Decodable` + `toModel()`, ça isole l'app des changements d'API.

---

## Exercice

Décode ce JSON snake_case vers un struct `Article` propre (camelCase, `publishedAt: Date`, `summary` optionnel avec défaut `"Pas de résumé"`).

```json
{ "article_id": 7, "title": "SwiftUI", "published_at": "2026-06-28T09:00:00Z" }
```

Contraintes : utilise `.convertFromSnakeCase` et `.dateDecodingStrategy = .iso8601` sur un décodeur partagé, et gère `summary` (ici absent) sans crasher. Vérifie en imprimant l'objet décodé.

---

## Question d'entretien

**« Comment gérer un JSON dont les clés ne matchent pas tes propriétés ? »**

> Trois niveaux selon le cas. Si toute l'API est en snake_case, je pose `decoder.keyDecodingStrategy = .convertFromSnakeCase` une fois sur un décodeur partagé. Pour des clés irrégulières au cas par cas, je déclare un enum `CodingKeys: String, CodingKey` avec la valeur brute (`case id = "user_id"`). Et quand la forme du JSON diffère vraiment de mon modèle — imbrication, champs à fusionner — j'écris un `init(from:)` custom avec `container`/`nestedContainer`. En plus, je sépare souvent un DTO qui épouse le JSON d'un modèle de domaine propre, avec un `toModel()`.

**« Différence entre `decode` et `decodeIfPresent` ? »**

> `decode` throw si la clé est absente ou `null`. `decodeIfPresent` renvoie `nil` dans ces cas sans throw — je l'utilise dans un `init(from:)` pour appliquer une valeur par défaut avec `?? défaut`, parce que la valeur par défaut d'une propriété Swift est ignorée au décodage.

**« Pourquoi un décodeur partagé plutôt qu'un par appel ? »**

> Une seule source de vérité pour les stratégies (snake_case, dates), pas de config dupliquée ni oubliée, et c'est un objet léger qu'on réutilise sans coût. Je le mets en `static let` dans un namespace ou je l'injecte dans l'`APIClient`.

---

## Résumé

- `Codable = Decodable & Encodable` ; déclare juste `Decodable` quand tu ne fais que lire.
- `CodingKeys` pour renommer, `.convertFromSnakeCase` pour le snake_case global — les deux se cumulent.
- Pose un `JSONDecoder`/`JSONEncoder` configuré **une fois**, partagé (snake_case + `.iso8601`).
- Dates : `.iso8601` pour le standard, `.custom` pour les millisecondes ou les formats maison (`en_US_POSIX` obligatoire).
- Champs absents : `Optional` pour du `nil`, `decodeIfPresent ?? défaut` pour une valeur par défaut.
- `init(from:)` + `nestedContainer` quand le JSON ne colle pas à ton modèle.
- Sépare DTO (`Decodable`) et Model de domaine via `toModel()` en extension.
- En debug, catch les cas `DecodingError` (`keyNotFound`, `typeMismatch`) et lis `context.codingPath`.
