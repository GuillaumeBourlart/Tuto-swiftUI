# Fiche 09.07 — Mode offline et synchronisation locale/distante

## Objectif

Faire en sorte que ton app reste utilisable sans réseau : afficher le cache local immédiatement (stale-while-revalidate), rafraîchir depuis le réseau quand c'est possible, et rejouer les écritures faites offline. On vise du **simple et robuste**, pas un moteur de sync type CloudKit/CRDT.

---

## 1. Le principe : le store local est la source de vérité

Réflexe UIKit naïf : la View appelle l'API, reçoit du JSON, l'affiche. Si pas de réseau → écran vide ou erreur.

Réflexe moderne : **l'UI n'observe jamais le réseau, elle observe le store local** (SwiftData ou fichier). Le réseau ne fait qu'**alimenter** ce store.

```text
Réseau  ──(écrit dans)──>  Store local  ──(observé par)──>  UI
```

Conséquences directes :
- offline, l'UI affiche quand même les dernières données connues ;
- un seul endroit décide ce qui s'affiche → pas de désynchro entre écrans ;
- "refresh" = relancer le réseau, pas recharger l'UI à la main.

C'est le pattern **single source of truth**. En UIKit tu le bricolais à la main (Core Data + `NSFetchedResultsController`) ; en SwiftUI c'est natif via `@Query` (SwiftData) ou un store `@Observable`.

---

## 2. Stale-while-revalidate

L'idée : **montre tout de suite le cache (potentiellement périmé), puis rafraîchis en arrière-plan**. L'utilisateur ne voit jamais de spinner plein écran si du cache existe.

```swift
@Observable
@MainActor
final class ArticlesStore {
    private(set) var articles: [Article] = []
    private(set) var isRefreshing = false

    private let api: ArticleAPI
    private let cache: ArticleCache   // lecture/écriture disque (fichier ou SwiftData)

    init(api: ArticleAPI, cache: ArticleCache) {
        self.api = api
        self.cache = cache
    }

    /// Appelée à l'apparition de l'écran.
    func load() async {
        // 1. Stale : on affiche le cache immédiatement.
        articles = (try? await cache.read()) ?? []

        // 2. Revalidate : on rafraîchit depuis le réseau.
        await refresh()
    }

    func refresh() async {
        isRefreshing = true
        defer { isRefreshing = false }
        do {
            let fresh = try await api.fetchArticles()
            articles = fresh                 // l'UI se met à jour
            try await cache.write(fresh)     // on persiste pour la prochaine fois
        } catch {
            // Offline ou erreur réseau : on garde le cache déjà affiché. On n'efface RIEN.
        }
    }
}
```

Point clé : en cas d'échec réseau, **on ne vide pas `articles`**. Le cache reste à l'écran.

Réflexe UIKit -> moderne : avant tu enchaînais `URLSession` + reload de la table ; ici `await refresh()` met à jour une propriété `@Observable` et SwiftUI re-render tout seul.

---

## 3. La couche cache (fichier simple)

Pas besoin de SwiftData pour démarrer. Un fichier JSON dans le dossier Caches suffit et reste testable.

```swift
actor ArticleCache {
    private let url: URL

    init(filename: String = "articles.json") {
        let dir = URL.cachesDirectory
        self.url = dir.appending(path: filename)
    }

    func read() async throws -> [Article] {
        guard FileManager.default.fileExists(atPath: url.path()) else { return [] }
        let data = try Data(contentsOf: url)
        return try JSONDecoder().decode([Article].self, from: data)
    }

    func write(_ articles: [Article]) async throws {
        let data = try JSONEncoder().encode(articles)
        try data.write(to: url, options: .atomic)
    }
}
```

`actor` te protège des écritures concurrentes sans `DispatchQueue` ni lock manuel. `URL.cachesDirectory` (iOS 16+) remplace le vieux `FileManager.default.urls(for:in:)`.

Note : `.cachesDirectory` peut être purgé par le système sous pression disque. Pour des données que l'utilisateur a créées et qui ne doivent PAS disparaître, utilise `URL.documentsDirectory` (ou SwiftData).

---

## 4. Détecter online/offline avec NWPathMonitor

`NWPathMonitor` (framework `Network`) te donne l'état de connexion en temps réel. On l'expose en `@Observable` pour que l'UI réagisse.

```swift
import Network

@Observable
@MainActor
final class NetworkMonitor {
    private(set) var isConnected = true

    private let monitor = NWPathMonitor()
    private let queue = DispatchQueue(label: "NetworkMonitor")

    init() {
        monitor.pathUpdateHandler = { [weak self] path in
            // Le handler arrive sur une queue background -> on repasse main.
            Task { @MainActor in
                self?.isConnected = (path.status == .satisfied)
            }
        }
        monitor.start(queue: queue)
    }

    deinit {
        monitor.cancel()
    }
}
```

Injecte-le dans l'environnement une seule fois :

```swift
@main
struct MyApp: App {
    @State private var network = NetworkMonitor()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environment(network)
        }
    }
}
```

