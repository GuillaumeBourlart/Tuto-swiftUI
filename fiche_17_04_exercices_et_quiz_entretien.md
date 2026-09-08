# Fiche 17.04 — Banque d'exercices et quiz d'entretien iOS

## Objectif (2-3 lignes)
Recueil transverse de pratique active : quiz Swift, défis SwiftUI/async/archi, questions d'entretien et code review. Tu lis du Swift toute la journée, mais c'est en **écrivant** et en **te justifiant à voix haute** que ça rentre. Chronomètre-toi, réponds avant de déplier la correction.

---

## 1. Quiz Swift fondamentaux (réponds à voix haute en < 30 s chacune)

**Q1 — `struct` vs `class` : quand choisir l'un plutôt que l'autre ?**

### Réponse
`struct` convient souvent aux valeurs. Attention : une struct peut contenir des références partagées ; elle ne garantit ni absence de fuite, ni sécurité des mutations concurrentes. Vérifie ses membres et son contrat Sendable. `class` quand tu as besoin d'**identité** (`===`), d'héritage, de cycle de vie partagé (un `ViewModel` `@Observable`, un service singleton, un objet UIKit). Réflexe : modèles de données → `struct` ; objets de comportement à durée de vie longue → `class`.

**Q2 — Value semantics vs reference semantics, donne le bug classique.**

### Réponse
Value = copie indépendante à l'affectation/passage. Reference = pointeur partagé. Bug classique : tu passes une `class` à deux endroits, l'un mute, l'autre voit le changement « par surprise ». Avec une struct, chaque détenteur reçoit une valeur, mais des propriétés de type classe peuvent encore référencer le même objet. Les collections standard utilisent notamment le copy-on-write.

**Q3 — `Optional` : différence entre `if let`, `guard let`, `??` et `!` ?**

### Réponse
`if let` → branche locale. `guard let` → early exit, garde la valeur dans la suite du scope (préférable en début de fonction). `??` → valeur par défaut. `!` → crash si nil (à bannir hors prototypes/`@IBOutlet`). Réflexe UIKit `if let x = x { }` → moderne `guard let x else { return }`.

**Q4 — `enum` avec associated values : à quoi ça sert concrètement ?**

### Réponse
Modéliser un état où chaque cas porte une donnée différente, sans champs incohérents. Ex. l'état d'écran :
```swift
enum LoadState<T> {
    case loading
    case loaded(T)
    case failed(Error)
}
```
Tu ne peux pas être `loaded` sans data ni `failed` sans erreur. Le compilateur force le `switch` exhaustif.

**Q5 — `some` vs `any` (opaque type vs existential) ?**

### Réponse
`some P` = un type concret unique, connu du compilateur, résolu à la compilation (permet des optimisations ; c’est ce que retourne `body: some View`). `any P` = boîte existentielle, type effacé, résolu à l'exécution (coût indirection, mais permet d'hétérogène : `[any Shape]`). Réflexe : `some` quand le type est fixe mais long à écrire ; `any` quand tu stockes des types différents derrière un protocole.

**Q6 — `@escaping` closure : ça veut dire quoi et quel piège ?**

### Réponse
La closure peut survivre à l'appel de la fonction (stockée, appelée plus tard, async). Piège : capture forte de `self` → potentiel retain cycle. Réflexe : `[weak self]` dans les closures escaping qui capturent un objet à durée de vie indépendante. En async/await moderne tu en as beaucoup moins besoin.

**Q7 — `weak` vs `unowned` ?**

### Réponse
Les deux cassent un cycle de rétention sans incrémenter le compteur. `weak` → optionnel, devient `nil` si l'objet meurt (sûr, choix par défaut). `unowned` → non-optionnel, **crash** si tu y accèdes après libération (à réserver au cas où la durée de vie du référencé est garantie ≥ celle du référant).

**Q8 — Que fait `lazy var` et quelle limite ?**

### Réponse
Initialisation différée au premier accès. Limites : pas thread-safe, interdit sur `let`, ne peut pas être utilisée dans une `struct` mutée par valeur sans `mutating`. Utile pour un coût d'init qu'on veut éviter si la propriété n'est jamais lue.

**Q9 — Différence `Array` (`map`) et `lazy.map` ?**

