# Fiche 06.06 — Router / Coordinator : navigation centralisée

> **Approfondissement facultatif.** Commence par 05.04–05.06. Un Router est utile pour coordonner plusieurs points d’entrée ; il n’est pas obligatoire pour apprendre la navigation. Les blocs de cette fiche sont des extraits complémentaires.

## Objectif
Sortir la navigation des vues et la centraliser dans un `Router` `@Observable` qui détient le `path: [Route]`. Tu apprends à naviguer depuis un ViewModel **sans qu'il importe SwiftUI** (via un protocole), à gérer le deep linking et le multi-stacks (un Router par onglet). C'est l'équivalent moderne du **Coordinator pattern** UIKit.

## 1. La brique : un enum `Route` + un `Router`

`Route` est un `enum` `Hashable` qui décrit **toutes** les destinations pushables. Les `associated values` portent les paramètres.

```swift
enum Route: Hashable {
    case productDetail(id: Int)
    case profile(userID: String)
    case settings
}
```

Le `Router` détient le `path` et expose une API impérative. `@Observable` → SwiftUI ré-observe `path` automatiquement.

```swift
import Observation

@MainActor
@Observable
final class Router {
    var path: [Route] = []

    func push(_ route: Route) { path.append(route) }
    func pop() { if !path.isEmpty { path.removeLast() } }
    func popToRoot() { path.removeAll() }
    func reset(to routes: [Route] = []) { path = routes }
}
```

**Réflexe UIKit → moderne** : `navigationController.pushViewController(_:animated:)` devient `router.push(.productDetail(id: 42))`. `popToRootViewController` devient `popToRoot()`. Le `path` est ta `viewControllers` stack, mais en valeur (data-driven), pas en référence.

## 2. Câbler le Router à `NavigationStack`

Un seul `navigationDestination(for:)` mappe `Route → View` pour toute la stack. Le `Router` est injecté dans l'`environment` pour être atteignable depuis n'importe quelle vue enfant.

```swift
struct RootView: View {
    @State private var router = Router()

    var body: some View {
        NavigationStack(path: $router.path) {
            HomeView()
                .navigationDestination(for: Route.self) { route in
                    destination(for: route)
                }
        }
        .environment(router)
    }

    @ViewBuilder
    private func destination(for route: Route) -> some View {
        switch route {
        case .productDetail(let id): ProductDetailView(id: id)
        case .profile(let userID):   ProfileView(userID: userID)
        case .settings:              SettingsView()
        }
    }
}
```

Depuis une vue enfant, tu récupères le Router et tu pushes :

```swift
struct HomeView: View {
    @Environment(Router.self) private var router

    var body: some View {
        Button("Voir le produit 42") {
            router.push(.productDetail(id: 42))
        }
    }
}
```

## 3. Naviguer depuis un ViewModel (sans SwiftUI)

Le ViewModel ne doit **pas** importer SwiftUI ni connaître `Route` concrètement plus que nécessaire. On lui injecte un **protocole de navigation** → testable et découplé.

```swift
@MainActor
protocol RouterProtocol {
    func push(_ route: Route)
    func pop()
    func popToRoot()
}

extension Router: RouterProtocol {}
```

Le ViewModel dépend de l'abstraction :

```swift
@MainActor
@Observable
final class ProductListViewModel {
    private let router: RouterProtocol
    var products: [Product] = []

    init(router: RouterProtocol) {
        self.router = router
    }

    func didTapProduct(_ product: Product) {
        router.push(.productDetail(id: product.id))
    }
}
```

Et la vue injecte le vrai Router :

```swift
struct ProductListView: View {
    @Environment(Router.self) private var router
    @State private var viewModel: ProductListViewModel?

    var body: some View {
        List(viewModel?.products ?? []) { product in
            Button(product.name) { viewModel?.didTapProduct(product) }
        }
        .task {
            if viewModel == nil { viewModel = ProductListViewModel(router: router) }
        }
    }
}
```

En test, tu passes un **spy** au lieu du vrai Router :

```swift
@MainActor
final class RouterSpy: RouterProtocol {
    private(set) var pushed: [Route] = []
    func push(_ route: Route) { pushed.append(route) }
    func pop() {}
    func popToRoot() {}
}

// Test
let spy = RouterSpy()
let vm = ProductListViewModel(router: spy)
vm.didTapProduct(Product(id: 7, name: "Café"))
#expect(spy.pushed == [.productDetail(id: 7)])
```

**Réflexe UIKit → moderne** : avant, ton ViewController (ou Presenter) appelait `coordinator?.showDetail(id:)`. Ici c'est identique en intention : le VM parle à une abstraction, pas à l'UI.

## 4. Deep linking : URL → `[Route]` → `path`

Le pattern propre : une fonction pure qui parse l'`URL` en tableau de routes, puis on **assigne** ce tableau au `path` (la stack s'affiche d'un coup).

