# Fiche 07.07 — Concurrence : annulation, async let et TaskGroup

## Objectif

Maîtriser l'annulation coopérative d'une `Task`, le parallélisme structuré avec `async let` et `withTaskGroup`, et le pattern search-as-you-type (debounce + annulation). C'est exactement ce qui sépare un code async qui "marche" d'un code async qui ne fuit pas et ne fait pas tourner le CPU pour rien.

---

## 1. Stocker une Task et l'annuler

En UIKit tu gardais une référence sur ton `URLSessionDataTask` (ou un `DispatchWorkItem`) pour pouvoir appeler `.cancel()`. Ici c'est pareil : tu stockes la `Task`, et tu l'annules.

```swift
@Observable
final class DownloadModel {
    private(set) var status = "idle"
    private var task: Task<Void, Never>?

    func start() {
        task?.cancel()                 // annule la précédente (sinon on en empile)
        task = Task {
            status = "downloading"
            do {
                try await downloadEverything()
                status = "done"
            } catch is CancellationError {
                status = "cancelled"   // annulation propre, pas une vraie erreur
            } catch {
                status = "failed"
            }
        }
    }

    func cancel() {
        task?.cancel()
    }
}
```

Point clé : `cancel()` **ne tue rien de force**. L'annulation est *coopérative*. Elle se contente de positionner un flag. C'est ton code (ou les API système comme `URLSession`) qui doit le vérifier.

---

## 2. Vérifier l'annulation : isCancelled vs checkCancellation()

Deux façons de réagir au flag, selon que tu veux gérer toi-même ou lancer une erreur.

```swift
func process(_ items: [Item]) async throws {
    for item in items {
        // 1) Lance CancellationError si annulé -> remonte direct dans le catch
        try Task.checkCancellation()

        // 2) Ou décider soi-même (ex: sauvegarder un état partiel avant de sortir)
        if Task.isCancelled {
            await saveProgress()
            return
        }

        await transform(item)
    }
}
```

Réflexe à avoir : dans une **boucle longue** ou avant une **opération coûteuse**, place un `try Task.checkCancellation()`. Sans ça, ta Task annulée continue de bosser jusqu'au bout — l'annulation est silencieusement ignorée.