### Réponse
`map` est strict : alloue tout de suite un nouveau tableau. `lazy.map` est paresseux : transforme à la demande, utile sur de grosses séquences chaînées (`lazy.filter().map().first`) pour éviter des tableaux intermédiaires.

**Q10 — `Equatable` / `Hashable` : pourquoi en a-t-on besoin en SwiftUI ?**

### Réponse
`Identifiable`/`Hashable` pour `ForEach` et `List` (identité des lignes). `Equatable` pour `.equatable()` / `EquatableView` et pour aider SwiftUI à décider de re-render. Une struct qui déclare sa conformance `Equatable` peut obtenir la synthèse si tous ses champs sont Equatable. Pour une liste, c’est l’identifiant qui doit être Hashable, pas nécessairement tout le modèle.

---

## 2. Défis SwiftUI / état (4-5 mini-exos)

**D1 — Refactor : booléens d'état → enum.** On te donne :
```swift
@State private var isLoading = false
@State private var hasError = false
@State private var items: [Item] = []
```

### Correction
Ici, deux booléens et un tableau permettent plusieurs combinaisons, dont certaines sont incohérentes selon le produit (par exemple erreur affichée avec chargement bloquant). Le nombre d’états invalides dépend des règles métier. Remplace par un état unique :
```swift
enum ViewState { case idle, loading, loaded([Item]), failed(String) }
@State private var state: ViewState = .idle
```
Le `switch` dans le `body` rend chaque cas mutuellement exclusif. (cf. fiche 03.05)

**D2 — Migrer `ObservableObject` → `@Observable`.** Avant :
```swift
final class CartVM: ObservableObject {
    @Published var items: [Item] = []
}
// vue : @StateObject var vm = CartVM()
```

