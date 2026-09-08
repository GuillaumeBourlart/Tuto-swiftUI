# Fiche 03.10 — Grilles avec LazyVGrid et LazyHGrid

## Objectif

Comprendre comment afficher du contenu en grille dans SwiftUI avec `LazyVGrid` (grille verticale) et `LazyHGrid` (grille horizontale), et savoir paramétrer le nombre de colonnes, l’espacement et le comportement adaptatif.

---

# 1. L’idée à comprendre

`List` affiche du contenu en ligne unique. Quand tu veux plusieurs colonnes (photos, produits, contacts), tu utilises une grille.

SwiftUI propose deux conteneurs :

- `LazyVGrid` → grille verticale (les lignes s’empilent du haut vers le bas)
- `LazyHGrid` → grille horizontale (les colonnes s’empilent de gauche à droite)

Le mot `Lazy` signifie que les éléments ne sont créés qu’au moment où ils deviennent visibles. C’est essentiel pour la performance avec beaucoup d’éléments.

Une grille doit être placée dans un `ScrollView` pour permettre le défilement.

---

# 2. GridItem : la brique de configuration

Une grille se définit par un tableau de `GridItem`. Chaque `GridItem` représente une colonne (pour `LazyVGrid`) ou une ligne (pour `LazyHGrid`).

Il existe trois modes :

```swift
GridItem(.fixed(80))        // largeur fixe de 80 points
GridItem(.flexible())       // partage l'espace disponible
GridItem(.adaptive(minimum: 100)) // colonnes qui s'adaptent à l'écran
```

---

# 3. LazyVGrid simple avec colonnes fixes

```swift
struct PhotoGridView: View {
    let photos = Array(1...30).map { "Photo \($0)" }

    let columns: [GridItem] = [
        GridItem(.flexible()),
        GridItem(.flexible()),
        GridItem(.flexible())
    ]

    var body: some View {
        ScrollView {
            LazyVGrid(columns: columns, spacing: 12) {
                ForEach(photos, id: \.self) { photo in
                    Text(photo)
                        .frame(maxWidth: .infinity)
                        .frame(height: 80)
                        .background(.blue.opacity(0.2))
                        .cornerRadius(8)
                }
            }
            .padding()
        }
    }
}
```

Ici on a toujours 3 colonnes, peu importe la taille de l’écran.

---

# 4. LazyVGrid adaptative (recommandé en pratique)

`.adaptive` est le mode le plus utile : SwiftUI choisit lui-même combien de colonnes afficher selon la largeur disponible.

```swift
struct AdaptivePhotoGridView: View {
    let photos = Array(1...30).map { "Photo \($0)" }

    let columns = [
        GridItem(.adaptive(minimum: 100), spacing: 12)
    ]

    var body: some View {
        ScrollView {
            LazyVGrid(columns: columns, spacing: 12) {
                ForEach(photos, id: \.self) { photo in
                    Text(photo)
                        .frame(maxWidth: .infinity)
                        .frame(height: 100)
                        .background(.green.opacity(0.2))
                        .cornerRadius(8)
                }
            }
            .padding()
        }
    }
}
```

Sur un iPhone, tu auras peut-être 3 colonnes. Sur un iPad, 6 ou 8. C’est automatique.

---

# 5. Mélanger les types de colonnes

Tu peux mélanger fixe et flexible pour des layouts plus précis.

```swift
let columns: [GridItem] = [
    GridItem(.fixed(60)),
    GridItem(.flexible()),
    GridItem(.fixed(60))
]
```

Utile pour une grille type "icône / texte / bouton".

---

# 6. LazyHGrid (grille horizontale)

Mêmes principes mais avec des lignes au lieu de colonnes, et un `ScrollView` horizontal.

```swift
struct HorizontalGridView: View {
    let items = Array(1...20).map { "Item \($0)" }

    let rows: [GridItem] = [
        GridItem(.flexible()),
        GridItem(.flexible())
    ]

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            LazyHGrid(rows: rows, spacing: 12) {
                ForEach(items, id: \.self) { item in
                    Text(item)
                        .frame(width: 100, height: 80)
                        .background(.orange.opacity(0.2))
                        .cornerRadius(8)
                }
            }
            .padding()
        }
    }
}
```

Cas typiques : carrousel de catégories, suggestions horizontales, stories.

---

# 7. Grille avec sections

`LazyVGrid` accepte des `Section` comme une `List`.

```swift
struct SectionedGridView: View {
    let columns = [GridItem(.adaptive(minimum: 100))]

    var body: some View {
        ScrollView {
            LazyVGrid(columns: columns, spacing: 12, pinnedViews: [.sectionHeaders]) {
                Section(header: sectionHeader("Favoris")) {
                    ForEach(1...6, id: \.self) { i in
                        cell("F\(i)", color: .yellow)
                    }
                }

                Section(header: sectionHeader("Récents")) {
                    ForEach(1...10, id: \.self) { i in
                        cell("R\(i)", color: .blue)
                    }
                }
            }
            .padding()
        }
    }

    private func sectionHeader(_ title: String) -> some View {
        Text(title)
            .font(.headline)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.vertical, 8)
            .background(.background)
    }

    private func cell(_ text: String, color: Color) -> some View {
        Text(text)
            .frame(maxWidth: .infinity)
            .frame(height: 80)
            .background(color.opacity(0.2))
            .cornerRadius(8)
    }
}
```

`pinnedViews: [.sectionHeaders]` permet de garder le header collé en haut pendant le scroll.

---

# 8. Exemple concret : grille de produits

