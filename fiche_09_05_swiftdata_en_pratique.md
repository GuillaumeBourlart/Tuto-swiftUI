# Fiche 09.05 — SwiftData en pratique (iOS 17+)

## Objectif (2-3 lignes)
SwiftData est le framework de persistance par défaut pour tout projet neuf iOS 17+ : un `@Model` sur une classe, un `ModelContainer` injecté sur l'`App`, `@Query` dans tes vues et la réactivité est gratuite. Core Data reste l'existant à savoir lire (NSManagedObject/NSFetchRequest) ; SwiftData en est la surcouche moderne et Swift-native. On voit ici modélisation, container/context, query, fetch hors-vue, migration et limites.

## 1. Modéliser avec `@Model`
La macro `@Model` transforme une classe normale en entité persistée. Pas de fichier `.xcdatamodeld`, le schéma est ton code.

```swift
import SwiftData

@Model
final class Task {
    @Attribute(.unique) var id: UUID      // contrainte d'unicité (upsert)
    var title: String
    var isDone: Bool
    var createdAt: Date

    // Relation : une Task appartient à une TodoList (côté inverse)
    var list: TodoList?

    init(title: String, isDone: Bool = false) {
        self.id = UUID()
        self.title = title
        self.isDone = isDone
        self.createdAt = .now
    }
}
```

- Toutes les propriétés stockées sont persistées par défaut. Pour exclure : `@Transient var draft: String = ""`.
- Types supportés : valeurs `Codable`, enums, `Date`, `Data`, autres `@Model`. Une struct `Codable` est stockée en blob.
- `@Attribute(.unique)` impose l'unicité ET fait l'upsert sur insert (remplace au lieu de dupliquer).

> Réflexe UIKit/Core Data : `@Model` remplace l'entité du `.xcdatamodeld` + la sous-classe `NSManagedObject` générée. Plus d'éditeur graphique, le modèle vit dans le code.

## 2. Relations avec `@Relationship`
Pour un one-to-many, déclare le `var` collection côté "one" et l'optionnel côté "many". `@Relationship` précise la delete rule.

```swift
@Model
final class TodoList {
    var name: String

    // one-to-many : supprimer la liste supprime ses tasks (.cascade)
    @Relationship(deleteRule: .cascade, inverse: \Task.list)
    var tasks: [Task] = []

    init(name: String) { self.name = name }
}
```

- `.cascade` : supprime les enfants. `.nullify` (défaut) : met l'inverse à `nil` sans détruire l'enfant.
- `inverse:` lie explicitement les deux côtés. Le déclarer d'un seul côté suffit, SwiftData infère l'autre.
- Tu manipules la relation comme un tableau Swift : `list.tasks.append(task)` insère et relie automatiquement.

## 3. `ModelContainer` et `modelContext`
Le container charge le schéma et le store (SQLite par défaut). Tu l'injectes une fois sur l'`App` ; chaque vue récupère le `modelContext` depuis l'environnement.

```swift
@main
struct TodoApp: App {
    var body: some Scene {
        WindowGroup { ContentView() }
        // crée/charge le store pour ces modèles
        .modelContainer(for: [TodoList.self, Task.self])
    }
}
```

```swift
struct AddTaskButton: View {
    @Environment(\.modelContext) private var context

    var body: some View {
        Button("Ajouter") {
            let task = Task(title: "Nouvelle")
            context.insert(task)           // pas besoin de save manuel ici
            // context.delete(task)        // pour supprimer
        }
    }
}
```

- `context.save()` est **automatique** : SwiftData sauvegarde en fin de cycle d'événement (autosave activé via le container). Tu appelles `try context.save()` seulement si tu as besoin de persister immédiatement (avant un fetch programmatique, un export, etc.).
- Pour un store en mémoire (preview/tests) : `.modelContainer(for: Task.self, inMemory: true)`.

> Réflexe UIKit/Core Data : `ModelContainer` ≈ `NSPersistentContainer`, `modelContext` ≈ `viewContext` (`NSManagedObjectContext`). `insert`/`delete` ≈ `context.insert(_:)` / `context.delete(_:)`.

## 4. `@Query` : lecture réactive dans une vue
`@Query` fetch + observe. Toute insertion/suppression/modif rafraîchit la vue automatiquement, sans `@Observable` ni notification.

```swift
struct TaskListView: View {
    // tri + filtre via #Predicate
    @Query(
        filter: #Predicate<Task> { !$0.isDone },
        sort: [SortDescriptor(\Task.createdAt, order: .reverse)]
    )
    private var pendingTasks: [Task]

    var body: some View {
        List(pendingTasks) { task in
            Text(task.title)
        }
    }
}
```

