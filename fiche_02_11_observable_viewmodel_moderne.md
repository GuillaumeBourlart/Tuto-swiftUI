# Fiche 02.11 — @Observable et le modèle de présentation

## Objectif

Construire un modèle observable pour une cible iOS 17+, en comprenant ses dépendances, sa durée de vie et ses bindings. Les exemples utilisent le property wrapper `State` de Xcode 26.6. Lis d’abord la carte de décision en 02.12.

## 1. Observation et ObservableObject

`@Observable` est une macro du framework Observation. Les propriétés stockées mutables admissibles sont instrumentées ; les lectures suivies permettent à SwiftUI d’invalider les vues concernées par un changement. Ce n’est pas KVO : pas d’héritage `NSObject` requis.

Une propriété calculée peut participer au suivi par les propriétés observables qu’elle lit. `@ObservationIgnored` exclut une propriété du suivi. Une classe imbriquée non observable ne devient pas observable automatiquement.

`ObservableObject` + `@Published` utilise un autre mécanisme de notification. Il reste pertinent dans l’existant. Migrer n’est pas une obligation pour chaque projet ; respecte sa cible iOS et ses conventions. Source : [Migration vers Observation — Apple](https://developer.apple.com/documentation/swiftui/migrating-from-the-observable-object-protocol-to-the-observable-macro).

## 2. Exemple autonome

```swift
import SwiftUI
import Observation

@MainActor
@Observable
final class SearchModel {
    var query = ""
    private let allNames = ["Ada", "Grace", "Margaret"]

    var results: [String] {
        query.isEmpty ? allNames : allNames.filter {
            $0.localizedCaseInsensitiveContains(query)
        }
    }
}

struct ObservationDemo: View {
    @State private var model = SearchModel()

    var body: some View {
        VStack {
            TextField("Rechercher", text: $model.query)
                .textFieldStyle(.roundedBorder)
            SearchResults(model: model)
        }
        .padding()
    }
}

struct SearchResults: View {
    let model: SearchModel

    var body: some View {
        List(model.results, id: \.self) { Text($0) }
    }
}
```

Le parent conserve le modèle, le champ édite sa propriété et l’enfant lit les résultats. Le calcul est petit et local ; un filtrage massif ou une recherche réseau appelle une autre organisation.

## 3. Conservation ne veut pas dire constructeur appelé une seule fois

Avec le property wrapper de Xcode 26.6, `@State private var model = SearchModel()` conserve la valeur installée pour l’identité de cette vue. Mais l’expression initiale peut être évaluée à chaque nouvelle construction de la struct ; des instances temporaires peuvent être créées puis abandonnées.

Garde donc l’initialisation légère, sans réseau, abonnement ni écriture. `@StateObject` utilise une initialisation différée pour un `ObservableObject` : les deux wrappers n’ont pas exactement les mêmes modalités de création.

L’état disparaît lorsque l’identité disparaît. Si deux écrans doivent partager le modèle, conserve-le plus haut puis transmets ou injecte cette instance. Source : [State — Apple](https://developer.apple.com/documentation/swiftui/state).

## 4. Quand faut-il @Bindable ?

Le parent de l’exemple peut utiliser `$model.query` **directement**, car son `@State` expose déjà un binding. En revanche, une propriété `let model` ne fournit pas `$model`. Pour un enfant éditeur, utilise :

```swift
import SwiftUI

struct QueryEditor: View {
    @Bindable var model: SearchModel

    var body: some View {
        TextField("Recherche", text: $model.query)
    }
}
```

Ce bloc réutilise `SearchModel`. Avec `@Environment(SearchModel.self)`, crée si nécessaire une variable locale `@Bindable var editableModel = model` dans `body`. Aucun `@Bindable` n’est requis pour lire une propriété observable. Source : [Bindable — Apple](https://developer.apple.com/documentation/swiftui/bindable).

## 5. @MainActor et travail asynchrone

`@Observable` ne fournit pas à lui seul une isolation des accès concurrents. Pour les modèles d’interface du cours, nous choisissons explicitement `@MainActor`. C’est une convention claire, pas une obligation universelle d’annoter toutes les classes dans Swift 6 : l’isolation peut aussi être inférée ou définie par le projet.

Un appel `await` peut suspendre la tâche ; il ne déplace pas automatiquement du calcul lourd hors du main actor. Une tâche annulée ne doit pas publier un succès tardif ou afficher l’annulation comme une panne. Voir 01.08 et 07.08.

## 6. Ce que le suivi change pour les performances

Une vue qui lit `model.title` dépend de cette propriété observable. Modifier une autre propriété non lue ne crée pas **à elle seule** cette dépendance. La vue peut néanmoins être réévaluée pour d’autres raisons : parent, environnement, identité, etc. Observation n’est pas une garantie automatique de fluidité.

Avec `ObservableObject`, la notification porte sur l’objet et peut invalider plus largement ses abonnés. Mesure le travail réel avec Instruments avant d’optimiser. Référence : [Demystify SwiftUI performance — Apple](https://developer.apple.com/videos/play/wwdc2023/10160/).

## 7. Migration à savoir lire

| Famille ObservableObject | Famille Observation |
|---|---|
| `class Model: ObservableObject` | `@Observable class Model` |
| `@Published var query` | `var query` |
| `@StateObject private var model` | `@State private var model` |
| `@ObservedObject var model` | Propriété simple, ou `@Bindable` pour l’édition |
| `@EnvironmentObject var model` | `@Environment(Model.self) var model` |
| `.environmentObject(model)` | `.environment(model)` |

`@Observable` ne produit pas le publisher `$query` d’une propriété `@Published`. Ne transforme pas mécaniquement un pipeline Combine sans revoir ce contrat. Tu peux conserver Combine dans les services d’une app qui utilise Observation.

## Exercice

Réécris `SearchModel` et `ObservationDemo` en `ObservableObject` + `@Published` + `@StateObject`. Dans l’enfant, utilise `@ObservedObject`. Puis reviens à Observation, ajoute `QueryEditor` et vérifie que modifier le champ de l’enfant actualise aussi celui du parent.

Résultat attendu : une instance partagée, aucun doublon de `query`, et une explication correcte de la projection `$` dans chaque vue. Pour comparer les constructeurs, ajoute un `print` temporaire dans `init`, provoque des mises à jour du parent et distingue nombre d’allocations et valeur effectivement conservée.

## Pour valider cette fiche

Explique pourquoi `@Observable` n’est ni une persistance, ni un propriétaire, ni un choix d’architecture MVVM complet. Cite un cas où tu garderais `ObservableObject` et un cas où tu choisirais Observation.
