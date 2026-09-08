# Fiche 09.04 — Core Data essentiel

## Objectif

Comprendre les bases de Core Data pour stocker des données locales complexes ou offline.

Le but n’est pas de devenir expert Core Data, mais de savoir lire, expliquer et utiliser les opérations principales.

## 1. Pourquoi Core Data ?

Core Data sert à stocker localement des objets structurés.

Exemples :

- favoris ;
- historique ;
- cache offline ;
- notes ;
- messages ;
- objets liés entre eux.

Contrairement à `UserDefaults`, Core Data est fait pour gérer beaucoup d’objets, les filtrer, les trier et les modifier.

## 2. Les mots importants

```text
Entity → type d’objet stocké, par exemple FavoriteArticle
Attribute → propriété, par exemple title ou createdAt
Context → espace de travail pour lire/modifier les données
Fetch → requête pour récupérer des objets
Save → sauvegarde des changements
```

## 3. Exemple d’entité

Dans le modèle Core Data, on pourrait avoir :

```text
FavoriteArticle
- id: String
- title: String
- url: String
- createdAt: Date
```

Dans le code, Xcode peut générer une classe `FavoriteArticle` ou tu peux avoir une classe `NSManagedObject`.

## 4. Container Core Data simple

```swift
import CoreData

final class CoreDataStack {
    static let shared = CoreDataStack()
    
    let container: NSPersistentContainer
    
    private init() {
        container = NSPersistentContainer(name: "AppModel")
        container.loadPersistentStores { _, error in
            if let error {
                fatalError("Core Data error: \(error)")
            }
        }
    }
    
    var context: NSManagedObjectContext {
        container.viewContext
    }
    
    func save() throws {
        guard context.hasChanges else { return }
        try context.save() // ❌ jamais `try?` : on veut savoir si la sauvegarde échoue
    }
}
```

Dans une vraie app, on évite parfois le singleton direct et on injecte le stack/service.

⚠️ **Anti-pattern à bannir** : `try? context.save()`. Ça avale l’erreur en silence — si la sauvegarde échoue (contrainte, store corrompu, disque plein), tu ne le sais jamais et tu crois que tes données sont persistées alors qu’elles sont perdues. Toujours `do/catch` (et au minimum un log).

## 5. Ajouter un favori

```swift
final class FavoriteArticleService {
    private let context: NSManagedObjectContext
    
    init(context: NSManagedObjectContext = CoreDataStack.shared.context) {
        self.context = context
    }
    
    func addFavorite(id: String, title: String, url: String) throws {
        let favorite = FavoriteArticle(context: context)
        favorite.id = id
        favorite.title = title
        favorite.url = url
        favorite.createdAt = Date()

        do {
            try context.save()
        } catch {
            context.rollback() // on annule l'insert en mémoire si le save échoue
            throw error
        }
    }
}
```

Le principe est : créer un objet dans le contexte, remplir ses propriétés, sauvegarder.

## 6. Récupérer les favoris

```swift
func fetchFavorites() -> [FavoriteArticle] {
    let request = FavoriteArticle.fetchRequest()
    request.sortDescriptors = [
        NSSortDescriptor(key: "createdAt", ascending: false)
    ]
    
    return (try? context.fetch(request)) ?? []
}
```

Tu peux ajouter des filtres avec `NSPredicate`.

```swift
request.predicate = NSPredicate(format: "id == %@", articleId)
```

## 7. Supprimer un favori

```swift
func deleteFavorite(_ favorite: FavoriteArticle) throws {
    context.delete(favorite)
    try context.save()
}
```

## 8. Utilisation SwiftUI simple

Tu peux charger les favoris dans un ViewModel.

```swift
@MainActor
@Observable
final class FavoritesViewModel {
    var favorites: [FavoriteArticle] = []
    var errorMessage: String?

    private let service = FavoriteArticleService()

    func loadFavorites() {
        favorites = service.fetchFavorites()
    }

    func delete(_ favorite: FavoriteArticle) {
        do {
            try service.deleteFavorite(favorite)
            loadFavorites()
        } catch {
            errorMessage = "Impossible de supprimer ce favori."
        }
    }
}
```

> Note 2026 : sur un **projet neuf** iOS 17+, on utiliserait plutôt **SwiftData** (`@Model`, `@Query`) que Core Data. Core Data reste essentiel à **savoir lire** car beaucoup de projets existants l’utilisent. SwiftData est traité dans la partie persistance moderne.

## Points à connaître

Core Data n’est pas juste une base SQL simple. C’est un framework de gestion d’objets persistants.

Pour ton objectif, il faut surtout savoir : créer une entité, insérer, fetch, update, delete, sauvegarder le contexte.

## Résumé

- Core Data sert aux données locales complexes.
- Les notions clés sont Entity, Attribute, Context, Fetch et Save.
- Les opérations essentielles sont CRUD : create, read, update, delete.
- En SwiftUI, on peut passer par un service et un ViewModel.
- SwiftData est plus récent, mais Core Data reste important dans les projets existants.
