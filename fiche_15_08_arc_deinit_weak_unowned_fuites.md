# Fiche 15.08 — ARC en pratique : deinit, weak vs unowned et fuites async

## Objectif

Maîtriser ARC pour de vrai : détecter une fuite avec `deinit`, choisir entre `[weak self]` et `[unowned self]`, et repérer les fuites modernes (Task, listeners Firestore, NotificationCenter, Combine). Surtout : arrêter de mettre `[weak self]` partout par réflexe UIKit.

---

## 1. Rappel ARC (tu connais déjà, mais recadrons)

ARC compte les références fortes (`strong`) vers chaque instance de `class`. Quand le compteur tombe à 0, l'objet est désalloué et `deinit` est appelé. Pas de garbage collector, c'est déterministe.

Un **retain cycle** (cycle de rétention) = deux objets qui se retiennent fort mutuellement, ou un objet qui retient une closure qui retient l'objet. Le compteur ne tombe jamais à 0 → fuite mémoire.

```swift
final class Parent {
    var child: Child?
}

final class Child {
    var parent: Parent?   // strong des deux côtés → cycle
}
```

Réflexe UIKit : tu cassais ça avec `weak var parent: Parent?` (comme `weak var delegate`). Même logique ici. La nouveauté SwiftUI, c'est *où* les cycles apparaissent (closures dans les ViewModels, Tasks, listeners), pas le principe.

---

## 2. `deinit` = ta technique n°1 pour DÉTECTER une fuite

Ne devine pas, mesure. Mets un `print` dans `deinit`. Si l'objet devrait disparaître mais que `deinit` ne s'affiche **jamais**, tu as une fuite.

```swift
@Observable
final class ProfileViewModel {
    var name = ""

    init() { print("✅ init ProfileViewModel") }
    deinit { print("❌ deinit ProfileViewModel") }  // doit s'afficher quand l'écran ferme
}
```

Tu pushes l'écran, tu reviens en arrière. `deinit` s'affiche → tout va bien. Rien → le ViewModel reste vivant, quelque chose le retient.

C'est gratuit, ça marche dans tous les cas, et c'est plus rapide que d'ouvrir Instruments pour un premier diagnostic. En entretien, c'est la réponse attendue à « comment tu détectes une fuite ? ».

> Note : pas de `deinit` sur une `struct` ni un `enum` — seules les `class` (types référence) en ont.

---

## 3. `[weak self]` : la valeur par défaut sûre

`[weak self]` rend `self` **optionnel** dans la closure. Si l'objet est désalloué, `self` devient `nil` au lieu de le retenir. Aucun crash possible.

Le pattern moderne avec `guard let self else { return }` (Swift 5.8+, plus besoin de `guard let self = self`) :

```swift
@Observable
final class SearchViewModel {
    var results: [String] = []

    func search() {
        APIClient.fetch { [weak self] data in
            guard let self else { return }   // self non-nil dans tout le bloc
            self.results = data
        }
    }
}
```

Utilise `[weak self]` quand la closure est **stockée** ou peut survivre à l'objet (callbacks réseau, listeners, timers). C'est le choix par défaut : au pire tu ne fais rien, au mieux tu évites une fuite.

---

## 4. `[unowned self]` : non-nil garanti, sinon CRASH

`[unowned self]` donne un `self` non-optionnel, sans incrémenter le compteur. Pas de `guard`, code plus court. Mais si `self` est désalloué quand la closure s'exécute → **crash** (accès à une référence pendante).

```swift
final class ImageLoader {
    let cache: Cache

    init(cache: Cache) {
        self.cache = cache
    }

    lazy var process: () -> Void = { [unowned self] in
        self.cache.clear()   // crash si self a été libéré avant l'appel
    }
}
```

Règle simple : **`unowned` seulement si tu es certain que `self` vit au moins aussi longtemps que la closure.** Typiquement quand l'objet *possède* la closure et l'appelle de façon synchrone, dans son propre cycle de vie.

Dans le doute → `weak`. Un `nil` silencieux est toujours préférable à un crash en production. La plupart des devs séniors n'utilisent quasiment jamais `unowned` justement pour cette raison.

---

## 5. Fuites modernes : `Task {}` non annulée

