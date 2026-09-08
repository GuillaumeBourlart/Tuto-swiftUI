# Fiche 07.09 — Réseau de production : pagination (offset/limit et cursor)

## Objectif

Charger une liste longue par morceaux au lieu de tout télécharger d'un coup. Tu vas voir les deux stratégies (offset/limit vs cursor), un ViewModel `@Observable` propre avec les bons états, le déclenchement du « load more », la fusion + déduplication des pages, et le pull-to-refresh.

---

## 1. Pourquoi paginer

Une liste de 10 000 lignes, tu ne la télécharges jamais d'un bloc : payload énorme, latence, mémoire, et l'utilisateur ne voit que les 10 premières. Tu charges donc une **page** à la fois et tu en demandes une nouvelle quand l'utilisateur approche du bas.

En UIKit, tu faisais ça à la main dans `tableView(_:willDisplay:forRowAt:)` (ou `scrollViewDidScroll`) en comparant `indexPath.row` au seuil. En SwiftUI, le déclencheur, c'est `.onAppear` sur le dernier item (ou `.task`). Le mécanisme de fond reste identique.

---

## 2. Offset/limit vs cursor

Deux façons de dire au serveur « donne-moi la suite ».

**Offset / limit** — `GET /items?offset=40&limit=20`. Tu demandes « 20 items à partir du 40e ».

```swift
struct Page<T> {
    let items: [T]
    let total: Int   // souvent fourni, sert à calculer hasMore
}
```

- Avantage : trivial à implémenter, on peut sauter directement à une page N.
- Inconvénient : **incohérent si la liste bouge**. Si un item est inséré pendant que tu scrolles, tout décale → doublons ou items sautés. Lourd côté DB sur les gros offsets (`OFFSET 100000` scanne 100000 lignes).

**Cursor (curseur)** — `GET /items?cursor=eyJpZCI6NDB9&limit=20`. Le serveur te renvoie un **jeton opaque** qui pointe sur « après le dernier item que tu as vu ».

```swift
struct CursorPage<T: Decodable>: Decodable {
    let items: [T]
    let nextCursor: String?   // nil => plus de pages
}
```

- Avantage : **stable** même si la liste change (le curseur encode une position, pas un index). Performant côté DB (`WHERE id > ?`). C'est le standard des grosses API (Stripe, GitHub, Slack).
- Inconvénient : pas d'accès direct à une page arbitraire, seulement « suivant ». Le client ne connaît pas le total.

Réflexe : **cursor par défaut en production**, offset/limit seulement si l'API impose ce format ou pour un dataset petit et stable.

---

## 3. L'APIClient

On part d'un client `async/await` qui renvoie une page typée cursor.

```swift
struct Article: Identifiable, Decodable, Hashable {
    let id: String
    let title: String
}

protocol ArticleService {
    /// cursor == nil => première page
    func fetchArticles(cursor: String?, limit: Int) async throws -> CursorPage<Article>
}

final class APIClient: ArticleService {
    func fetchArticles(cursor: String?, limit: Int) async throws -> CursorPage<Article> {
        var components = URLComponents(string: "https://api.example.com/articles")!
        components.queryItems = [
            URLQueryItem(name: "limit", value: String(limit)),
            cursor.map { URLQueryItem(name: "cursor", value: $0) }
        ].compactMap { $0 }

        let (data, response) = try await URLSession.shared.data(from: components.url!)
        guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            throw URLError(.badServerResponse)
        }
        return try JSONDecoder().decode(CursorPage<Article>.self, from: data)
    }
}
```

---

## 4. Le ViewModel `@Observable`

Les états distincts sont la clé : premier chargement et chargement de page suivante ne donnent **pas** la même UI.

