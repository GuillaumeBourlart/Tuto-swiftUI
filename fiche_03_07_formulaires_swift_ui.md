# Fiche 03.07 — Formulaires SwiftUI

## Objectif

Comprendre comment créer des formulaires SwiftUI avec `Form`, `TextField`, `SecureField`, `Toggle`, `Picker`, `DatePicker`, `Stepper` et `Slider`.

Un formulaire sert à récupérer des informations utilisateur : connexion, inscription, profil, préférences, filtres, etc.

## 1. Formulaire simple avec Form

`Form` est pratique pour créer rapidement une interface de réglages ou de saisie.

```swift
import SwiftUI

struct ProfileFormView: View {
    @State private var name = ""
    @State private var email = ""
    @State private var wantsNotifications = true
    
    var body: some View {
        Form {
            Section("Informations") {
                TextField("Nom", text: $name)
                TextField("Email", text: $email)
                    .keyboardType(.emailAddress)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
            }
            
            Section("Préférences") {
                Toggle("Recevoir les notifications", isOn: $wantsNotifications)
            }
        }
        .navigationTitle("Profil")
    }
}
```

`Form` donne automatiquement un style iOS proche des réglages système.

## 2. Form vs VStack custom

Tu peux créer un formulaire avec `Form` :

```swift
Form {
    TextField("Email", text: $email)
    SecureField("Mot de passe", text: $password)
}
```

Ou avec une vue custom :

```swift
VStack(spacing: AppSpacing.medium) {
    TextField("Email", text: $email)
        .textFieldStyle(.roundedBorder)
    
    SecureField("Mot de passe", text: $password)
        .textFieldStyle(.roundedBorder)
    
    Button("Connexion") {
        
    }
}
.padding()
```

`Form` est mieux pour les écrans de réglages, profils, préférences ou formulaires classiques.

`VStack` custom est mieux quand tu veux un design précis : écran de login moderne, onboarding, formulaire très stylisé.

## 3. Champs de texte

```swift
struct LoginFormView: View {
    @State private var email = ""
    @State private var password = ""
    
    var body: some View {
        Form {
            TextField("Email", text: $email)
                .keyboardType(.emailAddress)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
            
            SecureField("Mot de passe", text: $password)
        }
    }
}
```

Pour un email, pense souvent à :

```swift
.keyboardType(.emailAddress)
.textInputAutocapitalization(.never)
.autocorrectionDisabled()
```

## 4. Toggle

```swift
@State private var acceptsTerms = false

Toggle("J’accepte les conditions", isOn: $acceptsTerms)
```

Utile pour les préférences, conditions d’utilisation, options de confidentialité, notifications, etc.

## 5. Picker

```swift
enum AccountType: String, CaseIterable, Identifiable {
    case personal = "Personnel"
    case professional = "Professionnel"
    
    var id: String { rawValue }
}

struct AccountTypePickerView: View {
    @State private var selectedType: AccountType = .personal
    
    var body: some View {
        Form {
            Picker("Type de compte", selection: $selectedType) {
                ForEach(AccountType.allCases) { type in
                    Text(type.rawValue)
                        .tag(type)
                }
            }
        }
    }
}
```

`Picker` fonctionne avec une valeur sélectionnée et des `.tag(...)`.

## 6. DatePicker

```swift
@State private var birthDate = Date()

DatePicker(
    "Date de naissance",
    selection: $birthDate,
    displayedComponents: .date
)
```

Tu peux limiter les dates :

```swift
DatePicker(
    "Date de naissance",
    selection: $birthDate,
    in: ...Date(), // empêche de choisir une date future
    displayedComponents: .date
)
```

## 7. Stepper

```swift
@State private var quantity = 1

Stepper("Quantité : \(quantity)", value: $quantity, in: 1...10)
```

Utile pour choisir une quantité, un nombre de participants, une durée, etc.

## 8. Slider

```swift
@State private var distance = 10.0

VStack(alignment: .leading) {
    Text("Distance : \(Int(distance)) km")
    
    Slider(value: $distance, in: 1...100, step: 1)
}
```

Utile pour des filtres ou des réglages progressifs.

## 9. Validation simple dans la vue

```swift
struct RegisterView: View {
    @State private var email = ""
    @State private var password = ""
    @State private var acceptsTerms = false
    
    private var isFormValid: Bool {
        email.contains("@") &&
        password.count >= 8 &&
        acceptsTerms
    }
    
    var body: some View {
        Form {
            Section("Compte") {
                TextField("Email", text: $email)
                    .keyboardType(.emailAddress)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                
                SecureField("Mot de passe", text: $password)
            }
            
            Section {
                Toggle("J’accepte les conditions", isOn: $acceptsTerms)
            }
            
            Section {
                Button("Créer mon compte") {
                    print("Inscription")
                }
                .disabled(!isFormValid)
            }
        }
    }
}
```

