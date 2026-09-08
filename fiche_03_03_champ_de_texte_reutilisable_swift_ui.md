# Fiche 03.03 — Créer un champ de texte réutilisable en SwiftUI

## Objectif

Comprendre comment créer un champ de texte réutilisable avec `TextField`, `SecureField`, `@Binding`, validation simple, message d’erreur et état sécurisé/non sécurisé.

---

# 1. L’idée à comprendre

Dans une app, tu vas souvent répéter des champs de texte :

- email ;
- mot de passe ;
- nom d’utilisateur ;
- recherche ;
- formulaire de profil ;
- formulaire d’inscription.

Au lieu de recopier le même style partout, tu peux créer un composant réutilisable.

Exemple d’utilisation souhaitée :

```swift
AppTextField(
    title: "Email",
    placeholder: "exemple@mail.com",
    text: $email,
    errorMessage: emailError
)
```

---

# 2. TextField simple

```swift
struct UsernameFieldView: View {
    @State private var username = ""

    var body: some View {
        TextField("Nom d’utilisateur", text: $username)
            .textFieldStyle(.roundedBorder)
            .padding()
    }
}
```

`TextField` a besoin d’un `Binding` vers le texte.

C’est pour ça qu’on passe :

```swift
$username
```

et pas :

```swift
username
```

---

# 3. Champ réutilisable simple

```swift
struct AppTextField: View {
    let title: String
    let placeholder: String
    @Binding var text: String

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(title)
                .font(.subheadline)
                .fontWeight(.semibold)

            TextField(placeholder, text: $text)
                .textFieldStyle(.roundedBorder)
        }
    }
}
```

Utilisation :

```swift
struct RegisterView: View {
    @State private var email = ""

    var body: some View {
        AppTextField(
            title: "Email",
            placeholder: "exemple@mail.com",
            text: $email
        )
        .padding()
    }
}
```

Ici, `AppTextField` ne possède pas la valeur.

Il modifie la valeur du parent via `@Binding`.

---

# 4. Champ avec message d’erreur

```swift
struct AppTextField: View {
    let title: String
    let placeholder: String
    @Binding var text: String
    let errorMessage: String?

    init(
        title: String,
        placeholder: String,
        text: Binding<String>,
        errorMessage: String? = nil
    ) {
        self.title = title
        self.placeholder = placeholder
        self._text = text
        self.errorMessage = errorMessage
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(title)
                .font(.subheadline)
                .fontWeight(.semibold)

            TextField(placeholder, text: $text)
                .textFieldStyle(.roundedBorder)

            if let errorMessage {
                Text(errorMessage)
                    .font(.caption)
                    .foregroundStyle(.red)
            }
        }
    }
}
```

Utilisation :

```swift
AppTextField(
    title: "Email",
    placeholder: "exemple@mail.com",
    text: $email,
    errorMessage: email.isEmpty ? "Email obligatoire" : nil
)
```

---

# 5. Champ email

Pour un champ email, tu peux adapter le clavier et désactiver la capitalisation automatique.

```swift
TextField("Email", text: $email)
    .keyboardType(.emailAddress)
    .textInputAutocapitalization(.never)
    .autocorrectionDisabled()
    .textFieldStyle(.roundedBorder)
```

Dans un composant :

```swift
struct EmailField: View {
    @Binding var email: String
    let errorMessage: String?

    var body: some View {
        AppTextField(
            title: "Email",
            placeholder: "exemple@mail.com",
            text: $email,
            errorMessage: errorMessage
        )
        .keyboardType(.emailAddress)
        .textInputAutocapitalization(.never)
        .autocorrectionDisabled()
    }
}
```

---

# 6. SecureField pour mot de passe

`SecureField` sert à masquer le texte.

```swift
struct PasswordField: View {
    @Binding var password: String

    var body: some View {
        SecureField("Mot de passe", text: $password)
            .textFieldStyle(.roundedBorder)
    }
}
```

Utilisation :

```swift
PasswordField(password: $password)
```

---

# 7. Champ mot de passe avec bouton afficher/masquer

```swift
struct PasswordInputView: View {
    @Binding var password: String
    @State private var isPasswordVisible = false
    let errorMessage: String?

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("Mot de passe")
                .font(.subheadline)
                .fontWeight(.semibold)

            HStack {
                if isPasswordVisible {
                    TextField("Mot de passe", text: $password)
                } else {
                    SecureField("Mot de passe", text: $password)
                }

                Button {
                    isPasswordVisible.toggle()
                } label: {
                    Image(systemName: isPasswordVisible ? "eye.slash" : "eye")
                        .foregroundStyle(.secondary)
                }
            }
            .padding(10)
            .background(.gray.opacity(0.12))
            .clipShape(RoundedRectangle(cornerRadius: 10))

            if let errorMessage {
                Text(errorMessage)
                    .font(.caption)
                    .foregroundStyle(.red)
            }
        }
    }
}
```

