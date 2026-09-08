# Fiche 11.02 — Firebase Auth en pratique

## Objectif

Créer un service Firebase Auth utilisable dans une architecture SwiftUI / MVVM.

## 1. Service Auth

```swift
import FirebaseAuth

protocol AuthServiceProtocol {
    var currentUserId: String? { get }
    func signIn(email: String, password: String) async throws
    func register(email: String, password: String) async throws
    func logout() throws
    func deleteAccount() async throws
}

final class FirebaseAuthService: AuthServiceProtocol {
    var currentUserId: String? {
        Auth.auth().currentUser?.uid
    }
    
    func signIn(email: String, password: String) async throws {
        try await Auth.auth().signIn(withEmail: email, password: password)
    }
    
    func register(email: String, password: String) async throws {
        try await Auth.auth().createUser(withEmail: email, password: password)
    }
    
    func logout() throws {
        try Auth.auth().signOut()
    }
    
    func deleteAccount() async throws {
        guard let user = Auth.auth().currentUser else { return }
        try await user.delete()
    }
}
```

Le protocole rend le service testable.

## 2. LoginViewModel

```swift
@MainActor
final class FirebaseLoginViewModel: ObservableObject {
    @Published var email = ""
    @Published var password = ""
    @Published var isLoading = false
    @Published var errorMessage: String?
    
    private let authService: AuthServiceProtocol
    
    init(authService: AuthServiceProtocol = FirebaseAuthService()) {
        self.authService = authService
    }
    
    var isFormValid: Bool {
        email.contains("@") && password.count >= 8
    }
    
    func login() async {
        guard isFormValid else { return }
        
        isLoading = true
        errorMessage = nil
        
        do {
            try await authService.signIn(email: email, password: password)
        } catch {
            errorMessage = "Email ou mot de passe incorrect."
        }
        
        isLoading = false
    }
}
```

## 3. AuthState Firebase

```swift
@MainActor
final class FirebaseAuthState: ObservableObject {
    @Published var user: User?
    @Published var isLoading = true
    
    private var listener: AuthStateDidChangeListenerHandle?
    
    func start() {
        listener = Auth.auth().addStateDidChangeListener { [weak self] _, user in
            self?.user = user
            self?.isLoading = false
        }
    }
    
    func stop() {
        if let listener {
            Auth.auth().removeStateDidChangeListener(listener)
        }
    }
}
```

## 4. AppRootView

```swift
struct AppRootView: View {
    @StateObject private var authState = FirebaseAuthState()
    
    var body: some View {
        Group {
            if authState.isLoading {
                ProgressView()
            } else if authState.user == nil {
                LoginView()
            } else {
                MainTabView()
            }
        }
        .task {
            authState.start()
        }
    }
}
```

## 5. Logout depuis les réglages

```swift
struct SettingsView: View {
    private let authService = FirebaseAuthService()
    
    var body: some View {
        Button("Se déconnecter", role: .destructive) {
            try? authService.logout()
        }
    }
}
```

Le listener Firebase mettra automatiquement l’utilisateur à `nil`.

## Points à connaître

Firebase Auth garde généralement l’utilisateur connecté automatiquement.

Pour tester proprement un ViewModel, il faut passer par un protocole et injecter un mock.

## Résumé

- Firebase Auth peut être encapsulé dans un service.
- Le service doit avoir un protocole pour les tests.
- Le ViewModel gère loading, erreur et validation.
- La session globale se gère avec un listener Firebase.
- Le logout déclenche automatiquement la mise à jour de session.
