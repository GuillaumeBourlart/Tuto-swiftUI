# Fiche 03.08 — Gestion du clavier avec @FocusState

## Objectif

Comprendre comment gérer le focus des champs texte et le clavier avec `@FocusState`.

`@FocusState` permet de savoir quel champ est actif, de passer automatiquement au champ suivant, ou de fermer le clavier.

## 1. L’idée à comprendre

Quand un utilisateur remplit un formulaire, tu veux souvent :

- ouvrir le clavier sur un champ précis ;
- passer de l’email au mot de passe avec le bouton “Suivant” ;
- fermer le clavier après le dernier champ ;
- déclencher une validation quand l’utilisateur appuie sur “OK”.

SwiftUI permet ça avec `@FocusState`.

## 2. Focus simple sur un champ

```swift
import SwiftUI

struct SimpleFocusView: View {
    @State private var email = ""
    @FocusState private var isEmailFocused: Bool
    
    var body: some View {
        VStack {
            TextField("Email", text: $email)
                .textFieldStyle(.roundedBorder)
                .focused($isEmailFocused)
            
            Button("Focus email") {
                isEmailFocused = true
            }
            
            Button("Fermer le clavier") {
                isEmailFocused = false
            }
        }
        .padding()
    }
}
```

Quand `isEmailFocused` passe à `true`, le champ devient actif.

Quand il passe à `false`, le clavier se ferme.

## 3. Gérer plusieurs champs avec enum Field

Pour plusieurs champs, on utilise souvent une enum.

```swift
import SwiftUI

struct LoginFocusView: View {
    enum Field {
        case email
        case password
    }
    
    @State private var email = ""
    @State private var password = ""
    
    @FocusState private var focusedField: Field?
    
    var body: some View {
        VStack(spacing: AppSpacing.medium) {
            TextField("Email", text: $email)
                .textFieldStyle(.roundedBorder)
                .keyboardType(.emailAddress)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
                .focused($focusedField, equals: .email)
                .submitLabel(.next)
                .onSubmit {
                    focusedField = .password // passe au champ suivant
                }
            
            SecureField("Mot de passe", text: $password)
                .textFieldStyle(.roundedBorder)
                .focused($focusedField, equals: .password)
                .submitLabel(.go)
                .onSubmit {
                    focusedField = nil // ferme le clavier
                    login()
                }
            
            Button("Connexion") {
                focusedField = nil
                login()
            }
        }
        .padding()
    }
    
    private func login() {
        print("Connexion avec \(email)")
    }
}
```

## 4. submitLabel

`submitLabel` permet de changer le bouton du clavier.

```swift
.submitLabel(.next)
.submitLabel(.done)
.submitLabel(.go)
.submitLabel(.search)
```

Exemples :

```swift
TextField("Email", text: $email)
    .submitLabel(.next)

SecureField("Mot de passe", text: $password)
    .submitLabel(.go)
```

Sur le clavier, l’utilisateur verra un bouton plus adapté au contexte.

## 5. Exemple formulaire d’inscription

```swift
import SwiftUI

struct RegisterFocusView: View {
    enum Field {
        case email
        case password
        case confirmPassword
    }
    
    @State private var email = ""
    @State private var password = ""
    @State private var confirmPassword = ""
    
    @FocusState private var focusedField: Field?
    
    private var isFormValid: Bool {
        email.contains("@") &&
        password.count >= 8 &&
        password == confirmPassword
    }
    
    var body: some View {
        VStack(spacing: AppSpacing.medium) {
            TextField("Email", text: $email)
                .textFieldStyle(.roundedBorder)
                .keyboardType(.emailAddress)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
                .focused($focusedField, equals: .email)
                .submitLabel(.next)
                .onSubmit {
                    focusedField = .password
                }
            
            SecureField("Mot de passe", text: $password)
                .textFieldStyle(.roundedBorder)
                .focused($focusedField, equals: .password)
                .submitLabel(.next)
                .onSubmit {
                    focusedField = .confirmPassword
                }
            
            SecureField("Confirmer le mot de passe", text: $confirmPassword)
                .textFieldStyle(.roundedBorder)
                .focused($focusedField, equals: .confirmPassword)
                .submitLabel(.go)
                .onSubmit {
                    submit()
                }
            
            Button("Créer mon compte") {
                submit()
            }
            .disabled(!isFormValid)
        }
        .padding()
        .onAppear {
            focusedField = .email // ouvre directement le clavier sur l’email
        }
    }
    
    private func submit() {
        guard isFormValid else {
            focusedField = firstInvalidField()
            return
        }
        
        focusedField = nil
        print("Inscription")
    }
    
    private func firstInvalidField() -> Field? {
        if !email.contains("@") { return .email }
        if password.count < 8 { return .password }
        if password != confirmPassword { return .confirmPassword }
        return nil
    }
}
```