```swift
import Observation

@MainActor
@Observable
final class ArticlesViewModel {
    private(set) var items: [Article] = []
    private(set) var isLoadingFirstPage = false
    private(set) var isLoadingMore = false
    private(set) var errorMessage: String?

    private var nextCursor: String?
    private(set) var hasMore = true

    private let service: ArticleService
    private let pageSize: Int

    init(service: ArticleService = APIClient(), pageSize: Int = 20) {
        self.service = service
        self.pageSize = pageSize
    }

    /// Premier chargement (skeleton plein écran).
    func loadFirstPage() async {
        guard !isLoadingFirstPage else { return }
        isLoadingFirstPage = true
        errorMessage = nil
        defer { isLoadingFirstPage = false }

        do {
            let page = try await service.fetchArticles(cursor: nil, limit: pageSize)
            items = page.items
            nextCursor = page.nextCursor
            hasMore = page.nextCursor != nil
        } catch {
            errorMessage = "Impossible de charger les articles."
        }
    }

    /// Page suivante (spinner en bas). Garde anti-double-chargement.
    func loadMoreIfNeeded(currentItem: Article) async {
        guard currentItem.id == items.last?.id else { return }   // déclenche sur le DERNIER seulement
        guard hasMore, !isLoadingMore, !isLoadingFirstPage else { return }

        isLoadingMore = true
        defer { isLoadingMore = false }

        do {
            let page = try await service.fetchArticles(cursor: nextCursor, limit: pageSize)
            merge(page.items)
            nextCursor = page.nextCursor
            hasMore = page.nextCursor != nil
        } catch {
            errorMessage = "Impossible de charger la suite."
        }
    }

    /// Reset complet pour le pull-to-refresh.
    func refresh() async {
        nextCursor = nil
        hasMore = true
        await loadFirstPage()
    }

    /// Fusion + déduplication par id (le serveur peut renvoyer un chevauchement).
    private func merge(_ newItems: [Article]) {
        let existingIDs = Set(items.map(\.id))
        items.append(contentsOf: newItems.filter { !existingIDs.contains($0.id) })
    }
}
```

Points importants ici :

- `guard currentItem.id == items.last?.id` : on ne déclenche le load more que sur le **vrai dernier** item, pas à chaque cellule visible.
- `guard hasMore, !isLoadingMore` : la **garde anti-double-chargement**. Sans elle, un scroll rapide lance 3 requêtes pour la même page.
- `merge` déduplique : indispensable, car offset comme cursor peuvent renvoyer un item déjà présent (insertion concurrente, chevauchement de page).
- `refresh()` remet `nextCursor` et `hasMore` à zéro **avant** de recharger : sinon tu repars du mauvais curseur.

---

## 5. La vue : états distincts + déclenchement

```swift
struct ArticlesView: View {
    @State private var viewModel = ArticlesViewModel()

    var body: some View {
        Group {
            if viewModel.isLoadingFirstPage && viewModel.items.isEmpty {
                ProgressView("Chargement…")          // état premier chargement
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                list
            }
        }
        .task {                                      // 1er chargement au montage
            if viewModel.items.isEmpty { await viewModel.loadFirstPage() }
        }
        .refreshable {                               // pull-to-refresh => reset complet
            await viewModel.refresh()
        }
    }

    private var list: some View {
        List {
            ForEach(viewModel.items) { article in
                Text(article.title)
                    .task {                          // déclencheur load more
                        await viewModel.loadMoreIfNeeded(currentItem: article)
                    }
            }

            if viewModel.isLoadingMore {             // spinner en BAS, distinct du plein écran
                HStack {
                    Spacer()
                    ProgressView()
                    Spacer()
                }
                .listRowSeparator(.hidden)
            }
        }
    }
}
```

`.task` sur la ligne est préférable à `.onAppear` : il est `async` (pas besoin de wrapper dans `Task { }`) et il s'annule automatiquement si la cellule disparaît avant la fin. La garde `currentItem.id == items.last?.id` dans le ViewModel fait le filtrage, donc poser le `.task` sur chaque ligne ne coûte rien.

---

## 6. Variante offset/limit

Si l'API ne propose pas de cursor, tu remplaces juste l'état de pagination. Le service expose alors une méthode offset/limit (`func fetchPage(offset: Int, limit: Int) async throws -> Page<Article>`) au lieu de `fetchArticles(cursor:limit:)`. Le reste du ViewModel est identique.

