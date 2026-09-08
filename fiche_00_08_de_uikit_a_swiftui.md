# Fiche 00.08 — De UIKit à SwiftUI : le pont mental

> Commence aussi par [00.00 — Ton parcours et ce qui reste valable depuis UIKit](fiche_00_00_parcours_uikit_vers_swiftui.md). Les extraits ci-dessous illustrent les correspondances ; les ateliers 01.08 et 05.06 fournissent du code autonome.

## Objectif

Faire basculer ton cerveau d'UIKit (impératif, objets vivants, tu modifies des vues) vers SwiftUI (déclaratif, structs jetables, tu décris un état). C'est LA fiche-charnière : surtout des tables de correspondance pour retrouver tes réflexes au bon endroit.

---

## 1. Le changement de modèle mental : `View = f(state)`

En UIKit, tu **modifies** des objets vivants :

```swift
// UIKit — impératif : tu donnes des ordres à des objets
label.text = "Bonjour"
button.isHidden = true
tableView.reloadData()
```

En SwiftUI, tu **décris** ce que l'écran doit être pour un état donné, et le framework recalcule l'UI :

```swift
// SwiftUI — déclaratif : tu décris, le framework dessine
struct GreetingView: View {
    @State private var name = "Bonjour"
    @State private var showButton = false

    var body: some View {
        VStack {
            Text(name)
            if showButton { Button("OK") {} }
        }
    }
}
```

Le modèle utile est **interface = description de l’état et de l’environnement**. Garde `body` sans effets de bord : les actions modifient l’état, SwiftUI met à jour les parties concernées. Les ponts vers UIKit peuvent toujours effectuer des mises à jour impératives.

> Réflexe à tuer : chercher « comment je récupère une référence à ce label pour changer son texte ». Tu ne récupères rien. Tu changes l'état dont dépend le texte.

---

## 2. La `View` est une struct jetable (vs `UIViewController` objet vivant)

| UIKit | SwiftUI |
|---|---|
| `UIView` / `UIViewController` = **classe** (référence), instance vivante que tu gardes et mutes | `View` généralement écrite comme une **struct** (valeur), reconstruite selon les besoins |
| Tu gardes un `self` pendant tout le cycle de vie | La valeur décrivant la vue peut être reconstruite sans détruire son identité logique. |
| Stocker une référence est normal | Stocker une référence vers une struct `body` n'a aucun sens |

`body` peut être évalué souvent : garde-le peu coûteux, ainsi que l’`init`. Le stockage de `@State` est associé à l’identité de la vue. `@Observable` rend un objet observable ; cette macro ne conserve pas à elle seule l’objet et ne sauvegarde rien sur disque. Voir [identité et durée de vie (01.08)](fiche_01_08_identite_cycle_de_vie.md).

```swift
struct CounterView: View {
    @State private var count = 0   // SwiftUI garde ça vivant, PAS la struct

    var body: some View {
        // ce bloc est ré-exécuté à chaque changement de count
        Button("Count: \(count)") { count += 1 }
    }
}
```

> Question piège : « où est stocké `count` si la struct est recréée ? » → Dans un stockage géré par SwiftUI et associé à l’identité de la vue. Cette identité dépend notamment de sa structure et de ses identifiants explicites ; `@State` fournit l’accès à ce stockage.

---

## 3. Table — cycle de vie

