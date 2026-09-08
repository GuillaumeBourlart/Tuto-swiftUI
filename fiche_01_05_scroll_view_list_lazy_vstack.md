# Fiche 01.05 — ScrollView, List et LazyVStack

## Objectif

Comprendre comment afficher du contenu qui dépasse la taille de l’écran avec `ScrollView`, `List` et `LazyVStack`, et savoir quand utiliser chaque solution.

---

# 1. L’idée à comprendre

Sur iPhone, l’écran est limité.

Dès que ton contenu devient trop grand, il faut permettre à l’utilisateur de scroller.

SwiftUI propose plusieurs solutions :

- `ScrollView` pour créer une zone scrollable libre ;
- `List` pour afficher une liste native iOS ;
- `LazyVStack` pour afficher beaucoup d’éléments verticalement dans un `ScrollView` ;
- `LazyHStack` pour afficher beaucoup d’éléments horizontalement.

Résumé rapide :

```text
Contenu libre qui doit scroller       → ScrollView
Liste native avec cellules            → List
Feed custom très personnalisable      → ScrollView + LazyVStack
Liste horizontale custom              → ScrollView(.horizontal) + LazyHStack
```

---

# 2. `ScrollView`

`ScrollView` permet de rendre une zone scrollable.

Exemple simple :

```swift
struct ScrollViewExample: View {
    var body: some View {
        ScrollView { // Permet de scroller verticalement par défaut
            VStack(spacing: 16) {
                ForEach(1...30, id: \.self) { index in
                    Text("Élément \(index)")
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(.gray.opacity(0.15))
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                }
            }
            .padding()
        }
    }
}
```

Ici :

- `ScrollView` rend le contenu scrollable ;
- `VStack` empile les éléments ;
- `ForEach` crée plusieurs lignes.

---

# 3. Scroll horizontal

Tu peux aussi faire un scroll horizontal.

```swift
struct HorizontalScrollExample: View {
    var body: some View {
        ScrollView(.horizontal) { // Scroll horizontal
            HStack(spacing: 12) {
                ForEach(1...10, id: \.self) { index in
                    Text("Carte \(index)")
                        .frame(width: 120, height: 80)
                        .background(.blue.opacity(0.2))
                        .clipShape(RoundedRectangle(cornerRadius: 16))
                }
            }
            .padding()
        }
    }
}
```

C’est utile pour :

- carrousels ;
- catégories ;
- stories ;
- filtres horizontaux ;
- cartes à swiper horizontalement.

---

# 4. `List`

`List` sert à afficher une liste native iOS.

Exemple simple :

```swift
struct ListExample: View {
    let users = ["Guillaume", "Sarah", "Nina", "Lucas"]

    var body: some View {
        List(users, id: \.self) { user in
            Text(user)
        }
    }
}
```

`List` est pratique parce qu’elle gère automatiquement beaucoup de comportements natifs :

- scrolling ;
- séparation entre lignes ;
- style iOS ;
- sections ;
- swipe actions ;
- suppression ;
- navigation vers un détail.

---

# 5. Cellule custom dans une `List`

Tu peux mettre une vue personnalisée dans une `List`.

```swift
struct User: Identifiable {
    let id = UUID()
    let name: String
    let role: String
}

struct UsersListView: View {
    let users = [
        User(name: "Guillaume", role: "Développeur iOS"),
        User(name: "Sarah", role: "Designer"),
        User(name: "Lucas", role: "Backend")
    ]

    var body: some View {
        List(users) { user in
            UserRow(user: user)
        }
    }
}

struct UserRow: View {
    let user: User

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: "person.circle.fill")
                .font(.system(size: 40))
                .foregroundStyle(.blue)

            VStack(alignment: .leading) {
                Text(user.name)
                    .font(.headline)

                Text(user.role)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
        }
        .padding(.vertical, 4)
    }
}
```

À retenir :

```text
List + cellule custom = très courant dans une app iOS.
```

---

# 6. `Identifiable`

Quand tu affiches une collection dans une `List` ou un `ForEach`, SwiftUI doit identifier chaque élément.

Le plus propre est souvent de rendre ton modèle conforme à `Identifiable`.

```swift
struct Article: Identifiable {
    let id: UUID
    let title: String
    let subtitle: String
}
```

Puis :

```swift
List(articles) { article in
    Text(article.title)
}
```

Comme `Article` possède un `id`, SwiftUI sait identifier chaque ligne.

Si tu n’as pas de modèle `Identifiable`, tu peux donner un `id` manuellement :

```swift
ForEach(names, id: \.self) { name in
    Text(name)
}
```

Mais `id: \.self` est surtout adapté aux valeurs simples comme des `String` ou des `Int`.

Pour des objets réels, préfère un vrai `id` stable.

---

# 7. `LazyVStack`

