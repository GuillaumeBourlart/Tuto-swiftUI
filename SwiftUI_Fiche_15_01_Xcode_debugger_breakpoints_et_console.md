# Fiche 15.01 — Xcode debugger, breakpoints et console

## Objectif

Savoir utiliser les outils de debug de base dans Xcode pour comprendre un bug, inspecter une variable et suivre l’exécution du code.

C’est une compétence très concrète en entreprise.

## 1. Breakpoint

Un breakpoint arrête l’exécution du programme à une ligne précise.

Tu peux en mettre un en cliquant dans la marge à gauche du code.

Exemple :

```swift
func login() async {
    isLoading = true // breakpoint ici pour vérifier que la fonction est appelée

    do {
        try await authService.login(email: email, password: password)
    } catch {
        errorMessage = "Erreur de connexion"
    }

    isLoading = false
}
```

Quand le breakpoint est atteint, tu peux inspecter les variables.

## 2. Step over / step into

Dans la barre de debug Xcode :

```text
Step over → passe à la ligne suivante sans entrer dans la fonction
Step into → entre dans la fonction appelée
Step out → ressort de la fonction actuelle
Continue → reprend l’exécution normale
```

Utilisation typique :

```text
breakpoint → inspecter variables → step over → vérifier l’état suivant
```

## 3. Console

La console affiche les logs et les erreurs.

```swift
print("Email envoyé : \(email)")
```

Pour un debug rapide, `print` suffit. Pour une app plus propre, on peut utiliser `Logger`.

```swift
import os

let logger = Logger(subsystem: "com.myapp.ios", category: "Auth")
logger.info("Tentative de connexion")
```

## 4. Inspecter une variable

Quand l’app est arrêtée sur un breakpoint, tu peux voir :

- `self` ;
- les propriétés du ViewModel ;
- les paramètres de fonction ;
- les valeurs optionnelles ;
- les erreurs capturées.

Tu peux aussi taper dans la console LLDB :

```lldb
po email
po viewModel.state
po error
```

`po` signifie “print object”.

## 5. Lire une stack trace

Une stack trace montre l’enchaînement des appels qui a mené au crash.

Exemple simplifié :

```text
LoginViewModel.login()
LoginView.buttonAction()
SwiftUI.Button
```

Tu dois chercher :

- la première ligne qui vient de ton code ;
- le fichier concerné ;
- la ligne exacte ;
- le contexte du crash.

## 6. Méthode simple pour debug un bug

```text
1. Reproduire le bug
2. Identifier l’écran concerné
3. Mettre un breakpoint dans l’action principale
4. Vérifier les valeurs importantes
5. Suivre l’exécution avec step over
6. Lire les erreurs console
7. Corriger et retester
```

## Résumé

- Breakpoint : arrête le code à une ligne.
- Step over / step into : permet de suivre l’exécution.
- Console : affiche logs et erreurs.
- LLDB avec `po` permet d’inspecter des valeurs.
- Une stack trace aide à comprendre un crash.
