# Fiche 06.08 — Les principes SOLID en Swift

## Objectif

Savoir nommer et expliquer les 5 principes SOLID avec un exemple Swift court chacun. En entretien, on ne te demande pas de réciter la théorie : on veut que tu montres que ton code MVVM/services/DI les applique déjà.

## 1. Pourquoi SOLID

SOLID, ce sont 5 principes d'architecture orientée objet qui rendent le code **maintenable, testable et évolutif**. Tu en appliques déjà la plupart sans le savoir via MVVM + injection de dépendances (Partie 06). Cette fiche met juste les mots dessus.

```text
S — Single Responsibility
O — Open/Closed
L — Liskov Substitution
I — Interface Segregation
D — Dependency Inversion
```

## 2. S — Single Responsibility Principle

Une classe/type a **une seule raison de changer**.

Pas idéal — un ViewModel qui fait TOUT (réseau + parsing + persistance) :

```swift
@Observable
final class ProfileViewModel {
    func load() async {
        // ❌ fait l'appel réseau, décode le JSON, sauvegarde en base...
    }
}
```

Préférable — chaque responsabilité dans son type :

```swift
@Observable
final class ProfileViewModel {
    private let service: ProfileServicing   // réseau
    private let store: ProfileStoring       // persistance
    // le ViewModel orchestre, il ne fait pas tout lui-même
}
```

Pont UIKit : c'est la même logique qui faisait sortir le code d'un `UIViewController` massif (« Massive View Controller »).

## 3. O — Open/Closed Principle

Un type doit être **ouvert à l'extension, fermé à la modification** : on ajoute un comportement sans réécrire l'existant.

```swift
protocol PaymentMethod {
    func pay(amount: Decimal) async throws
}

struct ApplePay: PaymentMethod { /* ... */ }
struct CreditCard: PaymentMethod { /* ... */ }
// Ajouter PayPal = nouveau type, sans toucher au code qui consomme PaymentMethod.
```

Le `switch` géant sur un type qu'il faut éditer à chaque nouveau cas est l'anti-pattern typique.

## 4. L — Liskov Substitution Principle

Un sous-type doit pouvoir **remplacer** son type parent **sans casser** le comportement attendu. Concrètement : un mock qui conforme à un protocole doit se comporter comme une vraie implémentation (mêmes contrats : ne pas lancer une erreur là où l'original n'en lance jamais).

```swift
protocol ImageLoader {
    func load(_ url: URL) async throws -> Data
}
// MockImageLoader et NetworkImageLoader doivent être interchangeables
// partout où on attend un ImageLoader.
```

## 5. I — Interface Segregation Principle

Mieux vaut **plusieurs petits protocoles ciblés** qu'un gros protocole fourre-tout que personne n'implémente entièrement.

Pas idéal :

```swift
protocol Repository {
    func fetch() async throws -> [Item]
    func save(_ item: Item) async throws
    func delete(_ id: UUID) async throws
    func sync() async throws        // ❌ tout le monde n'en a pas besoin
}
```

Préférable :

```swift
protocol ItemReading { func fetch() async throws -> [Item] }
protocol ItemWriting { func save(_ item: Item) async throws }
// Un type read-only ne conforme qu'à ItemReading.
```

## 6. D — Dependency Inversion Principle

Les modules de haut niveau (ViewModel) dépendent d'**abstractions** (protocoles), pas d'implémentations concrètes. C'est exactement ton injection de dépendances.

```swift
@Observable
final class LoginViewModel {
    private let auth: AuthServicing          // abstraction
    init(auth: AuthServicing) { self.auth = auth }   // injectée
}
// En prod : AuthService réel. En test : AuthServiceMock. Le ViewModel ne change pas.
```

C'est ce qui rend le code **testable** : tu remplaces la dépendance par un mock.

## Points à connaître

- SOLID n'est pas une religion : applique-les pour réduire le couplage, pas pour multiplier les protocoles inutiles.
- DIP + ISP sont les plus visibles en entretien iOS, car ils permettent les **tests unitaires** (mocks via protocoles).
- En SwiftUI, le « S » se traduit souvent par : View affiche, ViewModel décide, Service fait l'I/O.

## Exercice

Prends un ViewModel qui fait à la fois l'appel réseau, le décodage et la sauvegarde locale. Découpe-le en respectant **S** (un service réseau, un store) et **D** (injecte les deux via protocoles). Vérifie que tu peux maintenant le tester avec deux mocks.

## Question d'entretien

> **« Peux-tu expliquer SOLID avec un exemple iOS ? »**
> Réponse modèle : « Le plus important au quotidien, c'est le **S** (un ViewModel qui orchestre, des services dédiés pour réseau/persistance) et le **D** : mes ViewModels dépendent de protocoles injectés, pas de classes concrètes, ce qui me permet d'injecter des mocks et de tout tester unitairement. **O/I/L** complètent : j'étends par de nouveaux types conformes à un protocole plutôt que d'éditer un gros switch, et je préfère plusieurs petits protocoles. »

## Résumé

- **S** : une seule responsabilité par type (View / ViewModel / Service).
- **O** : étendre via de nouveaux types conformes à un protocole, pas en modifiant l'existant.
- **L** : un mock/sous-type doit être interchangeable avec l'original.
- **I** : des protocoles petits et ciblés plutôt qu'un gros.
- **D** : dépendre d'abstractions (protocoles injectés) → code testable.
- Tu appliques déjà SOLID via MVVM + DI ; cette fiche te donne le vocabulaire pour le **prouver** en entretien.
