# Fiche 06.05 — Clean Architecture version simple

## Objectif

Comprendre le principe de Clean Architecture sans entrer dans une version senior trop lourde. Le but est de savoir lire une architecture propre et expliquer le flux d’une feature.

## 1. L’idée à comprendre

Clean Architecture cherche à séparer :

- l’interface utilisateur ;
- la logique métier ;
- les sources de données ;
- les détails techniques comme API, Firebase, Core Data.

L’idée principale : le cœur de l’app ne doit pas dépendre directement des détails techniques.

## 2. Les couches simples

Version simplifiée :

```text
Presentation
→ View + ViewModel

Domain
→ Entity + UseCase + RepositoryProtocol

Data
→ RepositoryImpl + DTO + Mapper + DataSource

Core
→ APIClient + Keychain + Firebase config + Logger
```

Tu n’as pas besoin de tout créer pour chaque écran. Mais il faut comprendre le rôle de chaque couche.

## 3. Flux exemple login

```text
LoginView
→ LoginViewModel
→ LoginUseCase
→ AuthRepositoryProtocol
→ AuthRepositoryImpl
→ AuthRemoteDataSource
→ URLSession / Alamofire / Firebase
```

La View ne parle pas directement à Firebase ou à l’API.

## 4. Entity

Une Entity représente un modèle métier simple.

```swift
struct User: Equatable {
    let id: String
    let email: String
    let displayName: String?
}
```

Elle ne doit pas dépendre de Firebase, Alamofire ou Core Data.

## 5. UseCase

Un UseCase représente une action métier.

```swift
protocol LoginUseCaseProtocol {
    func execute(email: String, password: String) async throws -> User
}

final class LoginUseCase: LoginUseCaseProtocol {
    private let repository: AuthRepositoryProtocol

    init(repository: AuthRepositoryProtocol) {
        self.repository = repository
    }

    func execute(email: String, password: String) async throws -> User {
        try await repository.login(email: email, password: password)
    }
}
```

Pour une petite app, le UseCase peut sembler inutile. Il devient utile quand la logique métier grossit.

## 6. Repository protocol

```swift
protocol AuthRepositoryProtocol {
    func login(email: String, password: String) async throws -> User
    func logout() async throws
}
```

Le ViewModel ou le UseCase dépend de ce protocole, pas d’une API concrète.

## 7. Repository implementation

```swift
final class AuthRepository: AuthRepositoryProtocol {
    private let remoteDataSource: AuthRemoteDataSourceProtocol

    init(remoteDataSource: AuthRemoteDataSourceProtocol) {
        self.remoteDataSource = remoteDataSource
    }

    func login(email: String, password: String) async throws -> User {
        let dto = try await remoteDataSource.login(email: email, password: password)
        return User(id: dto.id, email: dto.email, displayName: dto.displayName)
    }

    func logout() async throws {
        try await remoteDataSource.logout()
    }
}
```

Le repository peut transformer un DTO technique en modèle métier.

## 8. DTO et mapper

```swift
struct UserDTO: Decodable {
    let id: String
    let email: String
    let displayName: String?
}
```

Le DTO correspond souvent à la réponse API.

Le modèle `User` correspond à ce que l’app veut vraiment utiliser.

## 9. Quand utiliser Clean Architecture ?

Utile si :

- app moyenne ou grande ;
- beaucoup de logique métier ;
- besoin de tests ;
- plusieurs sources de données ;
- équipe de plusieurs développeurs.

Trop lourd si :

- prototype ;
- petit projet solo ;
- écran très simple ;
- logique faible.

## Résumé

- Clean Architecture sépare UI, métier, data et technique.
- `Presentation` contient View + ViewModel.
- `Domain` contient Entity, UseCase, RepositoryProtocol.
- `Data` contient RepositoryImpl, DTO, Mapper, DataSource.
- `Core` contient APIClient, Keychain, Logger, config.
- Pour ton niveau, il faut surtout comprendre le flux et savoir lire ce type de structure.