| UIKit | SwiftUI | Notes |
|---|---|---|
| `viewDidLoad` | Pas d’équivalent exact ; `.task` pour un chargement lié à la vue | Peut repartir à une nouvelle apparition, pas un contrat « une fois » |
| `viewWillAppear` | `.onAppear { }` | Appelé à chaque apparition |
| `viewDidAppear` | `.onAppear { }` | SwiftUI ne distingue pas will/did |
| `viewWillDisappear` / `viewDidDisappear` | `.onDisappear { }` | |
| chargement async dans `viewDidLoad` + annuler dans `deinit` | `.task { await load() }` | **reçoit une demande d’annulation** à la disparition |
| `deinit` | (pas d'équivalent direct sur la View) | Le nettoyage se fait via l'annulation des `.task` / cancellation |

Le point qui change tout : **`.task` est lié au cycle de vie de la vue**. Quand la vue disparaît, la `Task` est **annulée automatiquement** (coopératif : les opérations doivent vérifier l’annulation ; tous les `await` ne lancent pas `CancellationError`). En UIKit, tu devais annuler manuellement ton `URLSessionTask` dans `viewWillDisappear`/`deinit`.

```swift
struct ProfileView: View {
    @State private var profile: Profile?

    var body: some View {
        content
            .task {
                // annulée auto si la vue est démontée avant la fin
                do {
                    let loaded = try await api.loadProfile()
                    try Task.checkCancellation()
                    profile = loaded
                } catch {
                    guard !Task.isCancelled else { return }
                    // Mettre à jour un état d’erreur adapté au produit.
                }
            }
    }
}
```

> `.task(id:)` : relance l'action quand `id` change (équivalent d'un « refetch quand l'argument change »).

---

## 4. Table — communication / data flow

Les closures et bindings simplifient beaucoup de communications entre vues. Les delegates restent pertinents dans les API UIKit et leurs adaptateurs.

| Besoin | UIKit | SwiftUI / Swift moderne |
|---|---|---|
| Enfant → parent (callback ponctuel) | `delegate` (protocole + `weak var delegate`) | **closure** passée en paramètre |
| Partager un état observable | `KVO`, `didSet`, `NotificationCenter` | `@Observable` (macro Observation) |
| Lier un champ ↔ une donnée | `target-action` + lire `.text` | `@Binding` / `$value` (two-way) |
| Diffuser un événement global | `NotificationCenter` | `@Observable` injecté en `@Environment`, ou parfois encore `NotificationCenter` |
| Réagir à un bouton | `addTarget(_:action:)` | closure dans `Button("...") { }` |

ViewModel **moderne** (Observation, pas `ObservableObject`/`@Published`) :

```swift
@Observable
final class CounterStore {
    var count = 0
    func increment() { count += 1 }
}

struct CounterScreen: View {
    @State private var store = CounterStore()   // @State possède l'objet

    var body: some View {
        Button("Count: \(store.count)") { store.increment() }
    }
}
```

Enfant → parent par **closure** (l'équivalent direct de ton vieux delegate) :

```swift
struct RatingPicker: View {
    let onSelect: (Int) -> Void        // ← ton "delegate", en une ligne

    var body: some View {
        HStack {
            ForEach(1...5, id: \.self) { value in
                Button("\(value)") { onSelect(value) }
            }
        }
    }
}

// parent
RatingPicker { rating in print("choisi: \(rating)") }
```

Two-way binding (`$`) — l'équivalent du target-action qui lit/écrit un champ :

```swift
struct NameField: View {
    @Binding var name: String          // lecture ET écriture chez le parent
    var body: some View { TextField("Nom", text: $name) }
}
```

> Erreur fréquente d'un dev UIKit : recréer un `protocol XDelegate` pour chaque interaction. En SwiftUI, une closure suffit souvent pour une action ponctuelle.

---

## 5. Table — layout

| UIKit | SwiftUI |
|---|---|
| Auto Layout (`NSLayoutConstraint`, anchors) | `VStack` / `HStack` / `ZStack` + modifiers (`.padding`, `.frame`, `.layoutPriority`) |
| `IBOutlet` / `IBAction` | (disparus) — données via `@State`/bindings, actions via closures |
| Storyboard / XIB | Le code **est** la source de vérité |
| Voir le rendu = build + run sur simulateur | `#Preview` (rendu live, plusieurs états côte à côte) |
| `addSubview` + contraintes | imbrication déclarative dans `body` |
| `UIStackView` | `VStack` / `HStack` (mêmes idées, sans config impérative) |
| `safeAreaLayoutGuide` | géré par défaut, `.ignoresSafeArea()` pour sortir |

```swift
// L'équivalent d'un UIStackView vertical + 2 sous-vues, sans contraintes
VStack(alignment: .leading, spacing: 12) {
    Text("Titre").font(.headline)
    Text("Sous-titre").foregroundStyle(.secondary)
}
.padding()
```

Le `#Preview` accélère les itérations et permet plusieurs configurations. Il complète les essais sur simulateur et appareil, sans les remplacer :

```swift
#Preview {
    VStack {
        RatingPicker { _ in }
        NameField(name: .constant("Guillaume"))
    }
}
```

> `.constant("...")` : un binding bidon pour les previews, quand tu n'as pas de `@State` parent sous la main.

---

## 6. Table — navigation

| UIKit | SwiftUI |
|---|---|
| `navigationController?.pushViewController(vc, animated: true)` | `NavigationStack { NavigationLink(...) }` |
| Push programmatique | `NavigationStack(path: $path)` + `path.append(route)` |
| `present(vc, animated: true)` (modal par-dessus) | `.sheet(isPresented:)` ou `.sheet(item:)` |
| `present` plein écran (`.fullScreen`) | `.fullScreenCover(isPresented:)` |
| `dismiss(animated:)` | `@Environment(\.dismiss)` puis `dismiss()` |
| `UITabBarController` | `TabView { ... .tabItem { } }` |
| segues (storyboard) | (disparus) — tout est explicite en code |

Navigation programmatique (l'équivalent moderne d'un `UINavigationController` que tu pilotes) :

```swift
enum Route: Hashable { case detail(id: Int), settings }

struct RootView: View {
    @State private var path: [Route] = []

    var body: some View {
        NavigationStack(path: $path) {
            List {
                Button("Voir détail 42") { path.append(.detail(id: 42)) }
            }
            .navigationDestination(for: Route.self) { route in
                switch route {
                case .detail(let id): Text("Détail \(id)")
                case .settings:       Text("Réglages")
                }
            }
        }
    }
}
```

Tu manipules un **tableau d'état** (`path`) au lieu d'appeler `push`/`pop`. `if !path.isEmpty { path.removeLast() }` = retirer la dernière route ; `path = []` = retirer toutes les routes par valeur.

```swift
// Fermer une sheet depuis l'écran présenté
struct EditView: View {
    @Environment(\.dismiss) private var dismiss
    var body: some View { Button("Fermer") { dismiss() } }
}
```

---

## 7. Impératif → déclaratif : tu ne « rafraîchis » plus jamais à la main

| UIKit (tu déclenches le redraw) | SwiftUI (le state le déclenche) |
|---|---|
| `setNeedsLayout()` / `layoutIfNeeded()` | rien — change l'état |
| `tableView.reloadData()` | change le tableau source ; `List`/`ForEach` se met à jour |
| `label.text = ...` | `Text(state)` se recalcule |
| `view.isHidden = true` | `if condition { ... }` dans `body` |
| `setNeedsDisplay()` | rien — recompose sur changement d'état |

```swift
// UIKit : ajouter un item PUIS recharger
items.append(newItem)
tableView.reloadData()

// SwiftUI : ajouter à l'état suffit. La List dérive de items.
items.append(newItem)   // la List se reconstruit toute seule
```

C'est le piège mental n°1 du dev UIKit : chercher la fonction « reload ». Il n'y en a pas. Commence par vérifier la source de vérité, l’observation, les données effectivement lues, l’identité des vues et les accès concurrents. Un `reload()` artificiel masquerait la cause.

---

## 8. ARC reste important avec les classes capturées

En UIKit tu écris `[weak self]` par réflexe lorsqu’une capture forte participe à un cycle entre **classes** (vue → closure → vue).

Une `View` SwiftUI est une **struct** = type valeur. Une struct n'est pas « retenue » par ARC comme une classe : elle est copiée. Capturer `self` dans un bouton ne crée pas à lui seul un cycle ARC sur la struct. Mais les objets référencés par cette struct peuvent participer à un cycle avec une closure stockée.

```swift
struct TodoView: View {
    @State private var store = TodoStore()

    var body: some View {
        // Pas de [weak self] sur la struct ; surveiller les classes capturées
        Button("Ajouter") { store.add() }
    }
}
```

Mais `[weak self]` reste **utile** si une capture forte crée un cycle durable entre **classes** :

```swift
@Observable
final class FeedStore {          // ← classe (référence)
    var items: [Item] = []
    private var timer: Timer?

    func startPolling() {
        // ici [weak self] est PERTINENT : closure long-lived retenue par le timer
        timer = Timer.scheduledTimer(withTimeInterval: 5, repeats: true) { [weak self] _ in
            Task { await self?.refresh() }
        }
    }
    func refresh() async { /* ... */ }
}
```

Règle de tri :
- closure **dans le `body` d'une `View`** (struct) → pas de `[weak self]`.
- closure stockée/long-lived dans une **classe** (timer, Combine, NotificationCenter, callback gardé) → analyser les captures et la durée de vie ; utiliser `[weak self]` si nécessaire et annuler les abonnements.

> Subtilité Swift moderne : dans une `Task { }` non stockée, tu n'as souvent pas besoin de `[weak self]` — la Task se termine et libère la capture. Le danger, c'est la closure **retenue durablement** par une classe.

---

## Points à connaître

- **Ne cherche pas `reload()` / `setNeeds...`** : tu modifies l'état, SwiftUI recompose. Si rien ne bouge, ton state n'est pas observable (oubli de `@Observable`/`@State`) ou tu as muté une copie.
- **Ne mets pas de logique lourde dans `body` ni dans l'`init` d'une View** : `body` peut être réévalué souvent. Le travail va dans `.task`/`.onAppear` ou dans le store `@Observable`.
- **Choisis la communication adaptée** : une closure (`let onSelect: (T) -> Void`) pour une action, un binding pour une valeur éditable, un delegate lorsque l’API l’exige.
- **`[weak self]` n'est pas systématique** : inutile dans le `body` d'une struct, toujours pertinent dans une classe à closure long-lived.
- **`.task` s'annule tout seul** au démontage : ne réimplémente pas la gestion d'annulation que tu faisais dans `viewWillDisappear`/`deinit`.

---

## Exercice

Voici un `UIViewController` en pseudo-UIKit. Traduis-le en `View` SwiftUI et liste, pour chaque ligne, son équivalent.

```text
class UserVC: UIViewController, UserServiceDelegate {
    weak var delegate: UserServiceDelegate?
    var users: [String] = []
    override func viewDidLoad() { super.viewDidLoad(); service.loadUsers() }  // async
    func didLoad(users: [String]) { self.users = users; tableView.reloadData() }
    @objc func tapRefresh() { service.loadUsers() }
}
```

Objectif (10-20 min) : produire une `View` avec un store `@Observable` (`users`, `load() async`), un `.task` pour le chargement initial, une `List` sans `reloadData`, un `Button` « Rafraîchir », et écrire en commentaire la correspondance UIKit → SwiftUI de chaque élément (delegate, `viewDidLoad`, `reloadData`, `tapRefresh`).

---

## Question d'entretien

**« Tu viens d'UIKit. Explique comment tu raisonnes en SwiftUI. »**
> En UIKit je manipulais des objets vivants de façon impérative : je gardais des références à mes vues et je les mutais (`label.text = ...`, `reloadData()`). En SwiftUI je raisonne en `View = f(state)` : la `View` est généralement une struct dont l’identité et les dépendances guident les mises à jour — je modifie un état observable (`@State`, `@Observable`, `@Binding`) et le framework recompose l'UI. Donc je ne cherche pas un `reload()` : je cherche quel morceau d'état n'est pas à jour.

**« Pourquoi `[weak self]` n'est-il pas systématique en SwiftUI alors qu'il l'était en UIKit ? »**
> Parce qu'une `View` SwiftUI est une struct (type valeur), pas une classe : ARC ne la retient pas, donc une capture ne crée pas à elle seule de cycle ARC sur la struct. Il faut néanmoins surveiller les classes qu’elle référence. `[weak self]` peut éviter un cycle lorsqu’une **classe** (un store `@Observable`) retient une closure durable qui la recapture : timer, abonnement Combine, `NotificationCenter`, callback stocké.

**« Que se passe-t-il si je lance un appel réseau dans `.task` et que l'utilisateur quitte l'écran ? »**
> La `Task` créée par `.task` est liée au cycle de vie de la vue : au démontage, SwiftUI l'annule automatiquement (annulation coopérative : les opérations doivent la prendre en charge, et l’erreur dépend de l’API). C'est l'équivalent de l'annulation manuelle que je faisais dans `viewWillDisappear`/`deinit` en UIKit, mais gratuite.

---

## Résumé

- Modèle mental clé : **`View = f(state)`** — déclaratif, pas impératif.
- La `View` est une **description de valeur** ; `@State` conserve son stockage par identité, `@Observable` fournit l’observation d’un objet.
- Cycle de vie : pas d’équivalent exact à `viewDidLoad` ; `.task`/`.onAppear` peuvent se répéter ; `.task` **reçoit une demande d’annulation** à la disparition.
- Communication : delegate → **closure** ; KVO/`NotificationCenter` → **`@Observable`** ; champ lié → **`@Binding`/`$`**.
- Layout : Auto Layout + storyboard → `VStack`/`HStack`/`ZStack` + `#Preview` ; le code est la source de vérité.
- Navigation : `push` → `NavigationStack(path:)` ; `present` → `.sheet`/`.fullScreenCover` ; `UITabBarController` → `TabView` ; `dismiss` via `@Environment(\.dismiss)`.
- Impératif → déclaratif : oublie `reloadData()`/`setNeeds...`, modifie l'état.
- `[weak self]` : inutile dans le `body` d'une struct, toujours pertinent dans une **classe** à closure long-lived.

## Références

- [Demystify SwiftUI — Apple](https://developer.apple.com/videos/play/wwdc2021/10022/) pour identité et durée de vie.
- [Use SwiftUI with UIKit — Apple](https://developer.apple.com/videos/play/wwdc2022/10072/) pour l’intégration progressive.