Bon à savoir : la plupart des API async système coopèrent déjà. `try await URLSession.shared.data(from:)` lance `URLError(.cancelled)` (ou propage l'annulation) si la Task est annulée, et `Task.sleep(...)` lance `CancellationError`. Tu n'as donc pas à vérifier manuellement entre chaque `await` système.

---

## 3. .task : auto-annulé au démontage de la vue

C'est LA différence à connaître en entretien. Un `Task { }` lancé dans un bouton ou `onAppear` n'est **rattaché à rien** : si la vue disparaît, la Task continue.

```swift
struct ProfileView: View {
    @State private var model = ProfileModel()

    var body: some View {
        List(model.posts) { Text($0.title) }
            // Lancé au montage, ANNULÉ AUTOMATIQUEMENT au démontage de la vue.
            .task {
                await model.loadFeed()
            }
    }
}
```

```swift
// Pas idéal : survit au démontage, peut écrire dans un modèle "mort", fuite potentielle
.onAppear {
    Task { await model.loadFeed() }
}

// Préférable
.task { await model.loadFeed() }
```

`.task` lie le cycle de vie de la Task à celui de la vue. Quand SwiftUI retire la vue, il appelle `cancel()` pour toi — d'où l'importance des points 1 et 2 pour que ça serve à quelque chose.

---

## 4. .task(id:) : relance/annule quand l'id change

Quand un paramètre change (un userID sélectionné, un filtre), tu veux annuler le chargement en cours et en relancer un nouveau. `.task(id:)` fait exactement ça automatiquement.

```swift
struct UserDetailView: View {
    let userID: Int
    @State private var model = UserDetailModel()

    var body: some View {
        content
            // À chaque changement de userID : annule la Task précédente,
            // puis en démarre une nouvelle. (Et toujours annulée au démontage.)
            .task(id: userID) {
                await model.load(userID: userID)
            }
    }
}
```

En UIKit tu aurais dû : annuler manuellement le `dataTask` du user précédent, en créer un nouveau, gérer le cas où l'ancienne réponse arrive après la nouvelle (race condition / réponses dans le désordre). Ici `.task(id:)` élimine tout ça gratuitement.

---

## 5. Search-as-you-type : debounce + annulation

Le cas réel par excellence. On combine les pièces : `.task(id: query)` annule la recherche précédente dès que le texte change, et `Task.sleep` sert de debounce — si l'utilisateur tape vite, l'ancienne Task est annulée *pendant* son sleep et ne part jamais en réseau.

```swift
@Observable
final class SearchModel {
    var query = ""
    private(set) var results: [SearchResult] = []

    func search(_ text: String) async {
        guard !text.isEmpty else { results = []; return }

        do {
            // Debounce : si query change avant 300ms, la Task est annulée
            // ici -> sleep lance CancellationError -> on sort sans requête réseau.
            try await Task.sleep(for: .milliseconds(300))

            let found = try await api.search(text)

            // Le téléchargement coopère aussi : si annulé pendant le réseau,
            // l'erreur remonte ici et on n'écrit pas un résultat périmé.
            results = found
        } catch {
            // CancellationError ou erreur réseau : on ne touche pas results
        }
    }
}
```

```swift
struct SearchView: View {
    @State private var model = SearchModel()

    var body: some View {
        List(model.results) { Text($0.title) }
            .searchable(text: $model.query)
            .task(id: model.query) {           // relance + annule à chaque frappe
                await model.search(model.query)
            }
    }
}
```

Erreur fréquente : faire le debounce avec un `Timer` / `DispatchQueue.asyncAfter` à la main. Inutile ici — l'annulation de `.task(id:)` + `Task.sleep` couvre debounce ET annulation de la requête en cours d'un seul geste.

---

## 6. Parallélisme : async let

Trois appels indépendants. En séquentiel, tu attends la somme des durées. Avec `async let`, ils partent **en parallèle** et tu `await` les trois ensemble.

```swift
// Séquentiel : ~3 fois trop lent (300ms + 300ms + 300ms = 900ms)
let profile = try await api.profile()
let feed    = try await api.feed()
let stats   = try await api.stats()
```

```swift
// Parallèle : les 3 démarrent immédiatement, durée ≈ la plus longue (~300ms)
func loadDashboard() async throws -> Dashboard {
    async let profile = api.profile()
    async let feed    = api.feed()
    async let stats   = api.stats()

    // Le 'await' déclenche l'attente; 'try' car un appel peut throw
    return try await Dashboard(profile: profile, feed: feed, stats: stats)
}
```

À retenir : `async let` lance la tâche **immédiatement** à la ligne de déclaration. Le `await` ne fait que récupérer le résultat. Si une des branches throw, les autres sont automatiquement annulées (parallélisme structuré). C'est le bon outil quand tu connais le **nombre fixe** de tâches à l'avance.

---

## 7. withTaskGroup : N tâches dynamiques + agrégation

Quand le nombre de tâches dépend des données (télécharger les vignettes de N images, fetcher M endpoints d'une liste), `async let` ne suffit plus. Utilise un task group.

```swift
func loadThumbnails(for ids: [Int]) async throws -> [Int: UIImage] {
    try await withThrowingTaskGroup(of: (Int, UIImage).self) { group in
        for id in ids {
            group.addTask {
                let image = try await api.thumbnail(id: id)  // chacune en parallèle
                return (id, image)
            }
        }

        // Agrégation : on collecte les résultats au fur et à mesure
        var output: [Int: UIImage] = [:]
        for try await (id, image) in group {
            output[id] = image
        }
        return output
    }
}
```

Points utiles :
- Les `addTask` partent en parallèle ; `for try await ... in group` consomme les résultats dans l'**ordre d'arrivée**, pas l'ordre d'ajout.
- Si le bloc throw (ou si la Task parente est annulée), le groupe annule toutes les tâches enfants restantes.
- Variante `withTaskGroup` (sans `Throwing`) quand les enfants ne throw pas. Pour limiter le nombre de tâches concurrentes, ne fais pas tout `addTask` d'un coup : utilise un pattern "fenêtre glissante" (ajoute une nouvelle tâche chaque fois qu'une se termine).

---

## Points à connaître

- **`cancel()` ne tue pas la Task.** Sans `try Task.checkCancellation()` / `Task.isCancelled` dans tes boucles, l'annulation est ignorée et le travail continue.
- **`CancellationError` n'est pas un vrai échec.** Catch-le séparément ; ne montre pas une alerte d'erreur à l'utilisateur quand il a juste retapé dans la barre de recherche.
- **`Task { }` ≠ `.task`.** Le premier survit au démontage de la vue (fuite, écriture dans un modèle mort) ; le second est auto-annulé. Préfère toujours `.task` / `.task(id:)`.
- **`async let` lance tout de suite**, à la déclaration — pas au `await`. Si tu mets tes `async let` après une longue opération, tu perds le parallélisme.

---

## Exercice

Construis un écran de recherche d'utilisateurs annulable. Une `@Observable SearchModel` avec `query` et `results`, une fonction `search(_:)` qui `Task.sleep(for: .milliseconds(300))` (debounce) puis appelle une API factice `try await fakeSearch(text)`. Dans la vue, branche `.searchable(text:)` + `.task(id: model.query)`. Vérifie en tapant vite que les requêtes intermédiaires ne s'exécutent jamais (ajoute un `print` après le sleep).

---

## Question d'entretien

**« Comment annules-tu une requête réseau en Swift Concurrency ? »**
Je stocke la `Task` dans une propriété et j'appelle `task?.cancel()`. L'annulation est coopérative : `URLSession`/`Task.sleep` la respectent nativement, et dans mon propre code je place `try Task.checkCancellation()` ou je teste `Task.isCancelled` dans les boucles. Dans une vue SwiftUI, j'utilise `.task` (auto-annulé au démontage) ou `.task(id:)` (annule + relance quand l'id change).

