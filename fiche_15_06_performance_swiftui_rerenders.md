# Fiche 15.06 — Performance SwiftUI : re-renders et granularité @Observable

## Objectif

Comprendre quand et pourquoi une vue se recompose, diagnostiquer un re-render inutile, et limiter sa portée. En UIKit tu pilotais `reloadData`/`setNeedsLayout` à la main ; ici c'est le diffing qui décide, et `@Observable` change radicalement la granularité des recompositions.

---

## 1. Pont UIKit : qui décide de redessiner ?

En UIKit, **toi** déclenchais les mises à jour : `tableView.reloadData()`, `setNeedsLayout()`, `setNeedsDisplay()`. Le contrôle était explicite, et un re-render trop large était de **ta** faute.

En SwiftUI, tu décris un état, et le framework **recalcule `body`** quand une dépendance change, puis **diffe** l'arbre produit contre l'ancien pour ne toucher que ce qui bouge.

```swift
// Mental model : body est une fonction pure de l'état
var body: some View {
    Text(viewModel.title) // recalculée si `title` change
}
```

Deux choses différentes :
- **Recomputation de `body`** : SwiftUI rappelle ta fonction `body` (du Swift s'exécute).
- **Re-render écran** : le diffing applique seulement les vrais changements de pixels.

Un `body` rappelé n'est pas forcément cher. Le problème vient quand `body` est rappelé **trop souvent**, ou qu'il fait du **travail lourd** à chaque appel.

---

## 2. Ce qui déclenche une recomposition

SwiftUI recompute le `body` d'une vue quand :
- une dépendance lue change : `@State`, `@Binding`, propriété `@Observable` **effectivement lue** dans `body`, `Environment` lu ;
- un paramètre (init) de la `struct` View change et que la vue n'est pas considérée comme égale ;
- l'**identité** de la vue change (`id`, position dans un `ForEach`).

Point clé : SwiftUI track les dépendances **par lecture**. Si `body` ne lit pas une propriété, sa modification ne recompose pas cette vue.

---

## 3. Diagnostiquer : `Self._printChanges()`

L'outil n°1 pour savoir **pourquoi** une vue se recompose. À mettre dans `body`.

```swift
struct ProfileHeader: View {
    let user: User

    var body: some View {
        let _ = Self._printChanges() // API privée mais stable, utilisée partout
        Text(user.name)
    }
}
```

Sortie console typique :

```text
ProfileHeader: @self changed.        // la struct elle-même (un paramètre) a changé
ProfileHeader: _user changed.        // la propriété user a changé
ProfileHeader: @dependencies changed // une dépendance Observable/Environment a changé
```

Lecture :
- `@self changed` → un paramètre passé à la vue n'est plus égal (souvent une closure recréée, ou une valeur non stable).
- `_xxx changed` → la propriété `xxx` a changé.
- `@dependencies changed` → une source observée a notifié.

> `Self._printChanges()` est privée : à utiliser en debug uniquement, jamais en prod. Pratique aussi : `Self._logChanges()` en breakpoint.

---

## 4. Granularité @Observable vs ObservableObject (le gros gain)

C'est **la** raison perf majeure de migrer vers `@Observable`.

**Legacy `ObservableObject`** : `objectWillChange` est un signal **global**. Dès qu'**un seul** `@Published` change, **toutes** les vues qui observent l'objet recomposent — même celles qui ne lisent pas la propriété modifiée.

```swift
// Legacy — à éviter en code neuf
final class DashboardViewModel: ObservableObject {
    @Published var title = "Accueil"
    @Published var counter = 0
}
```

**Moderne `@Observable`** : le tracking est **par propriété lue**. Seules les vues qui lisent la propriété **modifiée** recomposent.

```swift
@Observable
final class DashboardViewModel {
    var title = "Accueil"
    var counter = 0
}
```

### Exemple chiffré — avant/après

Un écran avec 1 titre (lit `title`) et 10 cellules (lisent chacune `counter`). On modifie **uniquement** `title`.

```swift
struct DashboardView: View {
    @State private var vm = DashboardViewModel() // @Observable -> @State, pas @StateObject

    var body: some View {
        VStack {
            TitleView(title: vm.title)           // lit title
            ForEach(0..<10, id: \.self) { _ in
                CounterCell(value: vm.counter)   // lit counter
            }
        }
    }
}
```

| | Modif de `title` | Bodies recomposés |
|---|---|---|
| `ObservableObject` (`@Published`) | objectWillChange global | **11** (titre + 10 cellules) |
| `@Observable` | tracking par propriété | **1** (le titre seul) |

Passage de **11 recompositions à 1**, sans changer une ligne d'UI : juste la macro `@Observable` + `@State` au lieu de `@StateObject`. Sur une liste longue ou un timer rapide, l'écart est énorme.

> Piège : si tu lis `vm.counter` dans le `body` parent (pas dans la sous-vue), le parent redevient dépendant de `counter` et tu perds le bénéfice. Lis la propriété **au plus près** de là où elle est affichée.

---

## 5. Découper en sous-vues pour limiter la portée

Le diffing recompute `body` **par vue**. Plus une vue est grosse, plus sa recomposition est large. Découper isole les changements.

```swift
// Pas idéal : tout dans un seul body -> tout recompute quand `query` change
struct SearchScreen: View {
    @State private var query = ""
    let results: [Item]

    var body: some View {
        VStack {
            TextField("Rechercher", text: $query) // change `query`
            List(results) { item in
                ExpensiveRow(item: item)          // recomposé à chaque frappe !
            }
        }
    }
}
```

```swift
// Préférable : la liste est une sous-vue qui ne dépend QUE de results
struct SearchScreen: View {
    @State private var query = ""
    let results: [Item]

    var body: some View {
        VStack {
            TextField("Rechercher", text: $query)
            ResultsList(results: results) // ne lit pas `query` -> pas recomposée à la frappe
        }
    }
}

struct ResultsList: View {
    let results: [Item]
    var body: some View {
        List(results) { ExpensiveRow(item: $0) }
    }
}
```

**Règle pratique** : passe à une sous-vue **les données minimales** dont elle a besoin, pas le ViewModel entier. Une vue qui reçoit `let title: String` ne recompose que si `title` change ; une vue qui reçoit `let vm: DashboardViewModel` et lit plusieurs champs élargit ses dépendances.

---

## 6. `.equatable()` / EquatableView : court-circuiter une recompo

Quand une vue reçoit des paramètres et que tu veux que SwiftUI **saute** la recomposition tant que les données utiles n'ont pas changé, rends-la `Equatable`.

```swift
struct ExpensiveRow: View, Equatable {
    let item: Item

    static func == (lhs: Self, rhs: Self) -> Bool {
        lhs.item.id == rhs.item.id && lhs.item.updatedAt == rhs.item.updatedAt
    }

    var body: some View {
        let _ = Self._printChanges()
        // ... contenu coûteux à composer
        Text(item.name)
    }
}
```

Usage :

```swift
ExpensiveRow(item: item)
    .equatable() // SwiftUI compare via == avant de recomposer
```

- Si `==` renvoie `true`, SwiftUI **ne rappelle pas** `body`.
- À réserver aux vues réellement coûteuses : `==` lui-même a un coût. Pour une vue triviale, c'est contre-productif.

> Piège fréquent : une closure (`action: () -> Void`) passée en paramètre n'est jamais `==`. Si ta vue stocke une closure, SwiftUI la considère toujours changée → `Equatable` ne sert à rien tant que tu compares aussi cette closure. Compare uniquement les données.

---

## 7. Ne pas faire de travail lourd dans `body`

`body` peut être rappelé des dizaines de fois par seconde. Tout calcul, tri, formatage ou filtrage qui y vit est répété à chaque fois.

```swift
// Pas idéal : tri + formatage à CHAQUE recomposition
struct OrdersView: View {
    let orders: [Order]
    var body: some View {
        List(orders.sorted { $0.date > $1.date }) { order in // tri à chaque body !
            Text(order.amount.formatted(.currency(code: "EUR")))
        }
    }
}
```

```swift
// Préférable : le travail vit dans le ViewModel, calculé une fois quand la donnée change
@Observable
final class OrdersViewModel {
    private(set) var sortedOrders: [Order] = []

    func setOrders(_ orders: [Order]) {
        sortedOrders = orders.sorted { $0.date > $1.date } // calculé une seule fois
    }
}

struct OrdersView: View {
    let viewModel: OrdersViewModel
    var body: some View {
        List(viewModel.sortedOrders) { order in
            Text(order.amount.formatted(.currency(code: "EUR")))
        }
    }
}
```

Autres réflexes :
- **`@State` stable** : conserve les objets avec le wrapper adapté, mais garde leur initialisation légère : le property wrapper `@State` de Xcode 26.6 peut réévaluer la valeur initiale lors de la reconstruction de la struct. Ne fais pas de travail coûteux directement dans `body` (`let formatter = DateFormatter()` dans `body` recrée l'objet à chaque appel).
- Cache les `DateFormatter`/`NumberFormatter` (coûteux) ou utilise l'API `.formatted(...)` moderne.
- Pas de `print`, pas d'I/O, pas d'appel réseau dans `body`.

---

## 8. Identité : la clé du diffing

En UIKit, une cellule réutilisée gardait son identité via `dequeueReusableCell`. En SwiftUI, **l'identité** dit au diffing si une vue est « la même » (à mettre à jour) ou « une nouvelle » (à recréer + rejouer les transitions, réinitialiser le `@State`).

```swift
// Mauvais id -> recréation à chaque insertion, animations cassées, @State perdu
ForEach(items.indices, id: \.self) { i in Row(item: items[i]) }

// Bon id -> identité stable, diffing efficace
ForEach(items, id: \.id) { item in Row(item: item) } // ou items: Identifiable
```

- `id: \.self` sur des indices = anti-pattern : insérer en tête décale tout et casse l'identité.
- Forcer `.id(value)` recrée la vue quand `value` change (utile pour reset, coûteux si abusé).

---

## Points à connaître

- **`@Observable` ≠ baguette magique** : si tu lis la propriété chaude dans le `body` parent au lieu de la sous-vue, tout le parent recompose. Lis au plus près de l'affichage.
- **Closures et paramètres non `Equatable`** déclenchent `@self changed` : une `action: () -> Void` recréée à chaque parent invalide la vue enfant.
- **`@State var vm = VM()`** pour un `@Observable` (pas `@StateObject`, réservé à `ObservableObject`). `@StateObject` avec un type seulement `@Observable` ne compile pas, faute de conformance ObservableObject. `@State` peut stocker un ObservableObject mais n’observe pas ses publications internes comme le fait `@StateObject`.
- **Mesure avant d'optimiser** : `Self._printChanges()` et l'instrument **SwiftUI** (Time Profiler / View Body) d'abord. Découper et `.equatable()` à l'aveugle peut ralentir.

---

## Exercice

Prends un écran avec un `TextField` (recherche) au-dessus d'une `List` de 50 lignes affichant chacune une donnée formatée. Ajoute `let _ = Self._printChanges()` dans le `body` de la ligne, tape dans le champ, et observe que **chaque** ligne recompose à chaque frappe. Puis : (1) sors la `List` dans une sous-vue qui ne reçoit que `results`, (2) rends la ligne `Equatable` sur l'`id` de l'item. Vérifie en console que les lignes ne recomposent plus pendant la frappe.

---

## Question d'entretien

**Q : Pourquoi `@Observable` est-il plus performant qu'`ObservableObject` ?**
R : `ObservableObject` émet `objectWillChange` de façon globale : modifier un seul `@Published` recompose toutes les vues qui observent l'objet, même celles qui ne lisent pas la propriété changée. `@Observable` (macro Observation) track les dépendances **par propriété effectivement lue** dans chaque `body` : seules les vues qui lisent la propriété modifiée recomposent. Sur une liste ou un état riche, on passe de N recompositions à 1.

**Q : Comment repères-tu un re-render inutile ?**
R : J'ajoute `let _ = Self._printChanges()` dans le `body` suspect et je regarde la cause (`@self changed`, `_propriété changed`, `@dependencies changed`). `@self changed` pointe souvent une closure ou un paramètre non stable passé par le parent. Je confirme le coût avec l'instrument SwiftUI (View Body) dans Instruments, puis je corrige : découper en sous-vues, passer des données minimales, ou `.equatable()` pour court-circuiter.

**Q : Quand `.equatable()` est-il une bonne idée — et quand non ?**
R : Bonne idée sur une vue **coûteuse à composer** dont les paramètres changent rarement : `==` évite des recompositions chères. Mauvaise idée sur une vue triviale (le coût du `==` dépasse le gain) ou si la vue stocke une closure non comparable, car elle sera toujours vue comme changée.

---

## Résumé

- SwiftUI recompose `body` quand une **dépendance lue** change ; le **diffing** applique ensuite les vrais changements via l'**identité**.
- `Self._printChanges()` est l'outil de diagnostic n°1 (`@self` / `_prop` / `@dependencies`).
- `@Observable` recompose **seulement les vues qui lisent la propriété modifiée** ; `ObservableObject` les recompose **toutes** → gros gain (ex. 11 → 1).
- **Découpe** en sous-vues et passe **les données minimales**, pas le ViewModel entier, pour limiter la portée d'une recompo.
- **`.equatable()`** court-circuite la recompo des vues coûteuses ; attention aux closures non comparables.
- Sors le **travail lourd** (tri, formatage, filtrage) de `body` vers le ViewModel ; garde le `@State` stable.
- En UIKit tu pilotais `reloadData`/`setNeedsLayout` ; ici c'est le diffing qui décide, d'où l'importance d'une **identité stable**.
