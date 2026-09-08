# Fiche 00.00 — Ton parcours UIKit → SwiftUI

## Objectif

Tu as déjà livré des apps UIKit : tu apprends une autre façon de construire l’interface, avec des bases iOS déjà acquises. L’objectif est de pouvoir développer, déboguer et expliquer une fonctionnalité SwiftUI dans un projet d’équipe.

## 1. Ce cours est-il adapté à ton profil ?

Oui, comme support de transition et bibliothèque de référence. Ses points forts : les comparaisons UIKit, le réseau, les tests, l’intégration entre frameworks et le projet fil rouge. Mais lire toutes les fiches dans l’ordre numérique serait peu efficace : les mémos Swift, les sujets avancés et plusieurs solutions de backend interrompraient l’apprentissage de SwiftUI.

Le parcours de l’accueil sélectionne les fiches utiles et commence par l’interface, l’état et la navigation. Les compléments restent accessibles. Une fiche « validée » signifie que tu as pratiqué ; ouvrir une page la marque seulement « en cours ».

## 2. Ce que tu gardes de UIKit

| Acquis | Ce qui reste utile | Ce que tu adaptes |
|---|---|---|
| Swift, structs/classes, protocoles, closures, ARC | Le langage et la gestion des références | Les vues sont des descriptions de valeurs ; leur identité compte |
| URLSession, HTTP, Codable, services, erreurs | Les mêmes modèles et clients réseau peuvent servir | Le déclenchement du chargement et l’affichage de son état |
| Règles métier, validation, tests | Elles ne dépendent pas du framework d’interface | Leur connexion à des propriétés observables |
| Core Data, fichiers, Keychain, UserDefaults | Les mécanismes de stockage existent toujours | SwiftUI offre des points d’intégration ; SwiftData est un choix supplémentaire |
| Accessibilité, localisation, permissions | Les besoins utilisateurs et les contraintes iOS | La syntaxe des composants et des modificateurs |
| Git, revue de code, signature, TestFlight, publication | Ton expérience de livraison est réutilisable | Apprendre à relire du SwiftUI et ses problèmes d’état |
| UIKit et ses composants | Utiles dans les apps hybrides et pour certains besoins | `UIHostingController` et les representables font le pont |

SwiftUI ne remplace ni Swift, ni Foundation, ni les services de ton application. MVVM est un choix d’organisation, pas une condition pour afficher un écran. Firebase, TCA, Alamofire et une Clean Architecture complète ne sont pas des prérequis pour apprendre SwiftUI.

## 3. Environnement du parcours

Les nouveaux exercices ciblent **iOS 17 minimum**, avec **Swift 6 et Xcode 26.6** comme environnement de vérification disponible pour cette révision. Ce n’est pas une affirmation que ces versions sont les dernières : c’est une base explicite et reproductible.

| API | Disponibilité à retenir |
|---|---|
| `@State`, `@Binding`, `ObservableObject` | SwiftUI depuis iOS 13 |
| `@StateObject` | iOS 14+ |
| `.task`, `@FocusState` | iOS 15+ |
| `NavigationStack`, `NavigationPath`, `NavigationSplitView` | iOS 16+ |
| `.navigationDestination(isPresented:)` | iOS 16+ |
| `@Observable` avec SwiftUI, `@Bindable`, `.environment(unObjetObservable)` | iOS 17+ |
| `.navigationDestination(item:)`, SwiftData, `onChange` à deux paramètres | iOS 17+ |
| Syntaxe `Tab("…", systemImage:…, value:…)` | iOS 18+ ; les exemples `tabItem`/`tag` restent utiles pour iOS 17 |
| Swift Testing | Outil de test inclus dans Xcode 16+ ; XCTest reste utile, notamment pour les tests UI |