```swift
struct Product: Identifiable {
    let id = UUID()
    let name: String
    let price: Double
    let imageName: String
}

struct ProductGridView: View {
    let products: [Product] = [
        Product(name: "Casque", price: 79.99, imageName: "headphones"),
        Product(name: "Souris", price: 29.99, imageName: "computermouse"),
        Product(name: "Clavier", price: 89.99, imageName: "keyboard"),
        Product(name: "Écran", price: 299.99, imageName: "display")
    ]

    let columns = [GridItem(.adaptive(minimum: 150), spacing: 16)]

    var body: some View {
        ScrollView {
            LazyVGrid(columns: columns, spacing: 16) {
                ForEach(products) { product in
                    ProductCard(product: product)
                }
            }
            .padding()
        }
    }
}

struct ProductCard: View {
    let product: Product

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Image(systemName: product.imageName)
                .resizable()
                .scaledToFit()
                .frame(height: 80)
                .frame(maxWidth: .infinity)
                .padding()
                .background(.gray.opacity(0.1))
                .cornerRadius(8)

            Text(product.name)
                .font(.headline)

            Text("\(product.price, specifier: "%.2f") €")
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
        .padding(8)
        .background(Color(.secondarySystemBackground))
        .cornerRadius(12)
    }
}
```

Cette grille s’adapte automatiquement à la taille de l’écran (iPhone, iPad, paysage).

---

# 9. Performance : Lazy vs non-Lazy

Il existe aussi `Grid` (sans Lazy) depuis iOS 16, mais il charge tout en une fois.

- `Grid` → pour quelques éléments fixes (formulaires, tableaux courts)
- `LazyVGrid` / `LazyHGrid` → pour des listes longues qui défilent

Pour une grille de photos d’une galerie, utilise toujours la version Lazy.

---

# En UIKit (rappel)

En UIKit, une grille passait par `UICollectionView` + un layout. Tu décrivais le nombre de colonnes via un `UICollectionViewCompositionalLayout` (ou l'ancien `UICollectionViewFlowLayout`), tu enregistrais une cellule recyclée, et tu branchais une **diffable data source** pour fournir le contenu.

```swift
// Layout : 3 colonnes (équivalent de 3 GridItem(.flexible()))
let layout = UICollectionViewCompositionalLayout { _, _ in
    let item = NSCollectionLayoutItem(layoutSize: .init(
        widthDimension: .fractionalWidth(1.0 / 3.0),
        heightDimension: .fractionalHeight(1.0)))
    item.contentInsets = .init(top: 6, leading: 6, bottom: 6, trailing: 6)

    let group = NSCollectionLayoutGroup.horizontal(layoutSize: .init(
        widthDimension: .fractionalWidth(1.0),
        heightDimension: .absolute(80)), subitems: [item])

    return NSCollectionLayoutSection(group: group)
}
```

```swift
// Cellule recyclée + diffable data source (iOS 14+)
let cellRegistration = UICollectionView.CellRegistration<UICollectionViewCell, String> { cell, _, photo in
    var content = cell.defaultContentConfiguration()
    content.text = photo
    cell.contentConfiguration = content
}

let dataSource = UICollectionViewDiffableDataSource<Int, String>(collectionView: collectionView) {
    collectionView, indexPath, photo in
    collectionView.dequeueConfiguredReusableCell(
        using: cellRegistration, for: indexPath, item: photo)
}

var snapshot = NSDiffableDataSourceSnapshot<Int, String>()
snapshot.appendSections([0])
snapshot.appendItems(photos)
dataSource.apply(snapshot, animatingDifferences: true)
```

Mentalité : en UIKit tu pilotes **impérativement** un layout, un recyclage de cellules et une data source à synchroniser à la main. En SwiftUI, tu **décris** simplement la grille et son contenu, et le framework gère le reste.

👉 En SwiftUI : `LazyVGrid` / `LazyHGrid` + un tableau de `GridItem` dans un `ScrollView`, sans data source ni délégué.

---

# 10. Points à connaître

## Toujours dans un ScrollView

```swift
ScrollView {
    LazyVGrid(columns: columns) { ... }
}
```

Sans `ScrollView`, la grille ne défile pas et peut être tronquée.

---

## Préfère `.adaptive` pour de vraies apps

`.adaptive(minimum: ...)` gère iPhone, iPad et orientation gratuitement. Tu n’as pas besoin d’écrire de code spécifique par appareil.

---

## Le spacing existe à deux niveaux

```swift
LazyVGrid(columns: [GridItem(.flexible(), spacing: 12)], spacing: 16)
```

- `spacing` dans `GridItem` → espace **entre colonnes**
- `spacing` du `LazyVGrid` → espace **entre lignes**

---

## Identifiable ou id explicite

`ForEach` a besoin d’une identité stable. Utilise `Identifiable` sur ton modèle ou `id: \.self` pour les types simples comme `String`.

---

# Résumé

À retenir :

- `LazyVGrid` = grille verticale, `LazyHGrid` = grille horizontale ;
- une grille doit être placée dans un `ScrollView` ;
- chaque colonne ou ligne est définie par un `GridItem` ;
- `.fixed` = largeur fixe, `.flexible` = partage l’espace, `.adaptive` = nombre de colonnes auto ;
- `.adaptive` est le plus utile pour gérer iPhone et iPad sans code spécifique ;
- les sections fonctionnent comme dans `List`, avec `pinnedViews` pour coller les headers ;
- `Lazy` charge les éléments à la volée → essentiel pour les longues listes ;
- pour de petites grilles fixes, `Grid` (iOS 16+) peut suffire.
