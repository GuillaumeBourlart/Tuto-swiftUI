# Fiche 10.02 — Écrans login/register/forgot password

## Objectif

Savoir structurer les écrans classiques d’authentification : connexion, inscription et mot de passe oublié.

Le but est de gérer proprement les champs, la validation, le loading et les erreurs.

## 1. LoginViewModel

```swift
import SwiftUI

@MainActor
final class LoginViewModel: ObservableObject {
    @Published var email = ""
    @Published var password = ""
    @Published var isLoading = false
    @Published var errorMessage: String?
    
    var isFormValid: Bool {
        email.contains("@") && password.count >= 8
    }
    
    func login() async {
        guard isFormValid else { return }
        
        isLoading = true
        errorMessage = nil
        
        do {
            try await Task.sleep(nanoseconds: 500_000_000) // simulation API
            isLoading = false
        } catch {
            errorMessage = "Impossible de se connecter."
            isLoading = false
        }
    }
}
```

La vue ne doit pas contenir toute la logique de connexion.

## 2. LoginView

```swift
struct LoginView: View {
    @StateObject private var viewModel = LoginViewModel()
    
    var body: some View {
        VStack(spacing: AppSpacing.medium) {
            Text("Connexion")
                .font(AppTypography.title)
            
            TextField("Email", text: $viewModel.email)
                .textFieldStyle(.roundedBorder)
                .keyboardType(.emailAddress)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
            
            SecureField("Mot de passe", text: $viewModel.password)
                .textFieldStyle(.roundedBorder)
            
            if let error = viewModel.errorMessage {
                Text(error)
                    .foregroundStyle(AppColors.error)
                    .font(AppTypography.caption)
            }
            
            Button {
                Task { await viewModel.login() }
            } label: {
                if viewModel.isLoading {
                    ProgressView()
                } else {
                    Text("Se connecter")
                }
            }
            .disabled(!viewModel.isFormValid || viewModel.isLoading)
            
            Button("Mot de passe oublié ?") {
                // ouvrir ForgotPasswordView
            }
        }
        .padding(AppSpacing.large)
    }
}
```

## 3. RegisterViewModel

```swift
@MainActor
final class RegisterViewModel: ObservableObject {
    @Published var email = ""
    @Published var password = ""
    @Published var confirmPassword = ""
    @Published var acceptsTerms = false
    @Published var errorMessage: String?
    
    var isFormValid: Bool {
        email.contains("@") &&
        password.count >= 8 &&
        password == confirmPassword &&
        acceptsTerms
    }
    
    func register() async {
        guard isFormValid else {
            errorMessage = "Vérifie les champs du formulaire."
            return
        }
        
        // appel AuthService.register(...)
    }
}
```

## 4. ForgotPasswordView

```swift
struct ForgotPasswordView: View {
    @State private var email = ""
    @State private var message: String?
    
    var body: some View {
        VStack(spacing: AppSpacing.medium) {
            Text("Mot de passe oublié")
                .font(AppTypography.title)
            
            TextField("Email", text: $email)
                .textFieldStyle(.roundedBorder)
                .keyboardType(.emailAddress)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
            
            Button("Envoyer le lien") {
                message = "Si un compte existe, un email sera envoyé."
            }
            .disabled(!email.contains("@"))
            
            if let message {
                Text(message)
                    .font(AppTypography.caption)
                    .foregroundStyle(AppColors.textSecondary)
            }
        }
        .padding(AppSpacing.large)
    }
}
```

## En UIKit (rappel)

En UIKit, un écran de login était un `UIViewController` : on créait les champs et le bouton à la main, on les empilait dans un `UIStackView`, et on activait/désactivait le bouton en écoutant chaque frappe.

```swift
final class LoginViewController: UIViewController {
    private let emailField = UITextField()
    private let passwordField = UITextField()
    private let loginButton: UIButton = {
        var config = UIButton.Configuration.filled()
        config.title = "Se connecter"
        return UIButton(configuration: config)
    }()

    override func viewDidLoad() {
        super.viewDidLoad()

        emailField.placeholder = "Email"
        emailField.keyboardType = .emailAddress
        emailField.autocapitalizationType = .none
        emailField.borderStyle = .roundedRect

        passwordField.placeholder = "Mot de passe"
        passwordField.isSecureTextEntry = true
        passwordField.borderStyle = .roundedRect

        // Validation à chaque frappe (impératif)
        let onEdit = UIAction { [weak self] _ in self?.updateButtonState() }
        emailField.addAction(onEdit, for: .editingChanged)
        passwordField.addAction(onEdit, for: .editingChanged)

        loginButton.isEnabled = false // désactivé tant que le formulaire est invalide
        loginButton.addAction(UIAction { [weak self] _ in self?.login() }, for: .touchUpInside)

        let stack = UIStackView(arrangedSubviews: [emailField, passwordField, loginButton])
        stack.axis = .vertical
        stack.spacing = 16
        stack.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(stack)
        NSLayoutConstraint.activate([
            stack.centerYAnchor.constraint(equalTo: view.centerYAnchor),
            stack.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 24),
            stack.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -24),
        ])
    }

    private func updateButtonState() {
        let valid = (emailField.text ?? "").contains("@") && (passwordField.text ?? "").count >= 8
        loginButton.isEnabled = valid // on pousse l'état dans la vue à la main
    }

    private func login() {
        // appel API, puis navigation via le coordinator/navigationController
        navigationController?.pushViewController(HomeViewController(), animated: true)
    }
}
```

Différence clé de mentalité : en UIKit tu **décris les étapes** (lire `text`, recalculer, écrire `isEnabled`) à chaque événement ; le contrôleur et la vue peuvent se désynchroniser. En SwiftUI tu **décris l'état** et la vue s'y conforme automatiquement.

👉 En SwiftUI : `@State`/`@Published` + binding (`$email`) + `.disabled(!isFormValid)` remplacent le `.editingChanged` et le `isEnabled` manuels — l'UI suit l'état toute seule.

## 5. Points importants

Un écran d’auth réel doit gérer :

- validation avant appel API ;
- loading ;
- erreur compréhensible ;
- bouton désactivé si invalide ;
- clavier propre ;
- stockage session après réussite ;
- redirection vers l’app principale.

## Résumé

- Login/register sont des formulaires avec validation.
- La logique doit aller dans un ViewModel.
- La vue affiche les états : normal, loading, erreur.
- Le mot de passe oublié est souvent un écran simple avec email.
- Après login réussi, on met à jour l’AuthState global.
