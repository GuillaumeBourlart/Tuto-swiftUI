# Fiche 16.04 — Dépendances iOS : Swift Package Manager et CocoaPods

## Objectif

Savoir installer une dépendance iOS avec Swift Package Manager ou CocoaPods.

Les dépendances servent à intégrer des SDK ou librairies : Firebase, Alamofire, Kingfisher, Didit, etc.

## 1. Swift Package Manager

Swift Package Manager est intégré à Xcode.

Workflow simple :

```text
Xcode
→ File
→ Add Package Dependencies
→ coller l’URL GitHub du package
→ choisir la version
→ ajouter au target
```

Exemple d’URL :

```text
https://github.com/Alamofire/Alamofire.git
```

Ensuite tu peux importer la librairie :

```swift
import Alamofire
```

## 2. Choisir la version

Xcode propose souvent :

```text
Up to Next Major Version → choix classique
Exact Version → version précise
Branch → branche spécifique
```

En entreprise, on évite souvent de dépendre d’une branche instable.

## 3. CocoaPods

CocoaPods utilise un fichier `Podfile`.

Exemple :

```ruby
platform :ios, '16.0'

use_frameworks!

target 'MyApp' do
  pod 'Firebase/Auth'
  pod 'Firebase/Firestore'
end
```

Installation :

```bash
pod install
```

Après installation, on ouvre généralement :

```text
MyApp.xcworkspace
```

Pas seulement `MyApp.xcodeproj`.

## 4. Mettre à jour les pods

```bash
pod update
```

Ou pour un pod précis :

```bash
pod update Firebase/Auth
```

Attention : une mise à jour peut casser le build. En entreprise, on la fait prudemment.

## 5. SPM vs CocoaPods

```text
SPM → intégré à Xcode, simple, moderne
CocoaPods → encore très présent dans des projets existants
```

Aujourd’hui, beaucoup de nouvelles apps préfèrent SPM quand c’est possible.

Mais il faut savoir lire un projet CocoaPods car beaucoup d’apps existantes l’utilisent encore.

## 6. Problèmes fréquents

```text
Package non ajouté au bon target
Version incompatible iOS
Oubli d’ouvrir .xcworkspace avec CocoaPods
Conflit entre dépendances
Build cassé après update
```

## 7. Ce qu’il faut dire en entretien

> Je sais ajouter une dépendance avec SPM depuis Xcode. Je connais aussi CocoaPods, le Podfile, `pod install` et le fait d’ouvrir le `.xcworkspace`. Si un SDK a une documentation d’installation, je peux l’intégrer proprement.

## Résumé

- SPM s’ajoute directement dans Xcode.
- CocoaPods utilise un `Podfile` et `pod install`.
- Avec CocoaPods, on ouvre le `.xcworkspace`.
- Les dépendances doivent être ajoutées au bon target.
- Il faut éviter les mises à jour aveugles en entreprise.
