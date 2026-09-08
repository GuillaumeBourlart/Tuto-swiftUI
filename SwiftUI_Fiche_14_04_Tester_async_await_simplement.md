# Fiche 14.04 — Tester async/await simplement

## Objectif

Savoir écrire un test unitaire pour du code `async/await`.

Aujourd’hui, beaucoup de code iOS moderne utilise `async/await` pour le réseau, Firebase, les services et les ViewModels.

## 1. Test async minimal

Un test peut être marqué `async`.

```swift
import XCTest
@testable import MyApp

final class AsyncTests: XCTestCase {
    func testAsyncFunction() async throws {
        let result = try await loadValue()
        XCTAssertEqual(result, "OK")
    }
}
```

Si la fonction peut lancer une erreur, le test peut être `async throws`.

## 2. Service async à tester

```swift
struct Product: Equatable {
    let id: Int
    let name: String
}

protocol ProductServicing {
    func fetchProducts() async throws -> [Product]
}
```

Mock :

```swift
struct ProductServiceMock: ProductServicing {
    func fetchProducts() async throws -> [Product] {
        [
            Product(id: 1, name: "iPhone"),
            Product(id: 2, name: "MacBook")
        ]
    }
}
```

Test :

```swift
final class ProductServiceTests: XCTestCase {
    func testFetchProductsReturnsProducts() async throws {
        let service = ProductServiceMock()

        let products = try await service.fetchProducts()

        XCTAssertEqual(products.count, 2)
        XCTAssertEqual(products.first?.name, "iPhone")
    }
}
```

## 3. Tester une erreur async

```swift
enum APIError: Error, Equatable {
    case unauthorized
}

struct FailingProductServiceMock: ProductServicing {
    func fetchProducts() async throws -> [Product] {
        throw APIError.unauthorized
    }
}
```

Test :

```swift
final class ProductServiceErrorTests: XCTestCase {
    func testFetchProductsThrowsUnauthorized() async {
        let service = FailingProductServiceMock()

        do {
            _ = try await service.fetchProducts()
            XCTFail("Le service aurait dû lancer une erreur.")
        } catch let error as APIError {
            XCTAssertEqual(error, .unauthorized)
        } catch {
            XCTFail("Erreur inattendue : \(error)")
        }
    }
}
```

## 4. Tester un ViewModel async

```swift
@MainActor
final class ProductsViewModel: ObservableObject {
    @Published private(set) var products: [Product] = []
    @Published private(set) var isLoading = false

    private let service: ProductServicing

    init(service: ProductServicing) {
        self.service = service
    }

    func load() async {
        isLoading = true
        defer { isLoading = false }

        do {
            products = try await service.fetchProducts()
        } catch {
            products = []
        }
    }
}
```

Test :

```swift
@MainActor
final class ProductsViewModelTests: XCTestCase {
    func testLoadProducts() async {
        let viewModel = ProductsViewModel(service: ProductServiceMock())

        await viewModel.load()

        XCTAssertFalse(viewModel.isLoading)
        XCTAssertEqual(viewModel.products.count, 2)
    }
}
```

## 5. Points à connaître

Utilise `@MainActor` dans les tests si le ViewModel est `@MainActor`.

Évite les vraies attentes réseau dans les tests unitaires. Injecte un mock.

Pour tester un code async, le plus simple est souvent :

```text
préparer le mock → appeler await → vérifier le résultat
```

## Résumé

- Un test peut être `async` ou `async throws`.
- On appelle le code avec `await`.
- Les erreurs async se testent avec `do/catch`.
- Les mocks rendent les tests rapides et fiables.
