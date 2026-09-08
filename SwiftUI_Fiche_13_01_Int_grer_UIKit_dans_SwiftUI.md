# Fiche 13.01 — Intégrer UIKit dans SwiftUI

## Objectif

Savoir intégrer un composant UIKit dans une app SwiftUI quand un SDK, un ancien écran ou une API Apple n’existe pas encore proprement en SwiftUI.

À la fin, tu dois savoir expliquer : `UIViewRepresentable`, `UIViewControllerRepresentable`, `Coordinator`, `@Binding` et closures.

## 1. L’idée à comprendre

SwiftUI et UIKit peuvent cohabiter. Quand tu veux afficher une vue UIKit dans SwiftUI, tu crées un adaptateur.

```text
SwiftUI View
→ Representable
→ UIView ou UIViewController UIKit
```

Tu utilises :

- `UIViewRepresentable` pour intégrer une `UIView` ;
- `UIViewControllerRepresentable` pour intégrer un `UIViewController` ;
- `Coordinator` pour gérer les delegates UIKit ;
- `@Binding` ou une closure pour remonter une valeur vers SwiftUI.

## 2. UIViewRepresentable

Exemple avec une `UILabel` UIKit dans SwiftUI.

```swift
import SwiftUI
import UIKit

struct UIKitLabel: UIViewRepresentable {
    let text: String

    func makeUIView(context: Context) -> UILabel {
        let label = UILabel()
        label.numberOfLines = 0
        label.textAlignment = .center
        return label
    }

    func updateUIView(_ uiView: UILabel, context: Context) {
        uiView.text = text // appelé quand SwiftUI met à jour la vue
    }
}
```

Utilisation :

```swift
struct ContentView: View {
    var body: some View {
        UIKitLabel(text: "Texte affiché avec UIKit")
            .frame(height: 80)
            .padding()
    }
}
```

`makeUIView` crée la vue une fois. `updateUIView` synchronise les nouvelles valeurs SwiftUI vers UIKit.

## 3. UIViewControllerRepresentable

Pour intégrer un contrôleur UIKit, on utilise `UIViewControllerRepresentable`.

Exemple simple :

```swift
import SwiftUI
import UIKit

struct UIKitScreen: UIViewControllerRepresentable {
    func makeUIViewController(context: Context) -> UIViewController {
        let controller = UIViewController()
        controller.view.backgroundColor = .systemBlue
        return controller
    }

    func updateUIViewController(_ uiViewController: UIViewController, context: Context) {
        // Mettre à jour le controller si les données SwiftUI changent
    }
}
```

Utilisation :

```swift
struct ContentView: View {
    var body: some View {
        UIKitScreen()
            .ignoresSafeArea()
    }
}
```

## 4. Coordinator pour les delegates

UIKit utilise souvent des delegates. SwiftUI utilise plutôt `@Binding`, closures et état déclaratif. Le `Coordinator` sert de pont entre les deux.

Exemple simplifié avec un picker UIKit :

```swift
import SwiftUI
import UIKit

struct ImagePicker: UIViewControllerRepresentable {
    @Binding var selectedImage: UIImage?
    @Environment(\.dismiss) private var dismiss

    func makeCoordinator() -> Coordinator {
        Coordinator(parent: self)
    }

    func makeUIViewController(context: Context) -> UIImagePickerController {
        let picker = UIImagePickerController()
        picker.delegate = context.coordinator
        picker.sourceType = .photoLibrary
        return picker
    }

    func updateUIViewController(_ uiViewController: UIImagePickerController, context: Context) {}

    final class Coordinator: NSObject, UIImagePickerControllerDelegate, UINavigationControllerDelegate {
        let parent: ImagePicker

        init(parent: ImagePicker) {
            self.parent = parent
        }

        func imagePickerController(
            _ picker: UIImagePickerController,
            didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey : Any]
        ) {
            parent.selectedImage = info[.originalImage] as? UIImage
            parent.dismiss()
        }

        func imagePickerControllerDidCancel(_ picker: UIImagePickerController) {
            parent.dismiss()
        }
    }
}
```

Utilisation côté SwiftUI :

```swift
struct ProfileImageView: View {
    @State private var image: UIImage?
    @State private var showPicker = false

    var body: some View {
        VStack(spacing: 16) {
            if let image {
                Image(uiImage: image)
                    .resizable()
                    .scaledToFill()
                    .frame(width: 120, height: 120)
                    .clipShape(Circle())
            }

            Button("Choisir une photo") {
                showPicker = true
            }
        }
        .sheet(isPresented: $showPicker) {
            ImagePicker(selectedImage: $image)
        }
    }
}
```

## 5. Remonter des données vers SwiftUI

Tu peux remonter une valeur avec :

```swift
@Binding var selectedImage: UIImage?
```

Ou avec une closure :

```swift
let onSelect: (UIImage) -> Void
```

`@Binding` est pratique quand SwiftUI possède déjà la valeur. Une closure est pratique pour déclencher une action métier.

## 6. Intégrer un SDK UIKit

Beaucoup de SDK anciens ou spécialisés fournissent un `UIViewController` UIKit. Le principe reste le même :

```text
SDK UIKit
→ UIViewControllerRepresentable
→ Coordinator si delegate
→ SwiftUI View
```

En entretien, tu peux dire :

> Si un SDK n’est disponible qu’en UIKit, je peux l’intégrer dans SwiftUI avec `UIViewControllerRepresentable`, gérer les callbacks avec un `Coordinator`, puis remonter les résultats avec un `@Binding` ou une closure.

## Résumé

- `UIViewRepresentable` intègre une `UIView` UIKit.
- `UIViewControllerRepresentable` intègre un `UIViewController` UIKit.
- `Coordinator` sert à gérer les delegates UIKit.
- `@Binding` et closures permettent de communiquer avec SwiftUI.
- C’est la base pour intégrer un SDK UIKit dans une app SwiftUI.