### Correction
```swift
@Observable
final class CartVM {
    var items: [Item] = []   // plus de @Published
}
// vue : @State private var vm = CartVM()
```
Règles : `@StateObject`→`@State`, `@ObservedObject`→rien (passe l'objet brut), `@EnvironmentObject`→`@Environment(CartVM.self)` + `.environment(vm)`. Gain : SwiftUI track seulement les **propriétés lues** dans le `body`, moins de re-renders.

**D3 — Binding entre vues.** Une vue parent détient le state, l'enfant doit le modifier.

### Correction
```swift
struct Parent: View {
    @State private var name = ""
    var body: some View { Child(name: $name) }
}
struct Child: View {
    @Binding var name: String
    var body: some View { TextField("Nom", text: $name) }
}
```
`$` crée le `Binding`. Erreur fréquente : passer `name` (copie) au lieu de `$name`, l'enfant ne remonte rien.

**D4 — Éviter un re-render inutile.** Une grosse vue se redessine entièrement quand une seule sous-partie change.

### Correction
Trois leviers : (1) **extraire** la sous-partie coûteuse dans sa propre `View` (SwiftUI ne réévalue que les vues dont les dépendances changent) ; (2) avec `@Observable`, ne lis dans le `body` que les propriétés nécessaires ; (3) `.equatable()` ou `EquatableView` pour court-circuiter. Réflexe : si tu vois du « tout se redessine », découpe en sous-vues avant d'optimiser.

**D5 — `@State` vs `@Binding` vs `@Environment` : où mettre la source de vérité ?**

### Correction
`@State` = propriété de la vue (source de vérité **locale**, privée). `@Binding` = référence à un state détenu ailleurs. `@Environment` = injection descendante (thème, VM partagé, routeur). Erreur : déclarer deux `@State` pour la même donnée dans parent et enfant → désynchro. Une seule source, le reste en `@Binding`.

---

## 3. Défis async / réseau (3-4)

**A1 — Recherche annulable (cancel la requête précédente quand l'utilisateur tape).**

### Correction
```swift
@State private var searchTask: Task<Void, Never>?

func search(_ query: String) {
    searchTask?.cancel()                       // annule la précédente
    searchTask = Task {
        try? await Task.sleep(for: .milliseconds(300))  // debounce
        guard !Task.isCancelled else { return }
        let results = try? await api.search(query)
        guard !Task.isCancelled else { return }
        self.results = results ?? []
    }
}
```
Alternative SwiftUI : `.task(id: query) { ... }` annule et relance automatiquement à chaque changement de `query`.

**A2 — Pagination (charge la page suivante en bas de liste).**

### Correction
```swift
func loadMoreIfNeeded(current item: Item) async {
    guard item.id == items.last?.id, !isLoadingPage else { return }
    isLoadingPage = true
    defer { isLoadingPage = false }
    page += 1
    let next = (try? await api.fetch(page: page)) ?? []
    items.append(contentsOf: next)
}
```
Dans la `List` : `.task { await loadMoreIfNeeded(current: item) }` sur la dernière ligne. Piège : oublier le garde `isLoadingPage` → double chargement.

**A3 — Single-flight refresh (un seul refresh en vol, les appels concurrents partagent le résultat).**

### Correction
```swift
actor ItemLoader {
    private var inFlight: Task<[Item], Error>?

    func refresh() async throws -> [Item] {
        if let inFlight { return try await inFlight.value }  // réutilise
        let task = Task { try await api.fetchAll() }
        inFlight = task
        defer { inFlight = nil }
        return try await task.value
    }
}
```
Évite N appels réseau quand l'écran déclenche plusieurs refresh quasi simultanés. **Le pattern doit vivre sur un `actor` (ou un `@MainActor`)** : sinon l'accès concurrent à `inFlight` est une data race et deux appels peuvent quand même créer deux `Task`.

**A4 — Mapper les erreurs réseau vers un type métier.**

### Correction
```swift
enum AppError: Error { case offline, unauthorized, server, unknown }

func map(_ error: Error) -> AppError {
    switch error {
    case let urlError as URLError where urlError.code == .notConnectedToInternet: return .offline
    case let http as HTTPError where http.status == 401: return .unauthorized
    case let http as HTTPError where http.status >= 500: return .server
    default: return .unknown
    }
}
```
Pourquoi : la couche UI ne doit jamais voir un `URLError` brut. Tu mappes une fois, l'`enum` métier pilote l'affichage (message + bouton retry).

---

## 4. Défis archi / tests (3-4)

**T1 — Extraire un protocole + mock pour tester un VM sans réseau.**

### Correction
```swift
protocol ItemService { func fetch() async throws -> [Item] }

final class APIItemService: ItemService { /* vrai réseau */ }

struct MockItemService: ItemService {
    var result: Result<[Item], Error>
    func fetch() async throws -> [Item] { try result.get() }
}
// Le VM dépend de `ItemService`, pas de `APIItemService`.
```
En test tu injectes `MockItemService(result: .success([...]))` ou `.failure(...)`. C'est l'**inversion de dépendance** : le VM ne connaît que l'abstraction.

**T2 — Tester une séquence d'états (`loading` → `loaded`).**

### Correction
```swift
@Test func loadsSuccessfully() async {
    let vm = ItemListVM(service: MockItemService(result: .success([.sample])))
    #expect(vm.state == .idle)
    await vm.load()
    #expect(vm.state == .loaded([.sample]))
}
```
(Swift Testing, iOS 17+/Xcode 16). Rends `ViewState: Equatable` pour pouvoir asserter. Teste aussi le chemin `.failure` → `.failed`.

**T3 — Router depuis un ViewModel (navigation testable).**

### Correction
Le VM ne doit pas connaître `NavigationStack`. Il expose une intention :
```swift
@Observable final class Router { var path = NavigationPath() }

@Observable final class DetailVM {
    let router: Router
    func openSettings() { router.path.append(Route.settings) }
}
```
La vue observe `router.path` via `NavigationStack(path: $router.path)`. Avantage : tu testes `openSettings()` en vérifiant `router.path` sans monter d'UI.

**T4 — Pourquoi ne pas tester directement une `View` ?**

### Correction
Une `View` est une description, pas un objet stable à inspecter. Tu testes la **logique** (le VM, les mappers, les `enum` d'état) et tu laisses l'UI aux snapshot tests / UI tests si besoin. Architecture testable = logique hors de `body`.

---

## 5. Questions d'entretien comportement / archi (6-7)

**E1 — Explique MVVM en SwiftUI.**

### Trame
Model (données + services), View (déclarative, sans logique), ViewModel (`@Observable`, expose l'état prêt à afficher et les actions). La View lit le state et appelle les méthodes du VM. Le VM dépend de protocoles (services) → testable. Précise : en SwiftUI, `@State`/`@Binding` gèrent déjà beaucoup, le VM apporte sa valeur quand il y a de la logique async/métier.

**E2 — Pourquoi `@Observable` plutôt que `ObservableObject` ?**

### Trame
Tracking par propriété (re-render seulement si la propriété **lue dans le body** change, vs `@Published` qui notifie tout abonné), moins de boilerplate (pas de `@Published`), meilleures perfs, et c'est la direction d'Apple depuis iOS 17. `ObservableObject` reste pour cibler iOS < 17 (legacy).

**E3 — Comment tu débugues une fuite mémoire ?**

### Trame
(1) Reproduire : ouvrir/fermer l'écran N fois. (2) **Memory Graph Debugger** (Xcode → bouton mémoire) pour voir les objets qui auraient dû disparaître et leurs chaînes de rétention. (3) **Instruments → Leaks/Allocations**. (4) Cause typique : closure escaping qui capture `self` fortement, ou délégué `strong`. Fix : `[weak self]`, `weak var delegate`. Mentionne aussi un `deinit { print(...) }` comme sonde rapide.

**E4 — Comment tu sécurises des tokens dans une app iOS ?**

### Trame
**Keychain** (pas `UserDefaults`, pas en clair) pour access/refresh tokens. Choisis la bonne accessibilité : `kSecAttrAccessibleWhenUnlockedThisDeviceOnly` (lisible seulement appareil déverrouillé, jamais migré par backup/iCloud) plutôt que la valeur par défaut. Jamais de secret hardcodé dans le binaire (il est extractible). HTTPS imposé par **ATS** (`NSAppTransportSecurity`, activé par défaut, n'ouvre pas `NSAllowsArbitraryLoads`) + éventuellement certificate pinning pour les apps sensibles. Token de courte durée + refresh. Réflexe : « si c'est secret, Keychain ; si c'est sensible en transit, TLS + pinning ». (cf. fiche sécurité)

**E5 — Comment tu gères les environnements dev vs prod ?**

### Trame
Build configurations + schemes Xcode, `xcconfig` pour les URLs/clés par environnement, et idéalement un fichier de config non versionné pour les secrets. Pas de `if isDebug` dispersés : centralise dans un `AppEnvironment`. Les clés prod ne doivent pas être lisibles dans une build dev partagée.

**E6 — Décris une décision technique que tu as prise et ses trade-offs.**

### Trame
Structure STAR courte : contexte → contrainte → option choisie → ce que tu as sacrifié → résultat mesuré. Exemple : « passé de Combine à async/await pour la couche réseau : moins de code, plus lisible, mais j'ai dû gérer l'annulation manuellement avec `Task`. Résultat : -30 % de lignes, bugs de souscription disparus. » Montre que tu raisonnes en compromis, pas en dogmes.

**E7 — Quelles règles App Store Review peuvent faire rejeter une app, et comment t'y prépares-tu ?**

### Trame
Les classiques qui coulent une soumission :
- **Privacy Manifest (`PrivacyInfo.xcprivacy`)** : obligatoire depuis le printemps 2024 ; déclare les types de données collectées et les *required reason APIs* (ex. `UserDefaults`, `systemBootTime`). Un SDK tiers sans manifest signé peut bloquer le build.
- **Suppression de compte (5.1.1(v))** : si l'app permet de créer un compte, elle **doit** offrir un parcours de suppression *depuis l'app* (pas seulement un email au support).
- **Sign in with Apple (4.8)** : si tu proposes une connexion sociale tierce (Google, Facebook…), tu dois aussi proposer un mécanisme équivalent respectant la vie privée — Sign in with Apple satisfait l'exigence.
- **Permissions** : chaque clé `NSCameraUsageDescription`, `NSLocationWhenInUseUsageDescription`, etc. doit avoir une chaîne d'explication claire, sinon crash/rejet.
- **ATS** : ne pas désactiver globalement le HTTPS.
Réflexe : la checklist de soumission se prépare *avant* le sprint final, pas la veille.

---

## 6. Code review — corrige ces snippets buggés

**C1**
```swift
let url = URL(string: userInput)!
URLSession.shared.dataTask(with: url) { ... }
```

### Correction
Force unwrap sur une entrée utilisateur → crash si l'URL est invalide.
```swift
guard let url = URL(string: userInput) else { return }
```

**C2**
```swift
@Observable final class VM {
    func load() {
        Task { @MainActor in
            let data = try? await heavyDecode()   // bloque le main thread
            self.items = data ?? []
        }
    }
}
```

### Correction
Tu décodes du lourd sur le `MainActor` → UI qui freeze. Fais le travail hors main, ne reviens au main que pour publier l'état.
```swift
func load() {
    Task {
        let data = try? await heavyDecode()     // sur un thread de fond
        await MainActor.run { self.items = data ?? [] }
    }
}
```
(ou marque seulement la propriété/le VM `@MainActor` et fais le `await` du décodage en dehors).

**C3**
```swift
try? context.save()   // erreur avalée silencieusement
```

### Correction
`try?` ici masque une perte de données sans aucune trace. Gère l'erreur.
```swift
do { try context.save() }
catch { logger.error("save failed: \(error)"); /* remonter à l'UI */ }
```
`try?` n'est acceptable que quand l'échec est réellement sans conséquence.

**C4**
```swift
class Downloader {
    var onDone: (() -> Void)?
    func start() {
        service.fetch { self.onDone?() }   // capture forte de self
    }
}
```

### Correction
La closure escaping capture `self` fortement ; combinée à `onDone` qui peut référencer `self` → retain cycle.
```swift
service.fetch { [weak self] in self?.onDone?() }
```

---

## Points à connaître (pièges)
- **Réviser passif ≠ savoir-faire.** Si tu ne peux pas écrire la réponse sans regarder, tu ne la maîtrises pas pour l'entretien.
- **`try?` qui avale les erreurs** est le bug le plus fréquent en revue : il masque les vrais problèmes.
- **Retain cycle via closure escaping** : le réflexe `[weak self]` doit être automatique sur tout callback à durée de vie indépendante.
- **Travail lourd sur le MainActor** : async ne veut pas dire « hors main thread ». Vérifie où tourne ton décodage.

## Exercice (10-20 min)
Mode examen blanc. Choisis **10 questions** au hasard dans les sections 1 à 5 (mélange les thèmes). Chronomètre **45 s par question max**, réponds **à voix haute ou par écrit sans regarder la correction**. Puis auto-évalue : 1 point si réponse complète, 0,5 si partielle, 0 si bloqué. Note ton score /10. Sous 7/10, repère les 2 thèmes les plus faibles et refais la fiche correspondante avant de réessayer le lendemain. Refais l'exercice 3 jours d'affilée : tu dois progresser et gagner en vitesse.

## Question d'entretien
La meilleure prépa est répartie : **chaque fiche de ce cours se termine par sa propre section « Question d'entretien »**. Reprends-les une par une (modèles MVVM, `@Observable`, concurrence, sécurité, publication, tests…) et entraîne-toi à répondre en 30-60 s, structure STAR pour les questions archi/comportement. Cette fiche-ci est ton récapitulatif transverse pour les révisions de dernière minute.

## Résumé (puces)
- Pratique **active** : réponds avant de déplier, écris le code, justifie à voix haute.
- Quiz Swift : maîtrise value/reference, optionals, `enum` associées, `some`/`any`, `@escaping`, `weak`/`unowned`.
- SwiftUI : booléens → `enum` d'état, `ObservableObject` → `@Observable`, une seule source de vérité, découper avant d'optimiser.
- Async : recherche annulable (`.task(id:)`), pagination gardée, single-flight, mapper les erreurs en type métier.
- Archi/tests : protocole + mock, tester les **états** (Swift Testing), router via `@Observable` testable.
- Sécurité/publication : Keychain (`kSecAttrAccessibleWhenUnlockedThisDeviceOnly`) + ATS, Privacy Manifest (2024), suppression de compte (5.1.1(v)), Sign in with Apple (4.8).
- Code review : pas de force unwrap sur entrée, pas de lourd sur MainActor, pas de `try?` qui avale, `[weak self]` sur escaping.
- Chronomètre-toi, vise la vitesse, et révise les sections « Question d'entretien » de chaque fiche.
