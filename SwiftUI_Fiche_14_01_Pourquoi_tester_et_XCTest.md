# Fiche 14.01 — Pourquoi tester et XCTest

## Objectif

Comprendre à quoi servent les tests dans une app iOS et connaître les bases de `XCTest`.

Le but n’est pas de tout tester, mais de savoir tester la logique importante : validation, ViewModel, services, parsing, erreurs.

## 1. Pourquoi tester ?

Un test sert à vérifier automatiquement qu’une partie du code fonctionne encore après une modification.

Exemples utiles :

- un formulaire valide correctement un email ;
- un ViewModel passe en état `loading`, puis `loaded` ;
- un service renvoie une erreur si l’API échoue ;
- un token est supprimé au logout ;
- une fonction de calcul renvoie le bon résultat.

Les tests rassurent l’équipe et évitent de casser une fonctionnalité sans s’en rendre compte.

## 2. Types de tests utiles au début

```text
Tests unitaires → testent une petite logique isolée
Tests ViewModel → testent les états et actions
Tests services → testent avec mock/fake
Tests UI → testent l’interface complète, plus lourds
```

Pour ton niveau, les plus importants sont : tests unitaires, ViewModel et services.

## 3. Créer un test XCTest

Un fichier de test ressemble à ça :

```swift
import XCTest
@testable import MyApp

final class EmailValidatorTests: XCTestCase {
    func testValidEmailReturnsTrue() {
        let result = EmailValidator.isValid("test@mail.com")
        XCTAssertTrue(result)
    }
}
```

`@testable import MyApp` permet au target de test d’accéder au code de l’app.

## 4. Exemple de code à tester

```swift
enum EmailValidator {
    static func isValid(_ email: String) -> Bool {
        email.contains("@") && email.contains(".")
    }
}
```

Tests :

```swift
final class EmailValidatorTests: XCTestCase {
    func testValidEmail() {
        XCTAssertTrue(EmailValidator.isValid("user@test.com"))
    }

    func testInvalidEmailWithoutAt() {
        XCTAssertFalse(EmailValidator.isValid("usertest.com"))
    }

    func testInvalidEmailWithoutDot() {
        XCTAssertFalse(EmailValidator.isValid("user@test"))
    }
}
```

## 5. Assertions fréquentes

```swift
XCTAssertTrue(value)
XCTAssertFalse(value)
XCTAssertEqual(result, expected)
XCTAssertNil(value)
XCTAssertNotNil(value)
XCTAssertThrowsError(try function())
XCTFail("Message d’erreur")
```

Exemple :

```swift
XCTAssertEqual(user.name, "Guillaume")
```

## 6. Ce qu’il faut tester en priorité

Teste d’abord ce qui peut casser l’app ou coûter cher :

- validation login/register ;
- ViewModel avec état `loading/error` ;
- mapping DTO → Model ;
- logique de session ;
- service avec réponse API simulée ;
- stockage/suppression de token.

Tu n’as pas besoin de tester chaque `Text`, `Button` ou `.padding()`.

## Résumé

- Les tests vérifient automatiquement que la logique fonctionne.
- `XCTestCase` est la base des tests unitaires iOS.
- Les assertions comparent le résultat attendu et le résultat obtenu.
- Priorité : ViewModels, services, validation, auth, parsing et logique métier.