```swift
private var loadedCount = 0          // remplace nextCursor
private var total = Int.max          // pour calculer hasMore

func loadMoreIfNeeded(currentItem: Article) async {
    guard currentItem.id == items.last?.id, hasMore, !isLoadingMore else { return }
    isLoadingMore = true
    defer { isLoadingMore = false }

    let page = try? await service.fetchPage(offset: loadedCount, limit: pageSize)
    guard let page else { return }
    merge(page.items)
    loadedCount += page.items.count
    total = page.total
    hasMore = loadedCount < total
}
```

Note le risque : si un item est inséré entre deux requêtes, `offset` décale et tu peux avoir un doublon (rattrapé par `merge`) ou un item sauté (non rattrapable). C'est exactement la fragilité d'offset/limit.

---

## Points à connaître

- **Pas de garde anti-double-chargement = bug n°1.** Un scroll rapide ou un re-render lance plusieurs fois la même page. Toujours `guard !isLoadingMore`.
- **Toujours dédupliquer par `id`.** Ne fais jamais confiance au serveur pour ne pas renvoyer de chevauchement, surtout avec offset/limit.
- **Ne confonds pas les deux loadings.** `isLoadingFirstPage` → skeleton/plein écran ; `isLoadingMore` → spinner en bas. Réutiliser le même flag affiche un spinner plein écran à chaque page, l'app paraît cassée.
- **Reset complet au refresh.** Remets `nextCursor`/`loadedCount` et `hasMore` à zéro, sinon le pull-to-refresh repart de la mauvaise position.

---

## Exercice

Pars d'une `List` simple branchée sur un service paginé (cursor) :

1. Ajoute `loadMoreIfNeeded(currentItem:)` au ViewModel avec garde anti-double-chargement et `hasMore`.
2. Branche le déclencheur via `.task` sur la ligne et affiche un `ProgressView` en bas pendant `isLoadingMore`.
3. Ajoute `.refreshable { await viewModel.refresh() }` qui reset le curseur et recharge la première page.

Faisable en 15-20 min. Vérifie qu'un scroll rapide ne déclenche qu'**une** requête par page.

---

## Question d'entretien

**« Tu as une liste de 10 000 items à afficher. Offset ou cursor ? »**
Cursor en production. Offset/limit est simple mais incohérent dès que la liste change (doublons/items sautés sur décalage) et coûteux côté DB sur les gros offsets (`OFFSET 9000` scanne 9000 lignes). Le cursor encode une position opaque, reste stable sous insertions concurrentes et se traduit par un `WHERE id > ?` indexé. Côté UI, je charge par pages de ~20 avec un déclencheur `.task` sur le dernier item, une garde anti-double-chargement, et `LazyVStack`/`List` pour que SwiftUI ne monte que les cellules visibles.

**« Comment évites-tu de lancer plusieurs fois la requête de page suivante ? »**
Un flag `isLoadingMore` posé avant l'appel et remis à false dans un `defer`, plus une garde `guard !isLoadingMore, hasMore`. Et je ne déclenche que sur le vrai dernier item (`currentItem.id == items.last?.id`), pas sur chaque cellule visible.

**« Comment gères-tu un item qui apparaît en double entre deux pages ? »**
Déduplication par `id` à la fusion : je construis un `Set` des ids existants et je n'ajoute que les nouveaux. Indispensable car le serveur peut renvoyer un chevauchement, surtout en offset/limit sous écriture concurrente.

---

## Résumé

- Paginer = charger par pages, demander la suite quand on approche du bas.
- Cursor : stable, performant, standard prod. Offset/limit : simple mais fragile si la liste bouge.
- ViewModel `@Observable` : `items`, `nextCursor`/`loadedCount`, `isLoadingFirstPage`, `isLoadingMore`, `hasMore`, `errorMessage`.
- Déclencheur : `.task` sur le **dernier** item + garde anti-double-chargement.
- Toujours fusionner avec déduplication par `id`.
- Deux loadings distincts : skeleton plein écran (1re page) vs spinner en bas (page suivante).
- Pull-to-refresh (`.refreshable`) = reset complet du curseur puis rechargement.
