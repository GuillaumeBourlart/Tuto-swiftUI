# Fiche 01.08 — Identité, durée de vie et effets de bord

## Objectif

Comprendre pourquoi une vue peut être recréée sans perdre son état, pourquoi elle le perd parfois, et où lancer un chargement. Base des exemples : iOS 17+, Xcode 26.6.

## 1. Trois choses à distinguer

La **valeur** `CounterView()` est une description temporaire. Son **identité** permet à SwiftUI de reconnaître la même vue logique dans l’arbre. Sa **durée de vie** détermine notamment celle du stockage `@State` associé. Réévaluer `body` ne veut pas dire redessiner chaque pixel ou recréer chaque objet d’interface.

Un `@Observable` indique comment observer un objet. Il ne décide pas qui le conserve. Une vue peut le garder avec `@State`, ou le recevoir d’un propriétaire plus haut.

Source : [Demystify SwiftUI — Apple](https://developer.apple.com/videos/play/wwdc2021/10022/).

## 2. Un laboratoire autonome

Dans un projet iOS, remplace le contenu du fichier `ContentView.swift` par cet exemple. Garde le fichier App généré par Xcode.

```swift
import SwiftUI

struct ContentView: View {
    @State private var parentCount = 0
    @State private var showChild = true
    @State private var generation = 0

    var body: some View {
        VStack(spacing: 20) {
            Button("Modifier le parent : \(parentCount)") {
                parentCount += 1
            }
            Toggle("Afficher le compteur", isOn: $showChild)
            Button("Changer l’identité du compteur") {
                generation += 1
            }
            if showChild {
                IdentityCounter()
                    .id(generation)
            }
        }
        .padding()
    }
}

struct IdentityCounter: View {
    @State private var count = 0

    var body: some View {
        Button("Compteur enfant : \(count)") { count += 1 }
            .onAppear { print("Apparition du compteur") }
            .onDisappear { print("Disparition du compteur") }
    }
}
```

Avant chaque clic, prédis le résultat :

1. Incrémente le compteur enfant à 3.
2. Modifie le parent : l’enfant reste à 3, son identité est conservée.
3. Masque puis réaffiche l’enfant : le `if` l’a retiré, il revient à 0.
4. Incrémente-le puis change son identité : `.id` provoque un nouvel état, il revient à 0.

Si le compteur doit survivre au masquage, déplace son état dans le parent et passe un `@Binding`. `.opacity(0)` conserve la présence et l’espace de la vue ; ce n’est pas le même comportement qu’un `if`. Il faut aussi penser aux interactions et à l’accessibilité d’un contenu invisible.

## 3. Pourquoi les identifiants de listes comptent

Un identifiant doit rester stable pour **la même entité métier**. Préfère l’identifiant du serveur ou un UUID créé lors de la création de l’entité et conservé ensuite.

```swift
struct Contact: Identifiable {
    let id: UUID  // fourni et conservé par la source de données
    var name: String
}
```

Évite `var id: UUID { UUID() }` : chaque lecture retourne une identité différente. Évite aussi `.id(UUID())` pour « forcer le refresh » : cela remet l’état à zéro. `id: \.self` convient à des valeurs uniques et stables ; deux noms identiques ne font pas deux identifiants fiables. Les indices deviennent fragiles après insertion ou réorganisation.

## 4. `.task` n’est pas `viewDidLoad`

| Outil | Utilisation | Limite |
|---|---|---|
| `init` / `body` | Construire une description peu coûteuse | Plusieurs évaluations possibles, sans contrat « une fois » |
| `.onAppear` | Action synchrone liée à l’apparition | Peut se répéter ; pas un événement UIKit will/did exact |
| `.task` | Travail asynchrone lié à la présence de la vue | Peut repartir après une nouvelle apparition |
| `.task(id: valeur)` | Relancer un travail quand l’entrée change | L’ancien travail doit coopérer avec l’annulation |
| `Task { }` dans un bouton | Démarrer une action asynchrone | Tâche non structurée : quitter la vue ne l’annule pas automatiquement |
| `scenePhase` | Réagir à l’état actif/inactif/arrière-plan de la scène | Différent de l’apparition d’une vue |

Ne lance ni réseau, ni écriture, ni abonnement durable dans `body`. L’annulation marque une tâche comme annulée ; elle n’interrompt pas arbitrairement du code synchrone. Un `await` n’est pas obligatoirement un point qui lance `CancellationError`. Les opérations et ton code doivent consulter l’annulation. Pour URLSession, une annulation peut aussi se manifester par `URLError.cancelled`.

## 5. Recherche : exemple autonome et annulable

L’exemple suivant utilise une attente simulée, sans réseau. Ajoute-le dans un fichier séparé et affiche `SearchLifecycleDemo()` depuis ton App pour l’essayer.

```swift
import SwiftUI

struct SearchLifecycleDemo: View {
    @State private var query = ""
    @State private var results: [String] = []
    @State private var loading = false
    @State private var errorMessage: String?

    var body: some View {
        VStack {
            TextField("Rechercher", text: $query)
                .textFieldStyle(.roundedBorder)
            if loading { ProgressView() }
            if let errorMessage { Text(errorMessage) }
            List(results, id: \.self) { Text($0) }
        }
        .padding()
        .task(id: query) {
            let requestedQuery = query
            guard !requestedQuery.isEmpty else {
                results = []
                loading = false
                errorMessage = nil
                return
            }
            loading = true
            errorMessage = nil
            defer {
                if query == requestedQuery && !Task.isCancelled {
                    loading = false
                }
            }
            do {
                try await Task.sleep(for: .milliseconds(300))
                try Task.checkCancellation()
                results = ["SwiftUI", "UIKit", "SwiftData"].filter {
                    $0.localizedCaseInsensitiveContains(requestedQuery)
                }
            } catch {
                guard !Task.isCancelled else { return }
                errorMessage = error.localizedDescription
            }
        }
    }
}
```

Tape rapidement, efface le texte, puis quitte et reviens. Le résultat attendu est celui de la dernière saisie. Une ancienne recherche annulée ne doit pas effacer l’indicateur du nouveau travail, ni afficher une erreur utilisateur.

`async` ne veut pas dire « thread de fond ». Une longue boucle sur le main actor bloque toujours l’interface. Les réglages d’isolation Swift 6 et les acteurs sont détaillés en 07.08. Référence : [Concurrence — The Swift Programming Language](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/concurrency/).

## Pour valider cette fiche

Explique pourquoi le compteur survit à un recalcul mais pas au retrait du `if`. Déplace ensuite son état vers le parent, et vérifie qu’il survit au masquage. Enfin, explique la différence entre `.task` et `Task { }` sans utiliser « une fois » ou « automatiquement en arrière-plan ».