Ici, si le formulaire est invalide, on peut remettre automatiquement le focus sur le premier champ à corriger.

## 6. Fermer le clavier en touchant un bouton

La manière simple est de mettre le focus à `nil`.

```swift
focusedField = nil
```

Exemple :

```swift
Button("Annuler") {
    focusedField = nil
}
```

## 7. Interaction avec un ViewModel

Le ViewModel peut gérer la validation, mais la vue doit généralement garder le focus.

```swift
@MainActor
final class LoginViewModel: ObservableObject {
    @Published var email = ""
    @Published var password = ""
    
    var isFormValid: Bool {
        email.contains("@") && password.count >= 8
    }
    
    func login() {
        guard isFormValid else { return }
        print("Connexion")
    }
}
```

Vue :

```swift
struct LoginWithViewModelView: View {
    enum Field {
        case email
        case password
    }
    
    @StateObject private var viewModel = LoginViewModel()
    @FocusState private var focusedField: Field?
    
    var body: some View {
        VStack(spacing: AppSpacing.medium) {
            TextField("Email", text: $viewModel.email)
                .textFieldStyle(.roundedBorder)
                .focused($focusedField, equals: .email)
                .submitLabel(.next)
                .onSubmit {
                    focusedField = .password
                }
            
            SecureField("Mot de passe", text: $viewModel.password)
                .textFieldStyle(.roundedBorder)
                .focused($focusedField, equals: .password)
                .submitLabel(.go)
                .onSubmit {
                    submit()
                }
            
            Button("Connexion") {
                submit()
            }
            .disabled(!viewModel.isFormValid)
        }
        .padding()
    }
    
    private func submit() {
        guard viewModel.isFormValid else {
            focusedField = viewModel.email.contains("@") ? .password : .email
            return
        }
        
        focusedField = nil
        viewModel.login()
    }
}
```

## En UIKit (rappel)

En UIKit, le focus se pilotait directement sur le champ, à la main.

```swift
// Ouvrir / fermer le clavier
emailField.becomeFirstResponder()
emailField.resignFirstResponder() // ou view.endEditing(true)
```

```swift
// Passer au champ suivant via le delegate
func textFieldShouldReturn(_ textField: UITextField) -> Bool {
    if textField == emailField {
        passwordField.becomeFirstResponder()
    } else {
        textField.resignFirstResponder()
        login()
    }
    return true
}
```

```swift
// Barre "OK" au-dessus du clavier + remonter le contenu
let bar = UIToolbar()
bar.sizeToFit()
bar.items = [
    .flexibleSpace(),
    UIBarButtonItem(title: "OK", primaryAction: UIAction { [weak self] _ in
        self?.view.endEditing(true)
    })
]
emailField.inputAccessoryView = bar

// Et on observait keyboardWillShow/Hide pour ajuster le scroll/insets
NotificationCenter.default.addObserver(
    self, selector: #selector(keyboardWillShow),
    name: UIResponder.keyboardWillShowNotification, object: nil
)
```

Différence clé : UIKit est impératif, tu commandes le champ (`becomeFirstResponder()`) et tu gères toi-même clavier et scroll via notifications. SwiftUI est déclaratif : tu décris l’état du focus.

👉 En SwiftUI : `@FocusState` + `.focused(...)` pour l’état, `.submitLabel`/`.onSubmit` pour le bouton et l’enchaînement, et le clavier qui pousse le contenu est géré automatiquement.

## Points à connaître

`@FocusState` appartient plutôt à la vue, car il concerne l’interface et le clavier.

Le ViewModel peut décider si le formulaire est valide, mais il n’a pas forcément besoin de connaître le champ actuellement focus.

Pour plusieurs champs, préfère une enum `Field` plutôt que plusieurs booléens.

## Résumé

- `@FocusState` permet de contrôler le clavier.
- Avec une enum `Field`, tu peux gérer plusieurs champs proprement.
- `.submitLabel(.next)` adapte le bouton du clavier.
- `.onSubmit` permet de passer au champ suivant ou de valider.
- Pour fermer le clavier, mets le focus à `nil`.
