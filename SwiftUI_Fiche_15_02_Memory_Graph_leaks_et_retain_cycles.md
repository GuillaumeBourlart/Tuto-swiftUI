# Fiche 15.02 — Memory Graph, leaks et retain cycles

## Objectif

Comprendre les fuites mémoire et savoir utiliser Memory Graph Debugger pour détecter un retain cycle.

En iOS, un bug mémoire peut empêcher un écran, un ViewModel ou un service d’être libéré.

## 1. L’idée à comprendre

Swift utilise ARC : Automatic Reference Counting.

Un objet est gardé en mémoire tant qu’il est référencé par au moins un autre objet.

Un retain cycle arrive quand deux objets se gardent mutuellement en mémoire.

```text
ViewModel garde Service
Service garde closure
closure garde ViewModel
→ personne n’est libéré
```

## 2. Exemple de retain cycle avec closure

```swift
final class LoginViewModel {
    var onSuccess: (() -> Void)?

    func setup() {
        onSuccess = {
            self.handleSuccess() // self est capturé fortement
        }
    }

    func handleSuccess() {
        print("Connexion réussie")
    }
}
```

Correction :

```swift
onSuccess = { [weak self] in
    self?.handleSuccess()
}
```

`[weak self]` évite que la closure garde fortement le ViewModel.

## 3. Retain cycle avec Combine

```swift
viewModel.$email
    .sink { value in
        self.validate(value) // risque de retain cycle
    }
    .store(in: &cancellables)
```

Correction :

```swift
viewModel.$email
    .sink { [weak self] value in
        self?.validate(value)
    }
    .store(in: &cancellables)
```

Combine + `sink` + `self` est un cas classique.

## 4. Delegate weak

En UIKit, les delegates doivent souvent être `weak`.

```swift
protocol MyDelegate: AnyObject {
    func didFinish()
}

final class MyService {
    weak var delegate: MyDelegate?
}
```

Sans `weak`, le service peut garder le delegate en mémoire trop longtemps.

## 5. Memory Graph Debugger

Dans Xcode :

```text
Run app
→ reproduire le flux
→ ouvrir Debug Memory Graph
→ chercher les objets qui devraient être libérés
```

À vérifier :

- un ViewModel existe encore après fermeture de l’écran ;
- un ViewController UIKit reste en mémoire ;
- une closure garde `self` ;
- un delegate n’est pas `weak`.

## 6. Méthode simple

```text
1. Ouvrir un écran
2. Fermer l’écran
3. Lancer Memory Graph
4. Chercher le ViewModel ou ViewController
5. S’il existe encore, regarder qui le retient
6. Ajouter weak self ou weak delegate si nécessaire
```

## Résumé

- ARC libère les objets quand ils ne sont plus référencés.
- Un retain cycle empêche la libération.
- Les closures doivent souvent capturer `self` avec `[weak self]`.
- Les delegates UIKit doivent souvent être `weak`.
- Memory Graph Debugger permet de voir qui retient un objet.