- `#Predicate` est typé et vérifié à la compilation (contrairement à `NSPredicate` en string).
- Tri multi-critères : passe plusieurs `SortDescriptor` dans le tableau `sort:`.
- Filtre dynamique (dépend d'un `@State`) : `@Query` ne prend pas de valeur runtime dans son initialiseur de propriété. Construis-le dans `init` :

```swift
init(showDone: Bool) {
    // type explicite : hors d'un @Query<Task>, #Predicate ne peut pas l'inférer
    _tasks = Query(
        filter: #Predicate<Task> { showDone || !$0.isDone },
        sort: \.createdAt, order: .reverse
    )
}
```

> Réflexe UIKit : `@Query` ≈ `NSFetchRequest` + `NSFetchedResultsController` réunis — fetch initial **et** mise à jour auto de l'UI, sans delegate.

## 5. Fetch programmatique (hors-vue)
Dans un ViewModel `@Observable`, un service ou une `Task { … }` (concurrence), pas de `@Query`. Tu utilises le `ModelContext` directement avec un `FetchDescriptor`.

> Attention au nom : ici le `@Model` s'appelle `Task`, ce qui masque le `Swift.Task` de la concurrence. En vrai projet, nomme plutôt ton modèle `TodoTask`/`Item` pour éviter l'ambiguïté.

```swift
@Observable
final class TaskStore {
    private let context: ModelContext
    init(context: ModelContext) { self.context = context }

    func loadDone() throws -> [Task] {
        var descriptor = FetchDescriptor<Task>(
            predicate: #Predicate { $0.isDone },
            sortBy: [SortDescriptor(\.createdAt)]
        )
        descriptor.fetchLimit = 50
        return try context.fetch(descriptor)
    }

    func count() throws -> Int {
        try context.fetchCount(FetchDescriptor<Task>())
    }
}
```

- Récupère le `ModelContext` depuis le container : `container.mainContext`, ou crée-le côté vue et passe-le au store.
- `fetchCount` compte sans charger les objets. `fetchLimit`/`fetchOffset` pour la pagination.
- Hors du main thread : utilise un `ModelActor` (acteur dédié) pour un contexte background isolé — voir limites.

## 6. Migration et limites actuelles
**Migration légère (automatique)** : ajouter une propriété optionnelle ou une nouvelle entité passe tout seul. Renommer/supprimer/changer un type = migration explicite via `VersionedSchema` + `SchemaMigrationPlan`.

```swift
enum SchemaV2: VersionedSchema {
    static var versionIdentifier = Schema.Version(2, 0, 0)
    static var models: [any PersistentModel.Type] { [Task.self, TodoList.self] }
}
```

Le `MigrationStage.lightweight(...)` ou `.custom(...)` décrit le passage V1 → V2, branché sur le container via `migrationPlan:`.

**Limites à connaître (entretien)** :
- Pas d'équivalent direct mature à `NSFetchedResultsController` sectionné, ni à toutes les options avancées de Core Data.
- Concurrence stricte (Swift 6) : `@Model` n'est pas `Sendable` ; ne fais pas circuler un objet entre contextes/threads, passe son `PersistentIdentifier`.
- `#Predicate` ne couvre pas tout `NSPredicate` (certaines opérations string/agrégats manquent ou ont évolué selon les versions iOS).
- Pas d'undo/redo aussi riche, et le contrôle fin du store (multi-store, configs nommées) est plus limité.
- API encore jeune : des bugs/changements entre iOS 17 et 18 — vise iOS 17+ et teste sur device.

## Comparatif Core Data vs SwiftData

| Critère | Core Data | SwiftData |
|---|---|---|
| Définition modèle | `.xcdatamodeld` + `NSManagedObject` | `@Model` sur une classe Swift |
| Container | `NSPersistentContainer` | `ModelContainer` (`.modelContainer(for:)`) |
| Contexte | `NSManagedObjectContext` (`viewContext`) | `ModelContext` (`@Environment` / `mainContext`) |
| Lecture en vue | `NSFetchRequest` + `NSFetchedResultsController` | `@Query` (réactif auto) |
| Prédicat | `NSPredicate` (string, runtime) | `#Predicate` (typé, compile-time) |
| Concurrence | contextes `perform`/`performBackgroundTask` | `ModelActor` |
| Maturité / contrôle fin | très mature, riche, verbeux | jeune, concis, encore limité |
| Cas idéal | app existante, besoins avancés (CloudKit fin, perfs poussées) | **projet neuf iOS 17+**, code Swift-native |

**Quand l'un, quand l'autre** : projet neuf ciblant iOS 17+ → SwiftData par défaut. App existante en Core Data, ou cible < iOS 17, ou besoin d'une fonctionnalité Core Data non encore couverte → Core Data (les deux peuvent même cohabiter sur le même store). SwiftData étant bâti **sur** Core Data, savoir lire Core Data reste indispensable.

## Points à connaître (2-4 pièges)
- **`@Query` ne prend pas de valeur runtime** dans la déclaration de propriété : pour un filtre dynamique, construis le `Query` dans l'`init` de la vue. Sinon ton predicate est figé.
- **Ne pas oublier le container** : `.modelContainer(for:)` doit lister **tous** les modèles racine ; un `@Model` lié par relation est inclus automatiquement, mais une entité orpheline non listée provoque un crash au démarrage.
- **Save automatique mais pas instantané** : si tu fais `context.insert` puis un `fetch` programmatique dans la foulée, l'objet est déjà visible dans le même contexte, mais pour traverser les contextes/threads pense au `save()` explicite.
- **Concurrence (Swift 6)** : un `@Model` n'est pas `Sendable`. Ne le passe pas entre threads ; passe son `persistentModelID` et re-fetch dans l'autre contexte.

## Exercice (concret, autonome, 10-20 min)
Modélise une **TodoList** et affiche-la.

1. Crée deux `@Model` : `TodoList` (avec `name` et `@Relationship(deleteRule: .cascade) var items: [TodoItem]`) et `TodoItem` (avec `title: String`, `isDone: Bool`, `createdAt: Date` et l'inverse `var list: TodoList?`).
2. Sur l'`App`, ajoute `.modelContainer(for: [TodoList.self, TodoItem.self])`.
3. Dans une vue, `@Query(sort: \TodoList.name) var lists: [TodoList]` et affiche-les dans une `List` avec un `NavigationLink` par liste.
4. Dans le détail, affiche `list.items` triés par `createdAt`, avec un bouton qui fait `let item = TodoItem(title: "…"); item.list = list; context.insert(item)`.
5. Ajoute le swipe-to-delete : `context.delete(item)`. Vérifie que l'UI se rafraîchit **sans** code supplémentaire (réactivité `@Query`).

Bonus : ajoute `@Attribute(.unique) var id: UUID` sur `TodoItem` et un `@Query` filtré `#Predicate { !$0.isDone }` pour n'afficher que les items en cours.

## Question d'entretien (1-3 Q AVEC réponse modèle courte)
**Q : SwiftData ou Core Data sur un projet neuf ? Quelles différences ?**
R : Sur un projet neuf ciblant iOS 17+, SwiftData par défaut : modèle en code via `@Model` (plus de `.xcdatamodeld`), `#Predicate` typé à la compilation, et `@Query` qui fetch et observe la donnée pour une UI réactive sans `NSFetchedResultsController`. Core Data reste pertinent pour l'existant, une cible < iOS 17, ou des besoins avancés que SwiftData ne couvre pas encore. SwiftData est en réalité une surcouche de Core Data : même store SQLite, ils peuvent cohabiter, et savoir lire du Core Data (NSManagedObject, NSFetchRequest) reste nécessaire.

**Q : Comment faire un fetch hors d'une vue, sans `@Query` ?**
R : Avec le `ModelContext` (ex. `container.mainContext` ou un contexte injecté) et un `FetchDescriptor` typé : `try context.fetch(FetchDescriptor<Task>(predicate:sortBy:))`. `fetchCount` pour compter sans charger, `fetchLimit`/`fetchOffset` pour paginer. En background, on passe par un `ModelActor` car un `@Model` n'est pas `Sendable`.

## Résumé (puces)
- `@Model` sur une classe = entité persistée ; propriétés stockées par défaut, `@Transient` pour exclure, `@Attribute(.unique)` pour l'unicité/upsert.
- `@Relationship(deleteRule:inverse:)` pour les relations ; `.cascade` supprime les enfants, `.nullify` (défaut) les détache.
- `.modelContainer(for:)` sur l'`App` ; `@Environment(\.modelContext)` dans les vues ; `insert`/`delete` ; `save()` auto, manuel seulement si besoin immédiat.
- `@Query(filter:sort:)` lit ET observe (réactivité gratuite) ; `#Predicate` typé ; filtre dynamique → construire le `Query` dans `init`.
- Hors-vue : `ModelContext` + `FetchDescriptor` (`fetch`, `fetchCount`, `fetchLimit`).
- Migration légère auto pour les ajouts ; `VersionedSchema` + `SchemaMigrationPlan` sinon.
- Ponts UIKit : `ModelContainer`≈`NSPersistentContainer`, `modelContext`≈`viewContext`, `@Query`≈`NSFetchRequest`+`NSFetchedResultsController`, `#Predicate`≈`NSPredicate` (mais typé).
- Défaut sur projet neuf iOS 17+ ; Core Data = l'existant à savoir lire, et la fondation sous SwiftData.