Erreur fréquente : lancer un `Task {}` dans `onAppear` qui capture `self` (ou le ViewModel) et n'est jamais annulée.

```swift
// Pas idéal : le Task retient son contexte tant qu'il tourne, et n'est pas annulé au démontage de la vue
struct FeedView: View {
    @State private var viewModel = FeedViewModel()

    var body: some View {
        List(viewModel.items, id: \.self) { Text($0) }
            .onAppear {
                Task {
                    await viewModel.loadForever()  // boucle infinie → ne se libère jamais
                }
            }
    }
}
```

```swift
// Préférable : .task est automatiquement annulé quand la vue disparaît
struct FeedView: View {
    @State private var viewModel = FeedViewModel()

    var body: some View {
        List(viewModel.items, id: \.self) { Text($0) }
            .task {
                await viewModel.loadForever()  // la tâche est annulée (coopératif) au démontage
            }
    }
}
```

`.task` lie le cycle de vie de la tâche à celui de la vue. Attention : l'annulation est **coopérative** — une boucle infinie qui ne vérifie rien continuera à tourner. À l'intérieur, vérifie l'annulation (`try Task.checkCancellation()` ou `if Task.isCancelled { return }`) dans tes boucles, ou utilise `try await Task.sleep(for: .seconds(1))` qui lève `CancellationError` tout seul. Réflexe à prendre : **préfère `.task` à `Task {}` dans `onAppear`** dès que le travail est long.

---

## 6. Fuites modernes : listeners non retirés

Le grand classique en prod. Un listener Firestore, un observateur `NotificationCenter` ou un abonnement Combine qui capture `self` en fort et qu'on oublie de retirer.

```swift
@Observable
final class MessagesViewModel {
    private var listener: ListenerRegistration?
    var messages: [Message] = []

    func start() {
        listener = db.collection("messages")
            .addSnapshotListener { [weak self] snapshot, _ in   // weak obligatoire
                guard let self else { return }
                self.messages = snapshot?.documents.compactMap(Message.init) ?? []
            }
    }

    deinit {
        listener?.remove()   // sinon Firestore garde le listener vivant → fuite
    }
}
```

Mêmes pièges, mêmes remèdes :

- **Firestore** : garde la `ListenerRegistration` et appelle `.remove()`.
- **NotificationCenter** : depuis iOS 9 les observateurs block-based ne fuient plus tout seuls, mais le `[weak self]` dans le block reste nécessaire ; retire l'observateur quand tu n'en as plus besoin.
- **Combine** : stocke dans `Set<AnyCancellable>` ; il s'annule à la libération de l'objet. Et mets `[weak self]` dans `.sink`.

```swift
private var cancellables = Set<AnyCancellable>()

publisher
    .sink { [weak self] value in self?.handle(value) }
    .store(in: &cancellables)
```

---

## 7. Le piège du réflexe UIKit : struct ≠ class

Point crucial pour toi qui viens d'UIKit. En UIKit tu mettais `[weak self]` quasi systématiquement parce que tout était des `class` (UIViewController, UIView…).

**Une `View` SwiftUI est une `struct`.** Une struct est une valeur, elle n'a pas de compteur ARC, elle ne peut pas former de cycle. Donc dans une `View`, `[weak self]` n'a aucun sens (et le compilateur le refuse souvent).

```swift
struct CounterView: View {
    @State private var count = 0

    var body: some View {
        Button("Tap") {
            count += 1          // pas de self à capturer faiblement, c'est une struct
        }
    }
}
```

Là où le cycle revient, c'est le **ViewModel** : une `class` qui stocke des closures, des listeners ou des Tasks longues. C'est *là* que `[weak self]` est utile, pas dans la vue.

Résumé du recadrage :

| Contexte | `[weak self]` ? |
|---|---|
| Closure dans une `View` (struct) | Inutile / interdit |
| Closure échappante stockée dans un ViewModel (class) | Oui |
| Listener Firestore / Combine / Notification dans un ViewModel | Oui |
| Closure non-échappante (`map`, `filter`, `forEach`) | Inutile |

---

## 8. Memory Graph Debugger (rappel fiche 15.02)