```swift
extension Router {
    /// monapp://product/42  ->  [.productDetail(id: 42)]
    /// monapp://profile/abc/settings  ->  [.profile(userID: "abc"), .settings]
    func handle(_ url: URL) {
        guard let routes = Self.parse(url), !routes.isEmpty else { return }
        path = routes
    }

    nonisolated static func parse(_ url: URL) -> [Route]? {
        guard url.scheme == "monapp", url.user == nil, url.password == nil,
              url.port == nil, url.query == nil, url.fragment == nil else { return nil }
        let parts = url.pathComponents.filter { $0 != "/" }
        // host = "product", parts = ["42"]
        switch url.host {
        case "product":
            guard parts.count == 1, let first = parts.first, let id = Int(first), id > 0 else { return nil }
            return [.productDetail(id: id)]
        case "profile":
            guard let userID = parts.first, !userID.isEmpty,
                  parts.count == 1 || (parts.count == 2 && parts[1] == "settings") else { return nil }
            var routes: [Route] = [.profile(userID: userID)]
            if parts.dropFirst().first == "settings" { routes.append(.settings) }
            return routes
        default:
            return nil
        }
    }
}
```

Branchement à l'app — `.onOpenURL` doit voir le `router`, donc on le pose **dans** `RootView` (là où le `@State` est en scope), pas par-dessus :

```swift
struct RootView: View {
    @State private var router = Router()

    var body: some View {
        NavigationStack(path: $router.path) {
            HomeView()
                .navigationDestination(for: Route.self) { destination(for: $0) }
        }
        .environment(router)
        .onOpenURL { url in router.handle(url) }
    }
    // ... destination(for:) comme en section 2
}
```