La documentation Apple évolue : elle décrit aussi une macro `State` avec Xcode 27+. Les explications sur l’initialisation de `@State` dans ce cours concernent le property wrapper disponible dans l’environnement Xcode 26.6. Vérifie toujours **le SDK, le mode Swift, les réglages d’isolation et la cible iOS** avant de comparer deux tutoriels. Une nouveauté de SDK n’oblige pas à changer immédiatement toute l’architecture. Source : [State — Apple](https://developer.apple.com/documentation/swiftui/state).

Crée un projet iOS App dans Xcode, interface SwiftUI, langage Swift, sans stockage imposé. Garde un seul point d’entrée `@main`. Les blocs courts des anciennes fiches peuvent être des extraits ; les exemples annoncés « autonomes » définissent leurs propres types. Ne colle pas toutes les fiches dans un seul fichier : leurs noms de démonstration peuvent se répéter.

## 4. Ordre conseillé et résultat attendu

1. **Changer de modèle mental** : 00.08 puis 01.01 à 01.08. Réalise un écran de liste/détail local ; explique `body`, les modificateurs et l’identité.
2. **Comprendre l’état** : 02.01, 02.02, 02.03, **02.12 puis 02.11**, 02.07 et 02.10. Fais modifier une donnée du parent par un enfant, puis par une sheet. Revois les composants et formulaires (03.01, 03.07, 03.08).
3. **Pratiquer la navigation** : 05.01, **05.04**, 05.02, 05.03, 05.05 et 05.06. Explique ce que change chaque action dans le booléen, l’optional ou le tableau de routes.
4. **Une fonctionnalité réelle** : 06.01–06.03, 07.01–07.04, 07.07–07.08, 09.01, 02.08, 09.05. Branche une API, traite vide/erreur/annulation et garde un favori local.
5. **Préparer le travail en équipe** : découvre la famille `ObservableObject` (02.04–02.06), les ponts UIKit (13), l’accessibilité (03.12), les tests (14), le débogage et les performances (15), la revue de code et la reprise de projet (16). Termine par 17.03 et **17.05**.

Les boutons « Suite du parcours » suivent cet ordre. Les liens « dans la bibliothèque » suivent les numéros des fiches.

## 5. Comment travailler efficacement

Consacre une séance à un petit résultat observable : lire 15–20 minutes, coder 25–40 minutes, puis expliquer 5 minutes sans regarder. Ce sont des repères d’organisation, pas une promesse de durée de formation.

Pour chaque fiche :

- Écris dans « Mes notes » une phrase sur le principe et une question qui te bloque.
- Utilise « Mémoriser ce passage » sous un titre pour reprendre à cet endroit. Ce repère est manuel : faire défiler une page ne le déplace pas.
- Reproduis l’exemple, puis change une contrainte : une autre donnée, une deuxième destination, un échec réseau.
- Marque « À revoir » si tu ne sais pas justifier le comportement ; « Validée » après avoir pratiqué.
- À la séance suivante, refais un mini-exercice de la veille avant de continuer. Reviens ensuite sur tes fiches à revoir quelques jours plus tard.

La sauvegarde reste dans le navigateur utilisé et à l’adresse du site. Le bouton Exporter télécharge un fichier avec les statuts, notes, repères et la dernière fiche. Importe-le sur l’autre navigateur ou appareil. Il n’y a pas de compte ni de synchronisation distante. Conserve régulièrement un export hors du navigateur.

## 6. Diagnostic de départ : pas besoin de tout réapprendre

Sans tutoriel, sais-tu expliquer la différence struct/class, déballer un optional, passer une closure et décoder du JSON ? Si oui, utilise les fiches 00.01–00.07 comme référence. Sinon, révise seulement le point bloquant. Les fiches 00.09–00.12 sont des mémos rapides.

Même démarche pour Git, la publication et les permissions : ton expérience client compte. Investis surtout dans ce que SwiftUI change réellement : état, identité, dépendances, composition, navigation et cycle de vie des tâches.

## Exercice de départ

Choisis un écran d’une app UIKit que tu as livrée. Note ses données, ses actions, ses chargements et ses destinations. Dessine quatre états : chargement, contenu, vide, erreur. Tu le referas progressivement en SwiftUI ; garde la logique métier et les modèles quand c’est possible.

## Pour valider cette fiche

Tu peux expliquer ce que tu gardes d’UIKit, nommer les trois sujets SwiftUI prioritaires et ouvrir un projet d’entraînement avec une cible iOS explicite. Ta progression vers l’emploi se mesure ensuite avec la [grille de mise en pratique 17.05](fiche_17_05_validation_competences_emploi.md), pas avec le seul nombre de pages lues.
