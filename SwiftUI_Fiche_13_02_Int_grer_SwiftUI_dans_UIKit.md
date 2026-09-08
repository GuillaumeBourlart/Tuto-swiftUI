# Fiche 13.02 — Intégrer SwiftUI dans UIKit

## Objectif

Savoir afficher une vue SwiftUI dans un projet UIKit existant avec `UIHostingController`.

C’est important car beaucoup d’entreprises ont encore des apps UIKit et migrent progressivement vers SwiftUI.

## 1. L’idée à comprendre

`UIHostingController` est un `UIViewController` UIKit qui contient une vue SwiftUI.

```text
Projet UIKit
→ UIViewController
→ UIHostingController
→ SwiftUI View
```

Ça permet d’ajouter de nouveaux écrans SwiftUI dans une app UIKit sans tout réécrire.

## 2. Créer une vue SwiftUI classique

```swift
import SwiftUI

struct ProfileSwiftUIView: View {
    let username: String

    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "person.circle.fill")
                .font(.system(size: 64))

            Text(username)
                .font(.title.bold())

            Text("Écran SwiftUI intégré dans UIKit")
                .foregroundStyle(.secondary)
        }
        .padding()
    }
}
```

## 3. Afficher SwiftUI depuis UIKit

```swift
import UIKit
import SwiftUI

final class ProfileViewController: UIViewController {
    override func viewDidLoad() {
        super.viewDidLoad()

        let swiftUIView = ProfileSwiftUIView(username: "Guillaume")
        let hostingController = UIHostingController(rootView: swiftUIView)

        addChild(hostingController)
        view.addSubview(hostingController.view)
        hostingController.didMove(toParent: self)

        hostingController.view.translatesAutoresizingMaskIntoConstraints = false

        NSLayoutConstraint.activate([
            hostingController.view.topAnchor.constraint(equalTo: view.topAnchor),
            hostingController.view.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            hostingController.view.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            hostingController.view.bottomAnchor.constraint(equalTo: view.bottomAnchor)
        ])
    }
}
```

Ici, l’écran UIKit contient entièrement une vue SwiftUI.

## 4. Pousser un écran SwiftUI dans une navigation UIKit

```swift
let swiftUIView = ProfileSwiftUIView(username: "Guillaume")
let controller = UIHostingController(rootView: swiftUIView)

navigationController?.pushViewController(controller, animated: true)
```

C’est très utile dans une migration progressive.

## 5. Présenter une vue SwiftUI en modal

```swift
let swiftUIView = ProfileSwiftUIView(username: "Guillaume")
let controller = UIHostingController(rootView: swiftUIView)

present(controller, animated: true)
```

## 6. Passer une action SwiftUI vers UIKit

Tu peux passer une closure à la vue SwiftUI.

```swift
struct SettingsSwiftUIView: View {
    let onClose: () -> Void

    var body: some View {
        Button("Fermer") {
            onClose()
        }
    }
}
```

Côté UIKit :

```swift
let view = SettingsSwiftUIView { [weak self] in
    self?.dismiss(animated: true)
}

let controller = UIHostingController(rootView: view)
present(controller, animated: true)
```

Attention à `[weak self]` pour éviter les retain cycles.

## 7. Migration progressive UIKit vers SwiftUI

Une stratégie réaliste en entreprise :

```text
1. Garder l’app UIKit existante
2. Créer les nouveaux écrans en SwiftUI
3. Les intégrer avec UIHostingController
4. Migrer progressivement les anciens écrans si nécessaire
```

Tu n’as pas besoin de transformer toute l’app d’un coup.

## Résumé

- `UIHostingController` permet d’afficher SwiftUI dans UIKit.
- On peut l’ajouter comme enfant, le pousser dans une navigation ou le présenter en modal.
- Les closures permettent de renvoyer des actions SwiftUI vers UIKit.
- C’est la technique principale pour migrer progressivement une app UIKit vers SwiftUI.