Ici, le bouton est désactivé tant que le formulaire est invalide.

## 10. Validation dans un ViewModel

Pour un vrai écran de login/register, la validation est souvent mieux dans un ViewModel.

```swift
import SwiftUI

@MainActor
final class RegisterViewModel: ObservableObject {
    @Published var email = ""
    @Published var password = ""
    @Published var acceptsTerms = false
    
    var isFormValid: Bool {
        email.contains("@") &&
        password.count >= 8 &&
        acceptsTerms
    }
    
    func register() {
        guard isFormValid else { return }
        print("Inscription avec \(email)")
    }
}
```

Vue SwiftUI :

```swift
struct RegisterView: View {
    @StateObject private var viewModel = RegisterViewModel()
    
    var body: some View {
        Form {
            TextField("Email", text: $viewModel.email)
                .keyboardType(.emailAddress)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
            
            SecureField("Mot de passe", text: $viewModel.password)
            
            Toggle("J’accepte les conditions", isOn: $viewModel.acceptsTerms)
            
            Button("Créer mon compte") {
                viewModel.register()
            }
            .disabled(!viewModel.isFormValid)
        }
    }
}
```

## 11. Quand valider dans la vue ou dans le ViewModel ?

Validation dans la vue : acceptable pour un petit formulaire simple, sans logique métier importante.

Validation dans le ViewModel : préférable pour login, inscription, profil, paiement, API, messages d’erreur, tests unitaires.

En général, dès que la validation devient importante ou testable, elle doit sortir de la vue.

## En UIKit (rappel)

En UIKit, un formulaire « réglages » est typiquement une `UITableView` à cellules statiques (`.insetGrouped`), ou un `UIStackView` pour un design libre. Chaque contrôle est instancié, configuré et lu manuellement, et tu dois câbler la réaction au changement avec une closure (`UIAction`) ou un target-action.

```swift
// TextField + Switch dans une cellule, configurés à la main
let emailField = UITextField()
emailField.placeholder = "Email"
emailField.keyboardType = .emailAddress
emailField.autocapitalizationType = .none
emailField.autocorrectionType = .no

let notifSwitch = UISwitch()
notifSwitch.isOn = true
notifSwitch.addAction(UIAction { [weak self] _ in
    self?.wantsNotifications = notifSwitch.isOn   // on synchronise à la main
}, for: .valueChanged)
```

```swift
// Les autres contrôles classiques d'un formulaire
let stepper = UIStepper()
stepper.minimumValue = 1; stepper.maximumValue = 10

let slider = UISlider()
slider.minimumValue = 1; slider.maximumValue = 100

let datePicker = UIDatePicker()
datePicker.datePickerMode = .date
datePicker.maximumDate = Date()   // pas de date future

// Sélection : un UIMenu sur un UIButton remplace souvent le vieux UIPickerView
let typeButton = UIButton(configuration: .bordered())
typeButton.menu = UIMenu(children: [
    UIAction(title: "Personnel") { _ in /* maj du modèle */ },
    UIAction(title: "Professionnel") { _ in /* maj du modèle */ }
])
typeButton.showsMenuAsPrimaryAction = true
```

La différence clé est de mentalité : en UIKit tu écris du code **impératif** — tu crées le contrôle, tu pousses sa valeur initiale, puis tu écoutes ses événements pour relire et stocker la valeur. En SwiftUI c'est **déclaratif** : un `binding` (`$valeur`) relie le contrôle à l'état, la synchronisation dans les deux sens est automatique.

👉 En SwiftUI : `Form` + `Toggle` / `Picker` / `DatePicker` / `Stepper` / `Slider` liés par binding (`$valeur`) remplacent toute la création et le câblage manuels d'UIKit.

## Points à connaître

`Form` est pratique, mais son style est assez imposé par iOS. Pour un écran très personnalisé, utilise plutôt `ScrollView` + `VStack`.

Les valeurs du formulaire sont souvent stockées avec `@State` pour un écran simple, ou dans un `ViewModel` avec `@StateObject` pour un écran réel.

Un bouton de validation doit souvent être désactivé tant que le formulaire est invalide.

## Résumé

- `Form` sert à créer rapidement des formulaires iOS.
- `TextField`, `SecureField`, `Toggle`, `Picker`, `DatePicker`, `Stepper` et `Slider` couvrent la majorité des besoins.
- Pour un petit formulaire, `@State` suffit.
- Pour un vrai écran métier, préfère un ViewModel.
- La validation peut désactiver le bouton tant que les champs sont invalides.