**Pas idéal** : pousser les routes une par une avec `push` dans une boucle (animations qui s'empilent, états transitoires). **Préférable** : construire `[Route]` puis affecter `path` en une fois.

## 5. Multi-stacks : un Router par onglet

Chaque onglet de `TabView` a **sa propre** `NavigationStack` et donc **son propre** `Router`. On regroupe les routers dans un objet d'app pour piloter l'onglet sélectionné et les resets.

```swift
@MainActor
@Observable
final class AppRouter {
    var selectedTab: Tab = .home
    let home = Router()
    let search = Router()
    let profile = Router()

    enum Tab: Hashable { case home, search, profile }

    func router(for tab: Tab) -> Router {
        switch tab {
        case .home:    home
        case .search:  search
        case .profile: profile
        }
    }
}
```

```swift
struct AppTabView: View {
    @State private var app = AppRouter()

    var body: some View {
        TabView(selection: tabSelection) {
            NavigationStack(path: bindingHome) { HomeView() /* +navigationDestination */ }
                .tabItem { Label("Accueil", systemImage: "house") }
                .tag(AppRouter.Tab.home)

            NavigationStack(path: bindingSearch) { SearchView() }
                .tabItem { Label("Recherche", systemImage: "magnifyingglass") }
                .tag(AppRouter.Tab.search)
        }
    }

    // Les routers sont des `let` → `$app.home.path` ne compile pas
    // (« cannot assign to property: 'home' is a 'let' constant »).
    // On passe par un Binding custom qui lit/écrit `path` (qui, lui, est var).
    private var bindingHome: Binding<[Route]> {
        Binding(get: { app.home.path }, set: { app.home.path = $0 })
    }
    private var bindingSearch: Binding<[Route]> {
        Binding(get: { app.search.path }, set: { app.search.path = $0 })
    }
}
```

Comportement standard iOS : **re-tap sur l'onglet déjà actif → popToRoot** de cet onglet. On l'intercepte avec un `Binding` custom sur la sélection (un `.onChange(of:)` ne suffit pas : il ne se déclenche pas quand `newTab == oldTab`).

```swift
private var tabSelection: Binding<AppRouter.Tab> {
    Binding(
        get: { app.selectedTab },
        set: { newTab in
            // re-tap sur l'onglet courant → popToRoot DE CET onglet
            if newTab == app.selectedTab { app.router(for: newTab).popToRoot() }
            app.selectedTab = newTab
        }
    )
}
```

**Réflexe UIKit → moderne** : c'est exactement ce que faisait un `UITabBarController` avec un `UINavigationController` (et son Coordinator) par onglet. Chaque Coordinator gérait son `pushViewController`. Ici : un `Router` par stack.

## En UIKit (rappel)

Le Coordinator pattern **vient d'UIKit**. Un Coordinator détient le `UINavigationController`, expose `start()`, gère ses `childCoordinators` et décide des `push`/`present`. Les ViewControllers ne se connaissent pas : ils délèguent la navigation au Coordinator (via closure ou protocole).

```swift
protocol Coordinator: AnyObject {
    var childCoordinators: [Coordinator] { get set }
    func start()
}

final class ProductCoordinator: Coordinator {
    var childCoordinators: [Coordinator] = []
    private let navigationController: UINavigationController

    init(navigationController: UINavigationController) {
        self.navigationController = navigationController
    }

    func start() {
        let vm = ProductListViewModel()
        let vc = ProductListViewController(viewModel: vm)
        // Le VC ne sait pas vers QUI il navigue : il prévient le coordinator.
        vc.onSelectProduct = { [weak self] id in self?.showDetail(id: id) }
        navigationController.pushViewController(vc, animated: false)
    }

    private func showDetail(id: Int) {
        let vc = ProductDetailViewController(id: id)
        navigationController.pushViewController(vc, animated: true) // impératif
    }

    func popToRoot() {
        navigationController.popToRootViewController(animated: true)
    }
}
```

Multi-stacks : un `UITabBarController` avec un `UINavigationController` (et son Coordinator) par onglet — exactement ce que la section 5 reproduit avec un `Router` par onglet.

Différence clé de mentalité : en UIKit, le Coordinator **pilote** un `UINavigationController` (référence-driven) et exécute des `pushViewController` impératifs. En SwiftUI, le `Router` détient un `path: [Route]` **observable** (data-driven) ; tu mutes la donnée, et `NavigationStack` reconstruit la pile.

👉 En SwiftUI : `coordinator.pushViewController(detailVC)` devient `router.path.append(.productDetail(id:))`, et le `Coordinator` devient un `Router` `@Observable`.

## Points à connaître
- **`@Environment(Router.self)` exige `.environment(router)`** en amont. Si tu oublies l'injection, crash à l'exécution (objet `@Observable` non trouvé). C'est silencieux à la compilation.
- **`Route` doit être `Hashable` ET les associated values aussi.** Un `case` avec une valeur non-`Hashable` (ex. une closure) casse la conformance et empêche `NavigationStack(path:)`.
- **`@Bindable` pour binder un `@Observable`** : `$router.path` ne marche que sur une propriété `@State` ou via `@Bindable var router = router`. Sur un objet venant de l'environment, fais `@Bindable var router = router` dans le `body`.
- **Le ViewModel ne doit jamais importer SwiftUI.** Si ton protocole de navigation référence des types `View`, tu as raté le découplage. Garde-le sur `Route` (data) uniquement.

## Exercice (10-20 min)
Crée un mini-flow e-commerce :
1. Un `enum Route: Hashable` avec 3 cas : `.list`, `.detail(productID: Int)`, `.checkout`.
2. Un `@Observable Router` avec `path`, `push`, `pop`, `popToRoot`, et un `RouterProtocol` (`push`/`pop`).
3. Un `CartViewModel` `@MainActor @Observable` qui reçoit un `RouterProtocol` en `init` et expose `func checkout()` appelant `router.push(.checkout)`. **Il ne doit pas importer SwiftUI.**
4. Une `RootView` avec `NavigationStack(path:)` + un seul `navigationDestination(for: Route.self)`.
5. **Bonus** : écris un `RouterSpy` et un test (`#expect`) vérifiant que `checkout()` pushe bien `.checkout`.

Critère de réussite : tu navigues depuis le VM, et le test passe sans aucun import SwiftUI dans le VM ni dans le test.

## Question d'entretien
**Q1 — « Comment navigues-tu depuis un ViewModel en SwiftUI ? »**
> Le ViewModel ne connaît pas SwiftUI. Je lui injecte un protocole de navigation (`RouterProtocol`) en init. Le ViewModel appelle `router.push(.detail(id:))` ; la vue, elle, fournit l'implémentation concrète (un `Router` `@Observable` qui pilote `NavigationStack(path:)`). Avantage : le VM reste testable — en test j'injecte un spy qui enregistre les routes poussées.

**Q2 — « C'est quoi un Coordinator, et son équivalent en SwiftUI ? »**
> En UIKit, le Coordinator est un objet qui centralise la logique de navigation et pilote le `UINavigationController` (`pushViewController`), pour sortir cette responsabilité des ViewControllers. En SwiftUI moderne, l'équivalent est un `Router` `@Observable` qui détient un `path: [Route]` ; `Route` est un enum décrivant les destinations, et `navigationDestination(for:)` fait le mapping route → vue. Même intention (navigation découplée, testable), mais data-driven au lieu de référence-driven.

**Q3 — « Comment gères-tu un deep link vers un écran profond ? »**
> Je parse l'`URL` en `[Route]` via une fonction pure, puis j'affecte ce tableau au `path` du Router en une seule fois (`router.path = routes`). NavigationStack reconstruit toute la pile d'un coup, sans empiler les animations. Je branche ça sur `.onOpenURL`.

## Résumé
- `Router` `@Observable` détient `path: [Route]` et expose `push/pop/popToRoot/reset`.
- `Route` = enum `Hashable` (associated values) ; un seul `navigationDestination(for:)` mappe route → vue.
- Navigation depuis le VM via un `RouterProtocol` injecté → découplé et testable (spy).
- Deep link : `URL` → `[Route]` (fonction pure) → affecter `path` en une fois.
- Multi-stacks : un `Router` par onglet de `TabView` ; re-tap onglet actif → `popToRoot`.
- Équivalent moderne et data-driven du **Coordinator** UIKit (qui pilotait `UINavigationController`).

## Vérifier les limites du deep link

Le schéma doit être déclaré dans URL Types ; les liens universels HTTPS demandent Associated Domains et une configuration du domaine. Valider une URL ne valide ni l’existence de la ressource ni les droits de la session. Voir la [fiche 05.05](fiche_05_05_onglets_deep_links_et_split_view.md) pour une simulation autonome et le cas d’une session encore indisponible.
