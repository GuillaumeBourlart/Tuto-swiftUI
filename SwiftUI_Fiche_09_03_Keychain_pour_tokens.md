# Fiche 09.03 — Keychain pour tokens

## Objectif

Comprendre pourquoi et comment stocker les tokens d’authentification dans le Keychain.

Le Keychain est l’endroit adapté pour les données sensibles côté iOS.

## 1. Pourquoi le Keychain ?

Quand une API REST renvoie un `accessToken` et un `refreshToken`, il faut les conserver pour garder l’utilisateur connecté.

Mauvaise idée :

```swift
UserDefaults.standard.set(accessToken, forKey: "accessToken")
```

Bonne idée :

```text
access token → Keychain
refresh token → Keychain
logout → suppression Keychain
```

## 2. Créer un service Keychain simple

En vrai projet, tu peux utiliser une librairie ou encapsuler l’API Keychain dans un service.

```swift
import Foundation
import Security

final class KeychainService {
    func save(_ value: String, for key: String) {
        let data = Data(value.utf8)
        
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
            kSecValueData as String: data
        ]
        
        SecItemDelete(query as CFDictionary) // remplace l’ancienne valeur si elle existe
        SecItemAdd(query as CFDictionary, nil)
    }
    
    func read(for key: String) -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]
        
        var item: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &item)
        
        guard status == errSecSuccess,
              let data = item as? Data else {
            return nil
        }
        
        return String(data: data, encoding: .utf8)
    }
    
    func delete(for key: String) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key
        ]
        
        SecItemDelete(query as CFDictionary)
    }
}
```

Ce code est volontairement simple pour comprendre le principe.

## 3. Centraliser les clés

```swift
enum KeychainKeys {
    static let accessToken = "accessToken"
    static let refreshToken = "refreshToken"
}
```

Utilisation :

```swift
let keychain = KeychainService()

keychain.save("abc123", for: KeychainKeys.accessToken)
let token = keychain.read(for: KeychainKeys.accessToken)
keychain.delete(for: KeychainKeys.accessToken)
```

## 4. Exemple dans un AuthService

```swift
final class AuthTokenStore {
    private let keychain = KeychainService()
    
    var accessToken: String? {
        keychain.read(for: KeychainKeys.accessToken)
    }
    
    var refreshToken: String? {
        keychain.read(for: KeychainKeys.refreshToken)
    }
    
    func saveTokens(accessToken: String, refreshToken: String) {
        keychain.save(accessToken, for: KeychainKeys.accessToken)
        keychain.save(refreshToken, for: KeychainKeys.refreshToken)
    }
    
    func clearTokens() {
        keychain.delete(for: KeychainKeys.accessToken)
        keychain.delete(for: KeychainKeys.refreshToken)
    }
}
```

Le ViewModel n’a pas besoin de connaître les détails du Keychain.

## 5. Flux classique avec tokens

```text
Login
→ API renvoie accessToken + refreshToken
→ AuthService sauvegarde les tokens dans Keychain
→ APIClient ajoute Authorization: Bearer accessToken
→ si token expiré, refresh avec refreshToken
→ logout supprime les tokens
```

## Points à connaître

Le Keychain est plus verbeux que UserDefaults, mais il est fait pour les secrets.

Dans une app professionnelle, tu peux utiliser une petite librairie Keychain ou un wrapper interne déjà fourni par l’équipe.

## Résumé

- Les tokens ne vont jamais dans UserDefaults.
- Le Keychain sert aux données sensibles.
- Il faut encapsuler le Keychain dans un service.
- Au logout, les tokens doivent être supprimés.
- Le reste de l’app doit passer par un `AuthTokenStore` ou un `AuthService`.
