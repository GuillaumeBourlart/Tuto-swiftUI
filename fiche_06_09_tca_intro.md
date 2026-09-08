# Fiche 06.09 — TCA (The Composable Architecture) : l'essentiel

## Objectif

Comprendre ce qu'est TCA et savoir en parler en entretien, sans en être expert. Le but ici n'est PAS de maîtriser TCA (ça s'apprend sur un vrai projet) mais de pouvoir dire : « je sais ce que c'est, le principe, quand l'utiliser, et je peux monter en compétence si l'équipe l'utilise ».

## 1. C'est quoi TCA

TCA (The Composable Architecture) est une **librairie d'architecture** open-source de Point-Free, très répandue dans les équipes iOS un peu seniors. C'est une alternative plus structurée à MVVM, basée sur un **flux de données unidirectionnel** (inspiré de Redux/Elm).

Idée centrale : tout l'état d'une feature est dans une seule struct, et il ne change **que** via des actions traitées par un reducer. Ça rend l'app **très prévisible et très testable**.

## 2. Les 5 briques

```text
State   → une struct : tout l'état de la feature
Action  → un enum : tout ce qui peut arriver (tap, réponse réseau...)
Reducer → fonction (state, action) -> Effect : la SEULE à muter le state
Store   → le moteur runtime qui détient le state et reçoit les actions
Effect  → le travail async (réseau...) qui renvoie de nouvelles actions
```

Le cycle : la vue **envoie une Action** au Store → le **Reducer** met à jour le State (et/ou lance un Effect) → la vue se met à jour. Toujours dans ce sens, jamais l'inverse.

## 3. À quoi ça ressemble (TCA moderne, macros)

```swift
import ComposableArchitecture

@Reducer
struct CounterFeature {
    @ObservableState
    struct State: Equatable {
        var count = 0
        var isLoading = false
    }

    enum Action {
        case incrementTapped
        case factButtonTapped
        case factResponse(String)
    }

    var body: some ReducerOf<Self> {
        Reduce { state, action in
            switch action {
            case .incrementTapped:
                state.count += 1
                return .none                       // pas d'effet

            case .factButtonTapped:
                state.isLoading = true
                return .run { [count = state.count] send in
                    let fact = try await numberFact(count)   // effet async
                    await send(.factResponse(fact))
                }

            case let .factResponse(fact):
                state.isLoading = false
                print(fact)
                return .none
            }
        }
    }
}
```

La vue SwiftUI consomme un `Store` :

```swift
struct CounterView: View {
    let store: StoreOf<CounterFeature>

    var body: some View {
        VStack {
            Text("\(store.count)")
            Button("Incrémenter") { store.send(.incrementTapped) }
        }
    }
}
```

> Note : depuis TCA 1.x, l'observation passe par `@ObservableState` (plus besoin du `ViewStore`/`WithViewStore` des anciennes versions, aujourd'hui dépréciés).

## 4. MVVM vs TCA : quand l'un, quand l'autre

| | MVVM (`@Observable`) | TCA |
|---|---|---|
| Courbe d'apprentissage | faible | élevée |
| Boilerplate | peu | beaucoup |
| Testabilité | bonne | excellente (TestStore déterministe) |
| Gros projet multi-équipes | ok | très adapté (composition de features) |
| Petite app / proto | idéal | overkill |

**À retenir** : MVVM couvre la grande majorité des besoins et c'est ce que demandent la plupart des offres. TCA est un **plus** sur des offres exigeantes ou des grosses apps. Tu ne perds rien à savoir l'expliquer.

## Points à connaître

- TCA = **flux unidirectionnel** : State / Action / Reducer / Store / Effect. Si tu retiens ça, tu peux en parler.
- C'est une **dépendance tierce** (SPM), pas du Apple natif — certaines équipes l'adorent, d'autres préfèrent MVVM pur.
- Son gros argument est la **testabilité déterministe** (`TestStore` qui force à décrire chaque changement d'état).
- Ne prétends pas le maîtriser si ce n'est pas le cas : « je connais le principe, je peux monter dessus » est une réponse parfaitement crédible.

## Exercice

Sans coder, prends une petite feature que tu connais (un écran de login) et **décris-la en TCA sur papier** : quelles propriétés dans `State`, quels cas dans `Action` (ex. `emailChanged`, `loginTapped`, `loginResponse`), et ce que ferait le `Reducer` pour chacune. Compare avec ton ViewModel MVVM équivalent.

## Question d'entretien

> **« Connais-tu TCA ? »**
> Réponse modèle : « Oui, dans les grandes lignes. C'est une architecture à flux unidirectionnel : tout l'état d'une feature est dans une struct `State`, modifiée uniquement par un `Reducer` en réponse à des `Action`, le `Store` orchestre et les `Effect` gèrent l'async. L'avantage, c'est une testabilité déterministe et une bonne composition de features sur les grosses apps. Je travaille surtout en MVVM avec `@Observable`, mais si l'équipe est sous TCA je peux monter en compétence rapidement. »

## Résumé

- TCA = librairie d'architecture à **flux unidirectionnel** (State / Action / Reducer / Store / Effect).
- Très **prévisible et testable**, mais plus de boilerplate et une vraie courbe d'apprentissage.
- TCA moderne utilise `@Reducer` + `@ObservableState` (le `ViewStore` est déprécié).
- MVVM suffit pour la plupart des postes ; TCA est un atout sur les offres exigeantes.
- Objectif réaliste : **savoir l'expliquer**, pas le maîtriser — c'est une réponse d'entretien légitime.