Piège classique : `isConnected == true` ne garantit **pas** qu'une requête réussira (captive portal, serveur down, DNS). Traite-le comme un indice UI, pas comme une certitude. La vérité reste : "la requête a-t-elle marché ?".

---

## 5. Outbox : la file d'écritures à rejouer

Le cas dur de l'offline, ce sont les **écritures** (create/update/delete). Solution simple et éprouvée : quand on est offline, on enregistre l'action localement avec un flag `pending`, on l'applique **optimistement** à l'UI, et on la rejoue quand le réseau revient.

```swift
struct PendingOperation: Codable, Identifiable {
    enum Kind: String, Codable { case create, update, delete }
    let id: UUID
    let kind: Kind
    let articleID: String
    let payload: Data          // l'Article encodé ; Data() vide pour un delete
    let createdAt: Date
}
```

L'outbox est juste une liste persistée (même mécanisme que le cache) :

```swift
actor Outbox {
    private var operations: [PendingOperation] = []
    // ... read()/write() disque identiques à ArticleCache

    func enqueue(_ op: PendingOperation) async {
        operations.append(op)
        try? await persist()
    }

    func dequeue(_ id: UUID) async {
        operations.removeAll { $0.id == id }
        try? await persist()
    }

    func all() -> [PendingOperation] { operations }

    private func persist() async throws { /* écrit operations sur disque */ }
}
```

Côté store, créer un article offline = l'ajouter localement + empiler dans l'outbox :

```swift
func addArticle(_ article: Article) async {
    articles.append(article)                 // optimiste : l'UI voit l'article tout de suite
    try? await cache.write(articles)

    let op = PendingOperation(
        id: UUID(), kind: .create, articleID: article.id,
        payload: (try? JSONEncoder().encode(article)) ?? Data(),
        createdAt: .now
    )
    await outbox.enqueue(op)

    await flushOutbox()   // tente d'envoyer maintenant ; si offline, ça reste en file
}
```

---

## 6. Rejouer l'outbox quand la connexion revient

Deux déclencheurs : (a) après chaque action, (b) quand `NetworkMonitor` repasse online.

```swift
func flushOutbox() async {
    for op in await outbox.all() {
        do {
            switch op.kind {
            case .create:
                let article = try JSONDecoder().decode(Article.self, from: op.payload)
                try await api.create(article)
            case .update:
                let article = try JSONDecoder().decode(Article.self, from: op.payload)
                try await api.update(article)
            case .delete:
                try await api.delete(id: op.articleID)
            }
            await outbox.dequeue(op.id)        // succès -> on retire de la file
        } catch {
            break   // toujours offline / serveur KO : on s'arrête, on réessaiera plus tard
        }
    }
}
```

Pour déclencher au retour réseau, observe la transition dans une vue racine :

```swift
struct RootView: View {
    @Environment(NetworkMonitor.self) private var network
    @Environment(ArticlesStore.self) private var store

    var body: some View {
        ArticlesScreen()
            .onChange(of: network.isConnected) { _, isOnline in
                if isOnline {
                    Task { await store.flushOutbox() }
                }
            }
    }
}
```

Deux pièges à anticiper :
- **Idempotence** : si le flush envoie un `create` puis crashe avant le `dequeue`, tu rejoueras le même create → doublon. Mets un `id` (UUID) généré côté client dans la requête pour que le serveur déduplique (`PUT /articles/{id}`).
- **Ordre** : rejoue les opérations dans l'ordre d'enqueue (FIFO), sinon un `update` peut partir avant le `create`.

---

## 7. Conflits : last-write-wins et ses limites

Quand deux appareils modifient la même donnée offline, il faut une règle. La plus simple est **last-write-wins (LWW)** : la dernière écriture (timestamp le plus récent) gagne.

```swift
func resolve(local: Article, remote: Article) -> Article {
    local.updatedAt > remote.updatedAt ? local : remote
}
```

C'est suffisant pour 90 % des apps grand public. Mais sache ce que tu perds :

- **Perte de données silencieuse** : si A met le titre et B met le texte hors ligne, le perdant écrase l'autre champ entièrement. Pas de merge par champ.
- **Horloges non fiables** : les timestamps viennent d'appareils dont l'heure peut être fausse. Idéalement, c'est le **serveur** qui horodate (ou un compteur de version).
- **Pas d'historique** : tu ne peux pas proposer "garder les deux" à l'utilisateur.

Si ces limites posent problème, c'est le signal pour passer à du versioning (numéro de version + rejet `409 Conflict`) ou à une vraie solution de sync (CloudKit, CRDT). **Mais ne commence jamais par là** : LWW d'abord, on complexifie seulement si le métier l'exige.

---

## 8. Exposer l'état offline dans l'UI

Un simple badge suffit, branché sur le `NetworkMonitor` et sur le nombre d'opérations en attente.