`LazyVStack` ressemble à `VStack`, mais elle crée les vues progressivement quand elles deviennent nécessaires.

Elle est souvent utilisée dans un `ScrollView`.

```swift
struct LazyVStackExample: View {
    var body: some View {
        ScrollView {
            LazyVStack(spacing: 12) { // Les éléments sont créés progressivement
                ForEach(1...1000, id: \.self) { index in
                    Text("Élément \(index)")
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(.gray.opacity(0.15))
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                }
            }
            .padding()
        }
    }
}
```

`LazyVStack` est utile quand tu as beaucoup d’éléments ou un design très custom.

---

# 8. `VStack` vs `LazyVStack`

`VStack` crée tous ses enfants directement.

`LazyVStack` crée les éléments au fur et à mesure.

```text
Petit contenu fixe       → VStack
Beaucoup d’éléments      → LazyVStack
Feed custom              → LazyVStack
Liste native iOS         → List
```

Exemple :

```swift
ScrollView {
    VStack {
        // OK pour peu d’éléments
    }
}
```

Mais pour une grande liste :

```swift
ScrollView {
    LazyVStack {
        // Mieux pour beaucoup d’éléments
    }
}
```

---

# 9. `LazyHStack`

`LazyHStack` est la version horizontale de `LazyVStack`.

```swift
struct LazyHStackExample: View {
    var body: some View {
        ScrollView(.horizontal) {
            LazyHStack(spacing: 12) {
                ForEach(1...100, id: \.self) { index in
                    Text("Carte \(index)")
                        .frame(width: 120, height: 80)
                        .background(.orange.opacity(0.2))
                        .clipShape(RoundedRectangle(cornerRadius: 16))
                }
            }
            .padding()
        }
    }
}
```

C’est utile pour des carrousels avec beaucoup d’éléments.

---

# 10. `List` avec sections

`List` permet aussi de créer des sections.

```swift
struct SettingsListView: View {
    var body: some View {
        List {
            Section("Compte") {
                Text("Profil")
                Text("Sécurité")
            }

            Section("Application") {
                Text("Notifications")
                Text("Apparence")
            }
        }
    }
}
```

C’est très utile pour des écrans comme :

- réglages ;
- profil ;
- paramètres ;
- formulaires organisés ;
- menus internes.

---

# 11. Swipe actions dans une `List`

`List` permet facilement d’ajouter des actions au swipe.

```swift
struct SwipeActionsExample: View {
    let messages = ["Message 1", "Message 2", "Message 3"]

    var body: some View {
        List(messages, id: \.self) { message in
            Text(message)
                .swipeActions {
                    Button("Supprimer", role: .destructive) {
                        print("Supprimer \(message)")
                    }
                }
        }
    }
}
```

C’est un avantage de `List` par rapport à un `ScrollView` custom.

---

# 12. Refresh avec `refreshable`

Tu peux ajouter un pull-to-refresh avec `.refreshable`.

```swift
struct RefreshableListExample: View {
    @State private var users = ["Guillaume", "Sarah", "Lucas"]

    var body: some View {
        List(users, id: \.self) { user in
            Text(user)
        }
        .refreshable {
            await reloadUsers()
        }
    }

    func reloadUsers() async {
        // Ici tu pourrais rappeler une API
        users.append("Nouvel utilisateur")
    }
}
```

`refreshable` est très utile pour :

- feeds ;
- listes d’articles ;
- messages ;
- données venant d’une API.

---

# 13. Quand utiliser `ScrollView`, `List` ou `LazyVStack` ?

## Utilise `ScrollView` quand :

- tu as un écran libre avec plusieurs blocs ;
- tu ne veux pas le style natif d’une liste ;
- tu veux scroller une page complète ;
- tu veux mélanger plusieurs sections custom.

Exemple :

```swift
ScrollView {
    HeaderView()
    StatsView()
    RecentItemsView()
}
```

---

## Utilise `List` quand :

- tu veux une liste native iOS ;
- tu as des lignes classiques ;
- tu veux des sections ;
- tu veux des swipe actions ;
- tu veux un écran de réglages ;
- tu veux une navigation liste → détail simple.

Exemple :

```swift
List(users) { user in
    UserRow(user: user)
}
```

---

## Utilise `ScrollView + LazyVStack` quand :

- tu veux un feed très custom ;
- tu veux contrôler complètement le design ;
- tu as beaucoup d’éléments ;
- `List` te limite visuellement ;
- tu veux éviter le style natif des cellules.

Exemple :

```swift
ScrollView {
    LazyVStack(spacing: 16) {
        ForEach(posts) { post in
            PostCardView(post: post)
        }
    }
    .padding()
}
```

---

# 14. Exemple réaliste : feed custom

