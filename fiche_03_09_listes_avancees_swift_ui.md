# Fiche 03.09 — Listes avancées : sections, swipe, suppression, édition

## Objectif

Comprendre comment créer des listes SwiftUI plus complètes avec `List`, `Section`, `ForEach`, `swipeActions`, `.onDelete`, `.onMove` et `EditButton`.

Les listes sont utilisées partout : paramètres, messages, notifications, produits, favoris, historiques, etc.

## 1. Liste simple avec modèle Identifiable

```swift
import SwiftUI

struct TaskItem: Identifiable {
    let id = UUID()
    var title: String
    var isDone: Bool
}

struct TaskListView: View {
    @State private var tasks = [
        TaskItem(title: "Lire la documentation SwiftUI", isDone: false),
        TaskItem(title: "Créer un composant bouton", isDone: true),
        TaskItem(title: "Tester la navigation", isDone: false)
    ]
    
    var body: some View {
        List(tasks) { task in
            HStack {
                Image(systemName: task.isDone ? "checkmark.circle.fill" : "circle")
                
                Text(task.title)
            }
        }
        .navigationTitle("Tâches")
    }
}
```

`List` fonctionne très bien avec des modèles qui respectent `Identifiable`.

## 2. Liste avec Section

```swift
struct SettingsListView: View {
    var body: some View {
        List {
            Section("Compte") {
                SettingsRow(title: "Profil", icon: "person")
                SettingsRow(title: "Sécurité", icon: "lock")
            }
            
            Section("Application") {
                SettingsRow(title: "Notifications", icon: "bell")
                SettingsRow(title: "Apparence", icon: "paintbrush")
            }
        }
        .navigationTitle("Réglages")
    }
}

struct SettingsRow: View {
    let title: String
    let icon: String
    
    var body: some View {
        Label(title, systemImage: icon)
    }
}
```

`Section` permet de regrouper visuellement les éléments.

## 3. Cellule custom

```swift
struct UserRowView: View {
    let name: String
    let subtitle: String
    let imageName: String
    
    var body: some View {
        HStack(spacing: AppSpacing.medium) {
            Image(systemName: imageName)
                .font(.title2)
                .frame(width: 40, height: 40)
                .background(AppColors.cardBackground)
                .clipShape(Circle())
            
            VStack(alignment: .leading, spacing: AppSpacing.extraSmall) {
                Text(name)
                    .font(AppTypography.body.weight(.semibold))
                
                Text(subtitle)
                    .font(AppTypography.caption)
                    .foregroundStyle(AppColors.textSecondary)
            }
            
            Spacer()
        }
        .padding(.vertical, AppSpacing.small)
    }
}
```

Utilisation :

```swift
List {
    UserRowView(
        name: "Guillaume",
        subtitle: "Développeur iOS",
        imageName: "person.fill"
    )
}
```

## 4. Swipe actions

`swipeActions` permet d’ajouter des actions quand l’utilisateur glisse une cellule.

```swift
struct SwipeTaskListView: View {
    @State private var tasks = [
        TaskItem(title: "Préparer le design system", isDone: false),
        TaskItem(title: "Créer le formulaire", isDone: false)
    ]
    
    var body: some View {
        List {
            ForEach(tasks) { task in
                Text(task.title)
                    .swipeActions(edge: .trailing) {
                        Button(role: .destructive) {
                            delete(task)
                        } label: {
                            Label("Supprimer", systemImage: "trash")
                        }
                    }
                    .swipeActions(edge: .leading) {
                        Button {
                            toggleDone(task)
                        } label: {
                            Label("Terminé", systemImage: "checkmark")
                        }
                        .tint(.green)
                    }
            }
        }
    }
    
    private func delete(_ task: TaskItem) {
        tasks.removeAll { $0.id == task.id }
    }
    
    private func toggleDone(_ task: TaskItem) {
        guard let index = tasks.firstIndex(where: { $0.id == task.id }) else { return }
        tasks[index].isDone.toggle()
    }
}
```

Les swipe actions sont utiles pour supprimer, archiver, marquer comme lu, ajouter aux favoris, etc.

## 5. Suppression avec onDelete

`onDelete` fonctionne avec `ForEach`.

```swift
struct DeleteTaskListView: View {
    @State private var tasks = [
        TaskItem(title: "Créer LoginView", isDone: false),
        TaskItem(title: "Créer RegisterView", isDone: false),
        TaskItem(title: "Ajouter validation", isDone: false)
    ]
    
    var body: some View {
        List {
            ForEach(tasks) { task in
                Text(task.title)
            }
            .onDelete { offsets in
                tasks.remove(atOffsets: offsets)
            }
        }
        .navigationTitle("Tâches")
    }
}
```

`offsets` correspond aux positions des éléments supprimés dans la liste.

## 6. Déplacement avec onMove

```swift
struct MoveTaskListView: View {
    @State private var tasks = [
        TaskItem(title: "Accueil", isDone: false),
        TaskItem(title: "Recherche", isDone: false),
        TaskItem(title: "Profil", isDone: false)
    ]
    
    var body: some View {
        List {
            ForEach(tasks) { task in
                Text(task.title)
            }
            .onMove { source, destination in
                tasks.move(fromOffsets: source, toOffset: destination)
            }
        }
        .navigationTitle("Ordre des onglets")
        .toolbar {
            EditButton()
        }
    }
}
```

`EditButton` active automatiquement le mode édition de la liste.

