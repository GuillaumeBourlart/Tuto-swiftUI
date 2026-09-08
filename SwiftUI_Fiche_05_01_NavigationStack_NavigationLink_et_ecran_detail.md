# Fiche 05.01 — NavigationStack, NavigationLink et écran détail

> **Version :** `NavigationStack` exige iOS 16+. Les exemples du parcours ciblent iOS 17+, notamment pour les placements `.topBarTrailing`. Les `HomeView` ou modèles non définis dans un petit bloc sont des extraits de principe.

## Objectif

Savoir créer une navigation classique SwiftUI : une liste, un élément cliquable, un écran détail, un titre et une toolbar.

## 1. L’idée à comprendre

Depuis iOS 16, la navigation SwiftUI moderne repose sur `NavigationStack`. Elle remplace l’ancien `NavigationView` pour la plupart des nouveaux projets.

Structure classique :

```swift
NavigationStack {
    List(items) { item in
        NavigationLink {
            DetailView(item: item)
        } label: {
            RowView(item: item)
        }
    }
    .navigationTitle("Titre")
}
```

## 2. Exemple liste vers détail

```swift
import SwiftUI

struct Article: Identifiable {
    let id = UUID()
    let title: String
    let subtitle: String
    let content: String
}

struct ArticleListView: View {
    private let articles = [
        Article(title: "SwiftUI", subtitle: "Interface déclarative", content: "SwiftUI permet de décrire l’interface en fonction de l’état."),
        Article(title: "MVVM", subtitle: "Architecture", content: "MVVM sépare la vue, l’état et la logique."),
        Article(title: "Firebase", subtitle: "Backend", content: "Firebase permet d’ajouter auth, database, storage et notifications.")
    ]

    var body: some View {
        NavigationStack {
            List(articles) { article in
                NavigationLink {
                    ArticleDetailView(article: article)
                } label: {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(article.title)
                            .font(.headline)

                        Text(article.subtitle)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
            }
            .navigationTitle("Articles")
        }
    }
}

struct ArticleDetailView: View {
    let article: Article

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                Text(article.title)
                    .font(.largeTitle.bold())

                Text(article.subtitle)
                    .foregroundStyle(.secondary)

                Text(article.content)
                    .font(.body)
            }
            .padding()
        }
        .navigationTitle(article.title)
        .navigationBarTitleDisplayMode(.inline)
    }
}
```

`NavigationLink` crée automatiquement le lien entre la cellule et l’écran détail.

## 3. Passer des données à l’écran détail

Le plus simple est de passer l’objet directement :

```swift
ArticleDetailView(article: article)
```

C’est très courant pour une liste locale ou déjà chargée.

Dans une app plus avancée, tu peux passer seulement un identifiant :

```swift
ArticleDetailView(articleId: article.id)
```

Puis l’écran détail recharge les données depuis un service ou un ViewModel.

## 4. Toolbar simple

```swift
struct ToolbarExampleView: View {
    var body: some View {
        NavigationStack {
            Text("Contenu")
                .navigationTitle("Accueil")
                .toolbar {
                    ToolbarItem(placement: .topBarTrailing) {
                        Button {
                            print("Ajouter")
                        } label: {
                            Image(systemName: "plus")
                        }
                    }
                }
        }
    }
}
```

La toolbar sert souvent à ajouter un bouton “plus”, “modifier”, “réglages” ou “profil”.

## 5. Navigation et MVVM

La vue peut gérer une navigation simple avec `NavigationLink`. Pour une navigation déclenchée après une action, par exemple après connexion, on utilisera plutôt une navigation programmatique avec une route ou un état.

Exemple simple :

```swift
Button("Se connecter") {
    // appel login puis navigation dans la fiche suivante
}
```

## En UIKit (rappel)

En UIKit, la navigation passe par un `UINavigationController` qui empile/dépile les écrans à la main. Tu instancies le VC détail puis tu le pushes :

```swift
// Dans le VC de la liste, au tap sur une cellule
let detailVC = ArticleDetailViewController(article: article)
navigationController?.pushViewController(detailVC, animated: true)
```

Le titre et les boutons se configurent sur le `navigationItem` du VC, et le bouton retour est ajouté automatiquement (un `popViewController` implicite) :

```swift
// Dans ArticleDetailViewController
navigationItem.title = article.title

navigationItem.rightBarButtonItem = UIBarButtonItem(
    systemItem: .add,
    primaryAction: UIAction { _ in print("Ajouter") }
)
```

Différence de mentalité : UIKit est **impératif** (tu crées un objet VC et tu ordonnes `push`/`pop` au bon moment), alors que SwiftUI est **déclaratif** (tu décris « ce lien mène à cet écran » et le système gère la pile).

👉 En SwiftUI : `NavigationStack` + `NavigationLink { DetailView() }` remplacent le `UINavigationController` et le `pushViewController`, sans instancier de VC.

## Points à connaître

`NavigationStack` doit généralement entourer une grande zone de navigation, pas chaque petite cellule.

`NavigationLink` est idéal pour les listes vers détail.

Pour une app avec onglets, on met souvent une `NavigationStack` par onglet.

## Résumé

- `NavigationStack` est la base de la navigation SwiftUI moderne.
- `NavigationLink` permet d’aller vers un écran détail.
- On peut passer un objet ou un identifiant à la vue détail.
- `.navigationTitle` définit le titre de l’écran.
- `.toolbar` ajoute des actions dans la barre de navigation.

## Exercice

Reproduis la liste/détail, puis ouvre et ferme trois articles. Décris les données reçues par le détail. Transforme ensuite un lien direct en `NavigationLink(value:)` avec sa destination, en suivant la [fiche 05.04](fiche_05_04_navigation_pilotee_par_etat.md). Vérifie le retour et garde des identifiants stables pour une même donnée.
