# Fiche 10.03 — Firebase Auth : email/password, Google, Apple, logout

## Objectif

Comprendre les grandes opérations Firebase Auth dans une app SwiftUI : inscription, connexion, session, Google, Apple et logout.

## 1. Pourquoi Firebase Auth ?

Firebase Auth permet de gérer rapidement l’authentification sans créer tout un backend propriétaire.

Il peut gérer :

- email/password ;
- Google Sign-In ;
- Sign in with Apple ;
- session utilisateur ;
- récupération de l’utilisateur courant ;
- logout ;
- suppression de compte.

## 2. Connexion email/password

```swift
import FirebaseAuth

final class FirebaseAuthService {
    func signIn(email: String, password: String) async throws {
        try await Auth.auth().signIn(withEmail: email, password: password)
    }
    
    func register(email: String, password: String) async throws {
        try await Auth.auth().createUser(withEmail: email, password: password)
    }
    
    func logout() throws {
        try Auth.auth().signOut()
    }
}
```

La vue ou le ViewModel appelle ce service.

## 3. Écouter la session Firebase

Firebase peut prévenir quand l’utilisateur se connecte ou se déconnecte.

```swift
@MainActor
final class FirebaseSessionViewModel: ObservableObject {
    @Published var user: User?
    
    private var listener: AuthStateDidChangeListenerHandle?
    
    func startListening() {
        listener = Auth.auth().addStateDidChangeListener { [weak self] _, user in
            self?.user = user
        }
    }
    
    func stopListening() {
        if let listener {
            Auth.auth().removeStateDidChangeListener(listener)
        }
    }
}
```

Cet état peut ensuite décider d’afficher `LoginView` ou `MainTabView`.

## 4. Google Sign-In

Le flux exact dépend du SDK Google, mais l’idée est :

```text
Bouton Google
→ ouverture du flow Google
→ récupération idToken/accessToken Google
→ création Firebase credential
→ Auth.auth().signIn(with: credential)
```

Exemple simplifié :

```swift
let credential = GoogleAuthProvider.credential(
    withIDToken: idToken,
    accessToken: accessToken
)

try await Auth.auth().signIn(with: credential)
```

## 5. Sign in with Apple

Même logique : Apple renvoie une identité, puis Firebase utilise un credential.

```text
Bouton Apple
→ Apple renvoie identityToken
→ création OAuthProvider credential
→ connexion Firebase
```

Exemple d’idée :

```swift
let credential = OAuthProvider.credential(
    providerID: AuthProviderID.apple,
    idToken: idTokenString,
    rawNonce: nonce
)

try await Auth.auth().signIn(with: credential)
```

Dans une vraie app, il faut gérer le nonce et le flow Apple proprement.

## 6. Logout

```swift
func logout() {
    do {
        try Auth.auth().signOut()
    } catch {
        print("Logout error: \(error)")
    }
}
```

Après logout, le listener Firebase détecte que `user == nil`.

## 7. Suppression de compte

```swift
func deleteCurrentUser() async throws {
    guard let user = Auth.auth().currentUser else { return }
    try await user.delete()
}
```

Attention : Firebase peut demander une reconnexion récente avant suppression.

## Résumé

- Firebase Auth simplifie l’authentification.
- Email/password se fait avec `signIn` et `createUser`.
- La session peut être observée avec `addStateDidChangeListener`.
- Google et Apple passent par des credentials Firebase.
- Logout se fait avec `signOut()`.
- Suppression de compte possible, parfois avec reconnexion requise.
