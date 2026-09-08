# Fiche 10.01 — Session, access token, refresh token et AuthState

## Objectif

Comprendre comment une app sait si un utilisateur est connecté, comment fonctionnent les tokens, et comment gérer un état d’authentification global.

## 1. Session utilisateur

Une session représente l’état actuel de connexion de l’utilisateur.

```text
Utilisateur non connecté → LoginView
Utilisateur connecté → MainTabView
Session expirée → retour login ou refresh token
```

Dans une app SwiftUI, cet état est souvent stocké dans un `AuthState` ou `SessionManager` partagé.

## 2. Access token

L’access token sert à authentifier les requêtes API.

```http
Authorization: Bearer eyJhbGciOi...
```

Il est souvent de courte durée.

Exemple :

```text
GET /profile
Authorization: Bearer accessToken
```

## 3. Refresh token

Le refresh token sert à obtenir un nouvel access token quand celui-ci expire.

```text
access token expiré
→ appel /refresh avec refresh token
→ nouveau access token
→ l’utilisateur reste connecté
```

Le refresh token est plus sensible et doit être stocké dans le Keychain.

## 4. AuthState simple

```swift
import SwiftUI

@MainActor
final class AuthState: ObservableObject {
    enum Status {
        case loading
        case loggedOut
        case loggedIn(UserSession)
    }
    
    @Published private(set) var status: Status = .loading
    
    private let tokenStore: AuthTokenStore
    
    init(tokenStore: AuthTokenStore = AuthTokenStore()) {
        self.tokenStore = tokenStore
    }
    
    func checkSession() {
        if let accessToken = tokenStore.accessToken {
            status = .loggedIn(UserSession(accessToken: accessToken))
        } else {
            status = .loggedOut
        }
    }
    
    func logout() {
        tokenStore.clearTokens()
        status = .loggedOut
    }
}

struct UserSession {
    let accessToken: String
}
```

## 5. AppRootView

```swift
struct AppRootView: View {
    @StateObject private var authState = AuthState()
    
    var body: some View {
        Group {
            switch authState.status {
            case .loading:
                ProgressView()
            case .loggedOut:
                LoginView()
            case .loggedIn:
                MainTabView()
            }
        }
        .environmentObject(authState)
        .task {
            authState.checkSession()
        }
    }
}
```

L’app décide automatiquement quel écran afficher selon l’état de session.

## 6. Différence Firebase Auth / Auth REST

Avec Firebase Auth, le SDK gère beaucoup de choses : session, user courant, token interne.

Avec une API REST propriétaire, tu dois gérer toi-même :

- requête login ;
- stockage tokens ;
- refresh token ;
- header Authorization ;
- logout ;
- expiration de session.

## Résumé

- Une session indique si l’utilisateur est connecté.
- L’access token authentifie les requêtes API.
- Le refresh token renouvelle l’access token.
- Les tokens doivent être stockés dans le Keychain.
- Un `AuthState` global permet de rediriger automatiquement vers login ou app principale.