## 7. Suppression et édition dans la même liste

```swift
struct EditableTaskListView: View {
    @State private var tasks = [
        TaskItem(title: "Écran Home", isDone: false),
        TaskItem(title: "Écran Profil", isDone: false),
        TaskItem(title: "Écran Settings", isDone: false)
    ]
    
    var body: some View {
        List {
            ForEach(tasks) { task in
                HStack {
                    Text(task.title)
                    
                    Spacer()
                    
                    if task.isDone {
                        Image(systemName: "checkmark.circle.fill")
                            .foregroundStyle(.green)
                    }
                }
            }
            .onDelete { offsets in
                tasks.remove(atOffsets: offsets)
            }
            .onMove { source, destination in
                tasks.move(fromOffsets: source, toOffset: destination)
            }
        }
        .navigationTitle("Projet")
        .toolbar {
            EditButton()
        }
    }
}
```

## 8. Navigation liste vers détail

```swift
struct Animal: Identifiable {
    let id = UUID()
    let name: String
    let type: String
}

struct AnimalListView: View {
    let animals = [
        Animal(name: "Milo", type: "Chat"),
        Animal(name: "Rex", type: "Chien")
    ]
    
    var body: some View {
        NavigationStack {
            List(animals) { animal in
                NavigationLink {
                    AnimalDetailView(animal: animal)
                } label: {
                    VStack(alignment: .leading) {
                        Text(animal.name)
                            .font(.headline)
                        
                        Text(animal.type)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
            }
            .navigationTitle("Animaux")
        }
    }
}

struct AnimalDetailView: View {
    let animal: Animal
    
    var body: some View {
        VStack(spacing: AppSpacing.medium) {
            Text(animal.name)
                .font(AppTypography.title)
            
            Text(animal.type)
                .foregroundStyle(AppColors.textSecondary)
        }
        .navigationTitle(animal.name)
    }
}
```

`NavigationLink` dans une `List` est très courant pour aller vers un écran détail.

## 9. Limites de List

`List` est très pratique, mais son style est parfois difficile à personnaliser complètement.

Pour une interface très custom, tu peux préférer :

```swift
ScrollView {
    LazyVStack(spacing: AppSpacing.medium) {
        ForEach(items) { item in
            CustomCard(item: item)
        }
    }
    .padding()
}
```

`List` est idéale pour les listes iOS classiques.

`ScrollView + LazyVStack` est mieux pour les feeds, cards custom, interfaces très visuelles ou designs plus libres.

## En UIKit (rappel)

En UIKit, une liste = un `UITableView` que tu pilotes **impérativement** : tu déclares le nombre de sections/lignes, tu configures chaque cellule, et tu gères toi-même chaque mutation du tableau de données ET du table view.

Sections et lignes via le `dataSource` :

```swift
func numberOfSections(in tableView: UITableView) -> Int { sections.count }

func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
    sections[section].items.count
}

func tableView(_ tableView: UITableView, titleForHeaderInSection section: Int) -> String? {
    sections[section].title
}
```

Swipe trailing + suppression :

```swift
func tableView(_ tableView: UITableView,
               trailingSwipeActionsConfigurationForRowAt indexPath: IndexPath)
-> UISwipeActionsConfiguration? {
    let delete = UIContextualAction(style: .destructive, title: "Supprimer") { _, _, done in
        self.tasks.remove(at: indexPath.row)
        tableView.deleteRows(at: [indexPath], with: .automatic)
        done(true)
    }
    return UISwipeActionsConfiguration(actions: [delete])
}
```

Réordonnancement + mode édition :

```swift
func tableView(_ tableView: UITableView, moveRowAt source: IndexPath, to dest: IndexPath) {
    let item = tasks.remove(at: source.row)
    tasks.insert(item, at: dest.row)
}

// Active le drag-to-reorder / boutons de suppression
tableView.setEditing(true, animated: true)
```

Aujourd'hui, on évite la synchro manuelle data/vue avec un `UITableViewDiffableDataSource` + des **snapshots** :

```swift
var snapshot = NSDiffableDataSourceSnapshot<Section, TaskItem>()
snapshot.appendSections([.main])
snapshot.appendItems(tasks, toSection: .main)
dataSource.apply(snapshot, animatingDifferences: true)
```

Différence clé de mentalité : en UIKit tu **décris les étapes** (modifier le modèle *puis* appeler `deleteRows`/`moveRow`, sans jamais désynchroniser les deux) ; en SwiftUI tu **décris l'état final** et le framework calcule les transitions.

👉 En SwiftUI : `List` + `swipeActions`, `.onDelete`, `.onMove` et `EditButton` remplacent tout ce protocole `dataSource`/`delegate`, et le snapshot diffable est implicite.

## Points à connaître

`onDelete` et `onMove` doivent être attachés à un `ForEach`, pas directement à `List`.

Pour modifier un élément, il faut retrouver son index dans le tableau.

`EditButton` fonctionne très bien avec les listes éditables.

Pour des listes très personnalisées, `LazyVStack` donne souvent plus de contrôle que `List`.

## Résumé

- `List` sert aux listes iOS classiques.
- `Section` permet de regrouper les contenus.
- `swipeActions` ajoute des actions latérales.
- `.onDelete` permet la suppression.
- `.onMove` permet le réordonnancement.
- `EditButton` active le mode édition.
- Pour un design très custom, préfère parfois `ScrollView + LazyVStack`.
