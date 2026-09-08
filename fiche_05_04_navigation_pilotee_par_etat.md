# Fiche 05.04 — Une variable change : pourquoi un écran s’ouvre ?

## Objectif

Comprendre les différentes écritures vues dans les tutoriels et choisir la plus simple pour le besoin. Il n’y a pas de variable magique : une API de présentation ou une condition de `body` **lit cet état**. Les exemples sont indépendants ; affiche la vue de ton choix depuis l’App du projet d’entraînement.

## 1. Le mécanisme concret

Avec `@State private var showDetail = false`, une action peut écrire `showDetail = true`. **Cette ligne seule n’ouvre rien.** C’est `.navigationDestination(isPresented: $showDetail)` qui associe ce booléen à une destination dans la pile.

Le `$` fournit un binding. SwiftUI peut lire l’état **et le remettre à jour**, par exemple quand l’utilisateur revient en arrière. Tu décris la relation une fois, puis les actions font évoluer l’état.

```text
Action utilisateur → modification de l’état → API liée à cet état → interface mise à jour
Retour / fermeture → SwiftUI modifie le binding → état à nouveau cohérent
```

## 2. Carte des choix

| Intention | État / API | À utiliser quand… |
|---|---|---|
| Ouvrir un détail au toucher | `NavigationLink { Detail() }` | Le lien direct suffit, pas besoin de piloter toute la pile |
| Pousser un écran sans donnée | Booléen + `navigationDestination(isPresented:)` | Il n’y a qu’une destination conditionnelle |
| Pousser un détail avec sa donnée | Optional `Hashable` + `navigationDestination(item:)` (iOS 17+) | Une seule destination avec un élément sélectionné |
| Piloter plusieurs étapes | `[Route]` + `NavigationStack(path:)` | Deep link, retour racine, parcours à plusieurs écrans |
| Présenter un travail temporaire | `sheet(isPresented:)` ou `sheet(item:)` | Édition, création, filtre, sélection |
| Présenter en plein écran | `fullScreenCover` | Parcours visuellement séparé, onboarding par exemple |
| Changer d’espace principal | `TabView(selection:)` | Choisir un onglet ne doit pas empiler un écran |
| Basculer connexion / application | `if` ou `switch` à la racine | L’espace précédent doit être retiré de l’arbre |
| Afficher liste et détail en colonnes | `NavigationSplitView` | Interface adaptative pour iPad/Mac notamment |

Une route, un booléen et un optional sont tous de l’état. Un Router/Coordinator est une organisation de cet état et de ses actions, pas un nouveau mode de rendu SwiftUI.

## 3. Lien direct : le point de départ

Exemple autonome, iOS 16+ :

```swift
import SwiftUI

struct DirectLinkDemo: View {
    var body: some View {
        NavigationStack {
            NavigationLink("Voir Ada") {
                Text("Profil d’Ada").navigationTitle("Profil")
            }
            .navigationTitle("Équipe")
        }
    }
}
```

Aucune variable de navigation n’est nécessaire ici. Le système gère le retour. Cette forme reste utile ; elle ne devient pas « mauvaise » parce qu’un autre tutoriel utilise une enum.

## 4. Booléen : afficher un écran connu

Exemple autonome, iOS 16+ :

```swift
import SwiftUI

struct BooleanNavigationDemo: View {
    @State private var showHelp = false

    var body: some View {
        NavigationStack {
            VStack(spacing: 20) {
                Text("État : \(showHelp ? "ouvert" : "fermé")")
                Button("Aide") { showHelp = true }
            }
            .navigationTitle("Accueil")
            .navigationDestination(isPresented: $showHelp) {
                Text("Une aide à la saisie")
                    .navigationTitle("Aide")
            }
        }
    }
}
```

