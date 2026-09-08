# Fiche 12.02 — PhotosPicker et caméra

## Objectif

Savoir choisir une photo avec `PhotosPicker` et comprendre comment gérer la caméra si nécessaire.

## 1. PhotosPicker

`PhotosPicker` permet de sélectionner une image dans la galerie avec SwiftUI.

```swift
import SwiftUI
import PhotosUI

struct PhotoSelectionView: View {
    @State private var selectedItem: PhotosPickerItem?
    @State private var selectedImage: Image?
    
    var body: some View {
        VStack {
            if let selectedImage {
                selectedImage
                    .resizable()
                    .scaledToFit()
                    .frame(height: 200)
            }
            
            PhotosPicker("Choisir une photo", selection: $selectedItem, matching: .images)
        }
        .onChange(of: selectedItem) { _, newItem in
            Task {
                await loadImage(from: newItem)
            }
        }
    }
    
    private func loadImage(from item: PhotosPickerItem?) async {
        guard let item,
              let data = try? await item.loadTransferable(type: Data.self),
              let uiImage = UIImage(data: data) else {
            return
        }
        
        selectedImage = Image(uiImage: uiImage)
    }
}
```

## 2. Récupérer un UIImage

Pour uploader vers Firebase Storage ou une API, tu as souvent besoin d’un `UIImage` ou de `Data`.

```swift
@State private var selectedUIImage: UIImage?

private func loadUIImage(from item: PhotosPickerItem?) async {
    guard let item,
          let data = try? await item.loadTransferable(type: Data.self) else {
        return
    }
    
    selectedUIImage = UIImage(data: data)
}
```

## 3. Upload après sélection

```swift
if let selectedUIImage {
    Task {
        await viewModel.uploadAvatar(selectedUIImage)
    }
}
```

Le ViewModel peut ensuite envoyer l’image vers Firebase Storage ou vers une API REST.

## 4. Caméra

SwiftUI n’a pas toujours une solution native aussi directe que `PhotosPicker` pour la caméra.

Souvent, on utilise UIKit avec :

```text
UIImagePickerController
→ UIViewControllerRepresentable
→ Coordinator
→ retour de l’image vers SwiftUI
```

C’est pour ça que la partie UIKit interop est utile.

## 5. Permission caméra

Il faut ajouter dans `Info.plist` :

```text
NSCameraUsageDescription
```

Exemple de texte :

```text
Nous utilisons la caméra pour vous permettre de prendre une photo de profil.
```

## 6. Choisir entre galerie et caméra

Exemple de choix UX :

```text
Changer la photo
→ Choisir depuis la galerie
→ Prendre une photo
→ Annuler
```

En SwiftUI, on peut présenter ce choix avec `confirmationDialog`.

## En UIKit (rappel)

En UIKit, ces deux flux passent par des **view controllers présentés** que tu pilotes via leur **delegate**, et c'est toi qui gères ouverture, fermeture et récupération de l'image (impératif).

Galerie avec `PHPickerViewController` (moderne, depuis iOS 14) :

```swift
import PhotosUI

var config = PHPickerConfiguration()
config.filter = .images
config.selectionLimit = 1

let picker = PHPickerViewController(configuration: config)
picker.delegate = self
present(picker, animated: true)
```

```swift
func picker(_ picker: PHPickerViewController, didFinishPicking results: [PHPickerResult]) {
    picker.dismiss(animated: true)
    guard let provider = results.first?.itemProvider,
          provider.canLoadObject(ofClass: UIImage.self) else { return }

    provider.loadObject(ofClass: UIImage.self) { [weak self] object, _ in
        guard let image = object as? UIImage else { return }
        DispatchQueue.main.async { self?.imageView.image = image }
    }
}
```

Caméra avec `UIImagePickerController` :

```swift
let picker = UIImagePickerController()
picker.sourceType = .camera
picker.delegate = self          // UIImagePickerControllerDelegate & UINavigationControllerDelegate
present(picker, animated: true)

func imagePickerController(_ picker: UIImagePickerController,
                           didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey : Any]) {
    picker.dismiss(animated: true)
    if let image = info[.originalImage] as? UIImage {
        imageView.image = image
    }
}
```

👉 En SwiftUI : la galerie devient `PhotosPicker` / le modifier `.photosPicker` (binding + `async`, plus de delegate) ; pour la caméra, on enveloppe `UIImagePickerController` dans un `UIViewControllerRepresentable` avec un `Coordinator`.

## Résumé

- `PhotosPicker` est la solution SwiftUI moderne pour choisir une image.
- Pour uploader, il faut souvent récupérer `Data` ou `UIImage`.
- La caméra peut nécessiter UIKit via `UIImagePickerController`.
- Il faut déclarer la permission caméra dans `Info.plist`.
- Le flux classique est : sélectionner image → convertir → uploader → sauvegarder URL.