Quand `deinit` t'a confirmé une fuite mais que tu ne sais pas *qui* retient l'objet :

1. Lance l'app, reproduis le scénario, reviens en arrière.
2. Clique sur l'icône **Debug Memory Graph** dans la barre de debug Xcode.
3. Cherche ton objet dans le navigateur de gauche. Xcode dessine les flèches de rétention.
4. Les flèches **mauves (purple `!`)** = cycles détectés automatiquement. Suis-les pour trouver les deux strong qui se bouclent.

Combo gagnant : `deinit` pour *détecter*, Memory Graph pour *localiser*, `[weak self]` pour *corriger*.

---

## Points à connaître

- **Pas de `deinit` qui s'affiche = fuite.** C'est ton test le plus rapide, mets-en un dans chaque ViewModel pendant le dev.
- **`unowned` qui survit à `self` = crash, pas un `nil`.** Ne l'utilise que si tu peux prouver la durée de vie. Dans le doute, `weak`.
- **`[weak self]` dans une `View` (struct) ne sert à rien** — le réflexe UIKit ne s'applique qu'aux `class` et closures échappantes.
- **Un listener ou un `Task {}` oublié retient son contexte indéfiniment.** Préfère `.task`, appelle `.remove()`, stocke les `AnyCancellable`.

---

## Exercice

Dans le snippet ci-dessous, le `deinit` de `TimerViewModel` ne s'affiche jamais. Trouve le retain cycle et corrige-le (une seule ligne à modifier).

```swift
@Observable
final class TimerViewModel {
    var seconds = 0
    private var timer: Timer?

    func start() {
        timer = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { _ in
            self.seconds += 1
        }
    }

    deinit {
        timer?.invalidate()
        print("deinit TimerViewModel")
    }
}
```

Indice : la closure du timer capture `self` en fort, et `self` retient le timer. Cycle. (Bonus : pourquoi `invalidate()` dans `deinit` ne suffira jamais à casser ce cycle-là ?)

---

## Question d'entretien

**Q : `weak` vs `unowned`, quelle différence et quand utiliser l'un ou l'autre ?**
R : Les deux évitent un retain cycle en ne retenant pas fort la référence. `weak` rend la référence optionnelle : si l'objet est libéré, elle devient `nil`, jamais de crash — c'est le choix par défaut. `unowned` garde une référence non-optionnelle sans compter : plus concis, mais accéder à un `unowned` après libération crashe. On prend `unowned` seulement quand on garantit que la cible vit au moins aussi longtemps que la référence ; sinon `weak`.

**Q : Comment détectes-tu une fuite mémoire ?**
R : D'abord un `print` dans `deinit` : s'il ne s'affiche pas quand l'objet devrait disparaître, il y a une fuite. Ensuite le Memory Graph Debugger de Xcode pour visualiser qui retient l'objet (flèches mauves = cycles). Pour quantifier, l'instrument **Leaks/Allocations** dans Instruments. Les coupables fréquents : closures capturant `self` en fort, listeners non retirés, Tasks non annulées.

**Q : Pourquoi `[weak self]` est inutile dans une `View` SwiftUI ?**
R : Une `View` est une `struct`, un type valeur sans compteur ARC. Elle ne peut pas former de retain cycle, donc capturer `self` faiblement n'a pas de sens. Le risque de cycle se trouve dans les `class` (les ViewModels) qui stockent des closures échappantes, des listeners ou des Tasks longues.

---

## Résumé

- ARC compte les références fortes ; un cycle empêche le compteur d'atteindre 0 → fuite.
- `deinit` + `print` = détection la plus rapide d'une fuite ; aucun `deinit` appelé = problème.
- `[weak self]` (optionnel, `guard let self else { return }`) = défaut sûr pour les closures échappantes.
- `[unowned self]` (non-nil, crash si libéré) = uniquement si la durée de vie est garantie.
- Fuites modernes à surveiller : `Task {}` non annulée (préfère `.task`), listeners Firestore/NotificationCenter/Combine non retirés, closures stockées en propriété.
- Une `View` (struct) ne fait pas de cycle ; un ViewModel (class) avec closures, oui — là seulement `[weak self]` sert.
- Memory Graph Debugger pour localiser le cycle une fois la fuite détectée.
