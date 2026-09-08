# Fiche 02.09 — `@SceneStorage` en SwiftUI

## Objectif

Comprendre à quoi sert `@SceneStorage`, quelle différence faire avec `@State` et `@AppStorage`, et dans quels cas il peut être utile.

---

# 1. L’idée à comprendre

`@SceneStorage` sert à conserver temporairement une valeur liée à une scène de l’app.

Une scène correspond à une instance d’interface de ton app.

Sur iPhone, tu peux souvent retenir simplement :

```text
@SceneStorage = garder un petit état d’écran même si SwiftUI recrée la vue ou si la scène est restaurée.
```

Exemple :

```swift
@SceneStorage("searchText") private var searchText = ""
```

Si l’utilisateur tape une recherche, quitte l’écran ou si la scène est restaurée, SwiftUI peut retrouver cette valeur.

---

# 2. Code minimal

```swift
struct SearchView: View {
    @SceneStorage("searchText") private var searchText = "" // État restaurable lié à la scène

    var body: some View {
        VStack(spacing: 16) {
            TextField("Rechercher", text: $searchText)
                .textFieldStyle(.roundedBorder)

            Text("Recherche : \(searchText)")
                .foregroundStyle(.secondary)
        }
        .padding()
    }
}
```

Ici, `searchText` est sauvegardé comme état temporaire de la scène.

---

# 3. Différence entre `@State`, `@SceneStorage` et `@AppStorage`

Les trois peuvent stocker une valeur, mais pas avec le même objectif.

```text
@State        → état local temporaire dans une vue
@SceneStorage → état temporaire restaurable lié à une scène
@AppStorage   → petite préférence persistée dans UserDefaults
```

Exemple :

```swift
@State private var isShowingSheet = false
@SceneStorage("draftText") private var draftText = ""
@AppStorage("hasSeenOnboarding") private var hasSeenOnboarding = false
```

À retenir :

```text
Je veux juste un état local simple                      → @State
Je veux restaurer un état temporaire d’écran             → @SceneStorage
Je veux conserver une préférence après relance de l’app  → @AppStorage
```

---

# 4. Exemple : brouillon de texte

`@SceneStorage` peut être utile pour un texte en cours d’écriture.

```swift
struct DraftMessageView: View {
    @SceneStorage("draftMessage") private var draftMessage = ""

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Message")
                .font(.headline)

            TextEditor(text: $draftMessage)
                .frame(height: 180)
                .padding(8)
                .overlay {
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(.gray.opacity(0.4), lineWidth: 1)
                }

            Text("Nombre de caractères : \(draftMessage.count)")
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .padding()
    }
}
```

Ici, le texte est un état temporaire que tu veux éviter de perdre trop facilement.

---

# 5. Exemple : onglet ou filtre temporaire

Tu peux conserver une sélection liée à un écran.

```swift
struct FilteredListView: View {
    @SceneStorage("selectedFilter") private var selectedFilter = "all"

    var body: some View {
        VStack(spacing: 16) {
            Picker("Filtre", selection: $selectedFilter) {
                Text("Tous").tag("all")
                Text("Favoris").tag("favorites")
                Text("Récents").tag("recent")
            }
            .pickerStyle(.segmented)

            Text("Filtre sélectionné : \(selectedFilter)")
                .foregroundStyle(.secondary)
        }
        .padding()
    }
}
```

Si la scène est restaurée, le filtre peut être restauré aussi.

---

# 6. Types compatibles

`@SceneStorage` fonctionne surtout avec des types simples.

Exemples :

```swift
@SceneStorage("searchText") private var searchText = ""
@SceneStorage("selectedTab") private var selectedTab = 0
@SceneStorage("isExpanded") private var isExpanded = false
@SceneStorage("draft") private var draft = ""
```

Types courants :

- `String` ;
- `Int` ;
- `Double` ;
- `Bool` ;
- `Data` ;
- `URL`.

Pour des objets complexes, il vaut mieux utiliser un ViewModel, SwiftData, Core Data ou un stockage dédié.

---

# 7. Quand utiliser `@SceneStorage`

Utilise `@SceneStorage` pour un petit état temporaire d’interface que tu aimerais restaurer.

Exemples :

```text
Texte tapé dans une recherche
Brouillon temporaire
Filtre sélectionné
Onglet interne sélectionné
État ouvert/fermé d’une section
Position logique dans un écran
```

Exemples de code :

```swift
@SceneStorage("searchText") private var searchText = ""
@SceneStorage("selectedSegment") private var selectedSegment = 0
@SceneStorage("draftComment") private var draftComment = ""
```

---

# 8. Quand ne pas utiliser `@SceneStorage`

N’utilise pas `@SceneStorage` pour :

- une session utilisateur ;
- un token ;
- des données sensibles ;
- des données métier importantes ;
- une base locale ;
- une préférence permanente ;
- une liste complexe d’objets ;
- un cache API complet.

Pour ces cas :

```text
Session utilisateur       → AuthManager / SessionManager
Token sensible            → Keychain
Préférence permanente     → @AppStorage
Données complexes locales → SwiftData ou Core Data
État simple de vue         → @State
```

---

# 9. `@SceneStorage` vs `@AppStorage`

`@AppStorage` est plus durable parce qu’il écrit dans `UserDefaults`.

Exemple :

```swift
@AppStorage("selectedTheme") private var selectedTheme = "system"
```

C’est une préférence que tu veux conserver longtemps.

`@SceneStorage` est plutôt lié à l’état temporaire d’une scène.

Exemple :

```swift
@SceneStorage("searchText") private var searchText = ""
```

C’est une valeur utile à restaurer, mais pas forcément une préférence globale.

Résumé :

```text
Thème choisi par l’utilisateur      → @AppStorage
Texte en cours dans une recherche   → @SceneStorage
```

---

# 10. Clés uniques

Comme `@AppStorage`, `@SceneStorage` utilise des clés.

```swift
@SceneStorage("searchText") private var searchText = ""
```

Évite de réutiliser la même clé pour deux valeurs différentes dans la même zone de ton app.

Tu peux centraliser les clés :

```swift
enum SceneStorageKeys {
    static let searchText = "searchText"
    static let selectedFilter = "selectedFilter"
    static let draftMessage = "draftMessage"
}
```

Puis :

```swift
@SceneStorage(SceneStorageKeys.searchText) private var searchText = ""
```

---

# 11. Points à connaître

## `@SceneStorage` n’est pas fait pour les données critiques

Il faut le voir comme une aide à la restauration d’interface, pas comme un vrai système de persistance métier.

---

## `@SceneStorage` est moins fréquent que `@State` et `@AppStorage`

Dans beaucoup d’apps, tu utiliseras surtout :

```text
@State
@Binding
@StateObject
@ObservedObject
@EnvironmentObject
@AppStorage
```

`@SceneStorage` est plus spécifique.

---

## Le nom de clé compte

Si tu changes la clé, l’ancienne valeur ne sera plus retrouvée.

---

# Résumé

À retenir :

- `@SceneStorage` conserve un petit état temporaire lié à une scène ;
- il est utile pour restaurer une recherche, un brouillon ou un filtre ;
- il fonctionne surtout avec des types simples ;
- pour une valeur locale simple, utilise `@State` ;
- pour une préférence durable, utilise `@AppStorage` ;
- pour des données complexes, utilise SwiftData, Core Data ou un stockage adapté ;
- ne l’utilise pas pour des tokens, données sensibles ou données métier importantes.