```swift
struct Post: Identifiable {
    let id = UUID()
    let author: String
    let content: String
}

struct FeedView: View {
    let posts = [
        Post(author: "Guillaume", content: "Premier post SwiftUI"),
        Post(author: "Sarah", content: "Aujourd’hui je teste une nouvelle app"),
        Post(author: "Lucas", content: "SwiftUI est plutôt agréable")
    ]

    var body: some View {
        ScrollView {
            LazyVStack(spacing: 16) {
                ForEach(posts) { post in
                    PostCardView(post: post)
                }
            }
            .padding()
        }
    }
}

struct PostCardView: View {
    let post: Post

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: "person.circle.fill")
                    .font(.title)
                    .foregroundStyle(.blue)

                Text(post.author)
                    .font(.headline)
            }

            Text(post.content)
                .font(.body)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(.gray.opacity(0.1))
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }
}
```

Ici, `ScrollView + LazyVStack` donne plus de contrôle visuel qu’une `List`.

---

# En UIKit (rappel)

En UIKit, un contenu plus grand que l’écran passait par `UIScrollView` : tu ajoutais ta vue et tu devais gérer toi-même le `contentSize` (et souvent les contraintes).

```swift
let scrollView = UIScrollView()
let content = UILabel()
// ... layout via Auto Layout ...
scrollView.contentSize = content.bounds.size // À calculer/maintenir à la main
```

Pour une liste, c’était `UITableView` avec un `dataSource`/`delegate`, et surtout la RÉUTILISATION manuelle des cellules via `dequeueReusableCell` (sinon des centaines de cellules instanciées et des fuites de mémoire) :

```swift
func numberOfSections(in tableView: UITableView) -> Int { 1 }

func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
    users.count
}

func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
    let cell = tableView.dequeueReusableCell(withIdentifier: "UserCell", for: indexPath)
    var config = cell.defaultContentConfiguration() // iOS 14+, remplace textLabel
    config.text = users[indexPath.row]
    cell.contentConfiguration = config
    return cell
}
```

La version moderne (iOS 13+) remplace `dataSource`/`reloadData()` par un `UITableViewDiffableDataSource`, qui calcule les diffs et anime les changements à ta place :

```swift
let dataSource = UITableViewDiffableDataSource<Section, User>(tableView: tableView) {
    tableView, indexPath, user in
    let cell = tableView.dequeueReusableCell(withIdentifier: "UserCell", for: indexPath)
    var config = cell.defaultContentConfiguration()
    config.text = user.name
    cell.contentConfiguration = config
    return cell
}

var snapshot = NSDiffableDataSourceSnapshot<Section, User>()
snapshot.appendSections([.main])
snapshot.appendItems(users)
dataSource.apply(snapshot, animatingDifferences: true)
```

Mentalité : en UIKit tu PILOTES le tableau (recyclage, `contentSize`, `reloadData`) de façon impérative ; en SwiftUI tu DÉCRIS ton contenu et `List`/`LazyVStack` gèrent le recyclage et les mises à jour tout seuls.

👉 En SwiftUI : `List(users) { … }` ou `ScrollView { LazyVStack { … } }` recycle les vues automatiquement — plus de `dequeueReusableCell` ni de `contentSize` à gérer.

---

# 15. Points à connaître

## Ne mets pas une grande `VStack` dans un `ScrollView` si tu as énormément d’éléments

Pour une petite page, c’est correct :

```swift
ScrollView {
    VStack {
        Text("Section 1")
        Text("Section 2")
    }
}
```

Pour une grande liste, préfère :

```swift
ScrollView {
    LazyVStack {
        ForEach(items) { item in
            ItemView(item: item)
        }
    }
}
```

---

## `List` est pratique mais parfois difficile à personnaliser

`List` donne beaucoup de comportements natifs gratuitement.

Mais si tu veux un design très précis, tu seras parfois plus libre avec :

```swift
ScrollView + LazyVStack
```

---

## Évite les `ScrollView` imbriquées sans raison

Exemple à éviter si possible :

```swift
ScrollView {
    VStack {
        ScrollView {
            // autre contenu vertical
        }
    }
}
```

Des scrolls dans des scrolls peuvent créer des comportements bizarres.

Un scroll horizontal dans un scroll vertical est courant, mais deux scrolls verticaux imbriqués sont souvent une mauvaise idée.

---

# Résumé

À retenir :

- `ScrollView` rend un contenu scrollable ;
- `List` affiche une liste native iOS ;
- `LazyVStack` crée les éléments progressivement dans un scroll vertical ;
- `LazyHStack` fait pareil horizontalement ;
- `List` est pratique pour les réglages, sections et swipe actions ;
- `ScrollView + LazyVStack` est souvent mieux pour un feed très custom ;
- les éléments d’une `List` ou d’un `ForEach` doivent être identifiables ;
- pour des modèles réels, utilise souvent `Identifiable` avec un `id` stable.