```swift
struct OfflineBadge: View {
    @Environment(NetworkMonitor.self) private var network
    let pendingCount: Int

    var body: some View {
        if !network.isConnected {
            Label("Hors ligne", systemImage: "wifi.slash")
                .font(.caption.bold())
                .padding(.horizontal, 10).padding(.vertical, 5)
                .background(.orange.opacity(0.2), in: .capsule)
                .foregroundStyle(.orange)
        } else if pendingCount > 0 {
            Label("Synchronisation…", systemImage: "arrow.triangle.2.circlepath")
                .font(.caption)
                .foregroundStyle(.secondary)
        }
    }
}
```

Règle UX : ne montre l'état **que quand il compte** (offline, ou sync en cours). Online + rien en attente → pas de badge, l'app a l'air "normale".

---

## Points à connaître

- **Ne pas vider le cache sur erreur réseau.** L'échec du `refresh()` doit laisser les données affichées intactes. Effacer = écran vide à chaque coupure réseau.
- **`isConnected` n'est pas une garantie.** Un chemin "satisfait" ne veut pas dire que ton serveur répond. La seule vérité est le résultat de la requête ; le monitor sert l'UI et le déclenchement du flush, pas la logique de fond.
- **Idempotence du flush.** Sans `id` client + déduplication serveur, un crash entre l'envoi et le `dequeue` crée des doublons. Génère l'`id` côté client.
- **`.cachesDirectory` est purgeable.** Pour des données créées par l'utilisateur (pas un simple cache rechargeable), persiste dans Documents ou SwiftData, sinon le système peut les supprimer.

---

## Exercice (15-20 min)

Crée un petit écran "Articles" qui démontre stale-while-revalidate + badge offline :

1. Un `ArticlesStore` `@Observable` avec `articles: [Article]`, un `ArticleCache` (fichier JSON dans `.cachesDirectory`) et un `ArticleAPI` **fake** qui attend `Task.sleep(for: .seconds(1))` puis renvoie une liste codée en dur (ou lance une erreur pour simuler l'offline).
2. `load()` : lit le cache d'abord (affichage immédiat), puis `refresh()` depuis l'API et réécrit le cache.
3. Un `NetworkMonitor` (`NWPathMonitor`) injecté dans `.environment`. Pour tester sans vrai réseau, ajoute un booléen `forceOffline` dans ton API fake qui fait `throw URLError(.notConnectedToInternet)`.
4. La vue : `List(store.articles)`, un `OfflineBadge` dans la barre de navigation, et `.refreshable { await store.refresh() }`.

Critère de réussite : ferme/rouvre l'app en mode `forceOffline` → les articles s'affichent quand même (depuis le cache) avec le badge "Hors ligne". Repasse online → le badge disparaît et la liste se rafraîchit.

Bonus : ajoute un bouton "Ajouter" qui empile dans une `Outbox` quand offline, et flush au retour réseau via `.onChange(of:)`.

---

## Question d'entretien

**Q : "Comment gères-tu le mode offline d'une app iOS ?"**

R modèle : "Je pars d'un principe : **le store local est la source de vérité, l'UI l'observe, le réseau l'alimente**. En lecture, j'applique du **stale-while-revalidate** : j'affiche le cache immédiatement puis je rafraîchis en arrière-plan, et surtout je ne vide jamais le cache si la requête échoue. En écriture, j'utilise une **outbox** : l'action est appliquée localement de façon optimiste et empilée avec un flag pending, puis rejouée quand `NWPathMonitor` détecte le retour réseau — en m'assurant de l'idempotence avec un id client. Pour les conflits je commence en **last-write-wins**, en sachant que ça peut perdre des données et que je passerais à du versioning serveur si le métier l'exige. Et j'expose clairement l'état offline dans l'UI."

**Q : "Pourquoi ne pas juste tester `isConnected` avant chaque appel réseau ?"**

R modèle : "Parce que `isConnected` est un indice, pas une garantie : captive portal, DNS, serveur down… le chemin peut être 'satisfait' alors que la requête échoue. Je tente donc toujours la requête et je traite l'échec proprement (garder le cache, empiler en outbox). Le monitor me sert pour l'UI et pour **déclencher** le rejeu de l'outbox, pas pour décider si je tente ou non."

---

## Résumé

- Source de vérité = **store local** ; l'UI observe le store, le réseau alimente le store.
- **Stale-while-revalidate** : afficher le cache d'abord, rafraîchir ensuite, **ne jamais vider sur erreur**.
- Cache simple = fichier JSON via `actor` (ou SwiftData). `.cachesDirectory` purgeable → Documents pour les données utilisateur.
- **Outbox** : écritures offline appliquées optimistement + flag pending, rejouées au retour réseau ; gérer **idempotence** (id client) et **ordre** (FIFO).
- `NWPathMonitor` exposé en `@Observable` → état online/offline réactif, mais **indice seulement**.
- Conflits : **last-write-wins** pour démarrer ; conscient de ses limites (perte de champ, horloges).
- Badge UI affiché **seulement** quand offline ou sync en cours.
- Reste **simple** : pas de moteur de sync complet tant que le besoin métier ne le justifie pas.