Utilisation :

```swift
PasswordInputView(
    password: $password,
    errorMessage: password.count < 8 ? "Minimum 8 caractères" : nil
)
```

---

# 8. Exemple réaliste : formulaire de connexion

```swift
struct LoginView: View {
    @State private var email = ""
    @State private var password = ""

    private var isFormValid: Bool {
        !email.isEmpty && password.count >= 8
    }

    var body: some View {
        VStack(spacing: 16) {
            AppTextField(
                title: "Email",
                placeholder: "exemple@mail.com",
                text: $email,
                errorMessage: email.isEmpty ? "Email obligatoire" : nil
            )
            .keyboardType(.emailAddress)
            .textInputAutocapitalization(.never)
            .autocorrectionDisabled()

            PasswordInputView(
                password: $password,
                errorMessage: password.isEmpty ? nil : password.count < 8 ? "Minimum 8 caractères" : nil
            )

            AppButton(
                title: "Se connecter",
                isDisabled: !isFormValid
            ) {
                print("Connexion")
            }
        }
        .padding()
    }
}
```

Ce formulaire reste lisible parce que les champs sont découpés en composants.

---

# 9. `@FocusState`

`@FocusState` permet de gérer le focus du clavier.

```swift
struct FocusExampleView: View {
    enum Field {
        case email
        case password
    }

    @State private var email = ""
    @State private var password = ""
    @FocusState private var focusedField: Field?

    var body: some View {
        VStack(spacing: 16) {
            TextField("Email", text: $email)
                .textFieldStyle(.roundedBorder)
                .focused($focusedField, equals: .email)
                .submitLabel(.next)
                .onSubmit {
                    focusedField = .password
                }

            SecureField("Mot de passe", text: $password)
                .textFieldStyle(.roundedBorder)
                .focused($focusedField, equals: .password)
                .submitLabel(.done)
                .onSubmit {
                    focusedField = nil
                }
        }
        .padding()
    }
}
```

Ici :

- le bouton retour du clavier passe de l’email au mot de passe ;
- puis ferme le clavier sur le mot de passe.

---

# En UIKit (rappel)

En UIKit, tu configurais un `UITextField` propriété par propriété, puis tu observais ses changements via la délégation ou des cibles.

```swift
let emailField = UITextField()
emailField.placeholder = "exemple@mail.com"
emailField.keyboardType = .emailAddress
emailField.autocapitalizationType = .none
emailField.autocorrectionType = .no
emailField.clearButtonMode = .whileEditing
emailField.borderStyle = .roundedRect

let passwordField = UITextField()
passwordField.placeholder = "Mot de passe"
passwordField.isSecureTextEntry = true
```

Pour réagir à la saisie : `UITextFieldDelegate` pour la touche retour, et `.editingChanged` pour suivre le texte en temps réel.

```swift
emailField.delegate = self
emailField.addAction(UIAction { [weak self] _ in
    self?.validateEmail(emailField.text ?? "")
}, for: .editingChanged)

func textFieldShouldReturn(_ textField: UITextField) -> Bool {
    passwordField.becomeFirstResponder() // passe au champ suivant
    return true
}
```

La différence de mentalité : en UIKit tu **pousses** l'état dans le champ et tu **récupères** sa valeur via `text` à la demande (impératif). En SwiftUI, le `TextField`/`SecureField` est lié à une source de vérité par un `Binding` : la vue et l'état restent synchronisés automatiquement, sans delegate ni cible.

👉 En SwiftUI : `TextField(placeholder, text: $email)` / `SecureField(...)` remplacent `UITextField` + delegate, la liaison `$email` faisant tout le câblage.

---

# 10. Points à connaître

## Un champ réutilisable doit recevoir un Binding

```swift
@Binding var text: String
```

Sinon il ne pourra pas modifier la valeur du parent.

---

## Ne mets pas toute la validation dans le composant

Le composant peut afficher une erreur.

Mais la logique de validation complète peut rester dans :

- la vue parente ;
- un ViewModel ;
- un service de validation.

---

## Garde les champs spécialisés si nécessaire

Un `EmailField`, un `PasswordInputView` ou un `SearchField` peuvent être plus clairs qu’un seul énorme composant qui fait tout.

---

# Résumé

À retenir :

- `TextField` permet de saisir du texte ;
- `SecureField` masque le texte ;
- un champ réutilisable reçoit souvent un `@Binding var text` ;
- un message d’erreur peut être affiché sous le champ ;
- un champ email doit souvent désactiver la capitalisation et l’autocorrection ;
- un champ mot de passe peut avoir un bouton afficher/masquer ;
- `@FocusState` permet de gérer le focus clavier ;
- la validation complète doit souvent rester dans la vue parente ou le ViewModel.