**« async let vs withTaskGroup, quand utiliser quoi ? »**
`async let` quand j'ai un **nombre fixe et connu** de tâches hétérogènes à paralléliser (profil + feed + stats), avec un `await` final qui combine les résultats. `withTaskGroup` quand le nombre de tâches est **dynamique** (boucle sur N éléments) et homogène, avec agrégation des résultats au fur et à mesure. Les deux sont du parallélisme structuré : annulation et erreurs se propagent automatiquement aux enfants.

**« Quelle est la différence entre `Task { }` et le modifier `.task` ? »**
`Task { }` crée une tâche détachée du cycle de vie de la vue : elle continue même après le démontage. `.task` lie la tâche à la vue et l'annule automatiquement quand la vue disparaît — c'est le défaut sûr pour éviter les fuites et les écritures dans un état obsolète.

---

## Résumé

- Stocke la `Task` dans une propriété pour pouvoir l'`cancel()` ; l'annulation est **coopérative**.
- `try Task.checkCancellation()` (throw) ou `Task.isCancelled` (manuel) dans les boucles/avant les opérations coûteuses.
- `.task` est auto-annulé au démontage ; `.task(id:)` annule + relance quand l'id change.
- Search-as-you-type = `.task(id: query)` + `Task.sleep` (debounce + annulation de la recherche précédente en un seul pattern).
- `async let` : N **fixe** de tâches parallèles, combinées au `await` final.
- `withTaskGroup` : N **dynamique** de tâches parallèles, résultats agrégés au fil de l'eau.
- Pont UIKit : remplace `urlSessionTask.cancel()` / `dispatchWorkItem.cancel()` par `task?.cancel()`, avec en bonus l'annulation structurée et automatique.