Clique Aide puis Retour. Le binding redevient `false`. L’écran est **poussé** dans la pile ; il n’est pas présenté comme une sheet. Référence : [navigationDestination(isPresented:) — Apple](https://developer.apple.com/documentation/swiftui/view/navigationdestination(ispresented:destination:)).

## 5. Optional : ouvrir un écran avec sa donnée

Exemple autonome, iOS 17+ :

```swift
import SwiftUI

struct SelectedPerson: Hashable {
    let id: Int
    let name: String
}

struct ItemNavigationDemo: View {
    @State private var selected: SelectedPerson?

    var body: some View {
        NavigationStack {
            Button("Profil d’Ada") {
                selected = SelectedPerson(id: 1, name: "Ada")
            }
            .navigationTitle("Équipe")
            .navigationDestination(item: $selected) { person in
                Text(person.name).navigationTitle("Profil")
            }
        }
    }
}
```

`nil` signifie aucun détail présenté par ce binding. Une valeur fournit à la fois la décision de présenter **et** la donnée. Au retour, SwiftUI remet le binding à `nil`. Tu évites le couple `showDetail = true` et `selectedPerson = nil`, qui peut représenter un état incohérent. Pour cette API, le type est `Hashable`. Source : [navigationDestination(item:) — Apple](https://developer.apple.com/documentation/swiftui/view/navigationdestination(item:destination:)).

## 6. Tableau de routes : contrôler la pile

Exemple autonome, iOS 16+ :

```swift
import SwiftUI

enum DemoRoute: Hashable {
    case person(id: Int)
    case settings
}

struct PathNavigationDemo: View {
    @State private var path: [DemoRoute] = []

    var body: some View {
        NavigationStack(path: $path) {
            List {
                NavigationLink("Ada", value: DemoRoute.person(id: 1))
                Button("Ouvrir profil puis réglages") {
                    path = [.person(id: 1), .settings]
                }
            }
            .navigationTitle("Équipe")
            .navigationDestination(for: DemoRoute.self) { route in
                switch route {
                case .person(let id):
                    VStack {
                        Text("Profil \(id)")
                        NavigationLink("Réglages", value: DemoRoute.settings)
                    }
                case .settings:
                    Button("Retour à l’accueil") { path.removeAll() }
                }
            }
        }
    }
}
```

`[]` représente la racine seule, `[.person(id: 1)]` la racine puis le profil. Chaque valeur ajoute une étape. Le bouton Retour retire la dernière valeur ; ton code peut faire `if !path.isEmpty { path.removeLast() }`. La racine n’est pas stockée dans le tableau. `NavigationLink(value:)` et `path.append(...)` alimentent le même mécanisme.

Place `.navigationDestination(for:)` sur un conteneur stable **à l’intérieur** de la stack, comme la `List`, pas dans chaque cellule construite paresseusement. Si toute ta pile doit être contrôlée par `path`, utilise des liens par valeur pour ces étapes : les destinations directes ne sont pas représentées dans ce tableau. Référence : [NavigationStack — Apple](https://developer.apple.com/documentation/swiftui/navigationstack).

### `[Route]` ou `NavigationPath` ?

`[Route]` est un tableau homogène et inspectable : une enum peut déjà décrire plusieurs types d’écran. Commence ainsi. `NavigationPath` efface les types pour mélanger plusieurs valeurs `Hashable` indépendantes ; il exige des déclarations de destinations correspondantes. Ce n’est pas « plus professionnel » par défaut. La sérialisation éventuelle impose des valeurs encodables et une stratégie de restauration. Source : [NavigationPath — Apple](https://developer.apple.com/documentation/swiftui/navigationpath).

## 7. Sheet : présentation séparée de la pile

Exemple autonome, iOS 16+ :

```swift
import SwiftUI

struct EditTarget: Identifiable {
    let id: Int
    let name: String
}

struct ItemSheetDemo: View {
    @State private var target: EditTarget?

    var body: some View {
        Button("Modifier Ada") {
            target = EditTarget(id: 1, name: "Ada")
        }
        .sheet(item: $target) { person in
            SheetContent(person: person)
        }
    }
}

struct SheetContent: View {
    let person: EditTarget
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            Text(person.name)
                .navigationTitle("Modification")
                .toolbar {
                    Button("Fermer") { dismiss() }
                }
        }
    }
}
```

`sheet(item:)` attend un type **Identifiable**, pas nécessairement Hashable. La stack dans la sheet appartient au parcours modal. Elle peut avoir son propre titre et ses propres détails sans ajouter une nouvelle stack autour de chaque écran de l’application.

Le `dismiss` doit être lu dans le contexte présenté. Celui du parent peut ne pas fermer la sheet. Une fermeture par geste met également le binding à `nil`. Dans une navigation poussée, le `dismiss` de la destination revient d’un niveau ; il ne signifie pas « retour racine ». Références : [sheet(item:) — Apple](https://developer.apple.com/documentation/swiftui/view/sheet(item:ondismiss:content:)) et [DismissAction — Apple](https://developer.apple.com/documentation/swiftui/dismissaction).

## 8. Changer la racine n’est pas un push

Avec `if session.isAuthenticated { MainView() } else { LoginView() }`, la branche affichée change. Le login ne reste pas derrière un bouton Retour. La branche retirée perd son état local ; un store conservé au-dessus, lui, survit.

Dans une vraie application, préfère un état de session explicite (`checking`, `signedOut`, `signedIn(user)`) et un service d’authentification. Un booléen de démonstration ne sécurise pas un backend. La fiche 05.06 permet d’observer le changement de racine sans installer de service externe.

## 9. Pourquoi les tutoriels diffèrent

- **Date et cible iOS** : `NavigationView` et les liens `isActive`/`tag`/`selection` apparaissent dans l’ancien code. Pour le parcours iOS 17+, pars de `NavigationStack`. Les nouvelles surcharges peuvent avoir une disponibilité différente.
- **Complexité du besoin** : un booléen suffit pour une aide ; une pile de routes permet un deep link.
- **Architecture choisie** : un Router déplace la propriété de `path` et expose des actions. Inutile de le créer avant d’en avoir besoin.
- **Type de présentation** : onglet, push, sheet et racine ne sont pas interchangeables, même s’ils affichent tous un écran.

Migration de référence : [Migrating to new navigation types — Apple](https://developer.apple.com/documentation/swiftui/migrating-to-new-navigation-types).

## Exercice : prédire avant d’exécuter

1. Enlève `.navigationDestination` du cas booléen : la variable change, aucun écran ne s’ouvre.
2. Dans le cas optional, mets `selected = nil` : le détail associé est retiré.
3. Dans le cas tableau, ouvre deux étapes puis reviens : observe le tableau raccourcir avec un `onChange` temporaire.
4. Ferme la sheet par geste puis rouvre-la : l’optional a été remis à `nil` et peut recevoir une nouvelle valeur.

## Rappel UIKit

Depuis UIKit : `pushViewController` ajoute un écran au parcours du navigation controller ; `present` ouvre une présentation ; remplacer le `rootViewController` change l’espace principal. En SwiftUI, ces intentions correspondent respectivement à une navigation dans la stack, une sheet/cover et une branche de la racine. Le fait de montrer un nouvel écran ne rend pas ces opérations équivalentes.

## Pour valider cette fiche

Explique à voix haute : « La variable n’ouvre pas un écran seule. Elle est reliée par un binding à une API qui décrit la présentation. » Choisis ensuite une solution pour un profil, une édition annulable, un lien profond et une connexion réussie, en justifiant chaque choix.
