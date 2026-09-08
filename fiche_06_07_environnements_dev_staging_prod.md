# Fiche 06.07 — Environnements dev / staging / prod

## Objectif
Séparer proprement les configs (base URL d'API, clés, feature flags, comportements) entre Debug, Staging et Release pour ne jamais taper la prod par accident. Tu sors d'ici avec un `AppEnvironment` typé qui lit ses valeurs depuis un `.xcconfig` via `Info.plist`, et les réflexes attendus en mission.

## 1. Le problème concret
Une app a au minimum deux back-ends : un environnement de dev/staging (données poubelle, on peut tout casser) et la prod (vrais users, vrais paiements). Le code doit pointer la bonne URL **sans recompiler manuellement** ni risquer de livrer un build qui tape `localhost`.

Mauvais réflexe fréquent (et red flag en entretien) :

```swift
// NON : URL en dur, commentée/décommentée à la main
let baseURL = URL(string: "https://api.monapp.com")!
// let baseURL = URL(string: "https://staging.monapp.com")!
```

L'objectif : la valeur change **selon la Build Configuration**, automatiquement.

## 2. Build Configurations + Schemes
Xcode fournit `Debug` et `Release`. Tu ajoutes une 3e config : **Staging**.

- **Project → Info → Configurations → "+" → Duplicate "Release"** → nomme-la `Staging`.
- Tu te retrouves avec `Debug`, `Staging`, `Release`.

Un **Scheme** dit quelle config utiliser pour chaque action (Run, Archive…). Crée un scheme par environnement pour switcher en un clic.

- **Product → Scheme → Manage Schemes → "+"** → `MonApp-Staging`.
- Édite-le : **Run → Build Configuration = Staging**, **Archive → Build Configuration = Staging**.

Réflexe UIKit → identique : Build Configurations et Schemes existent depuis toujours, rien de SwiftUI ici. Ce qui change souvent en mission c'est qu'on **formalise** Staging au lieu de bricoler avec `#if DEBUG`.

Résultat : 3 schemes (`Debug` via le scheme principal, `Staging`, `Release`), chacun mappé sur sa config.

## 3. Fichiers .xcconfig
Un `.xcconfig` est un fichier texte de Build Settings. On y déclare une variable par config.

`Config/Debug.xcconfig` :

```
API_BASE_URL = https:/$()/api.dev.monapp.com
ENABLE_LOGGING = YES
```

`Config/Staging.xcconfig` :

```
API_BASE_URL = https:/$()/api.staging.monapp.com
ENABLE_LOGGING = YES
```

`Config/Release.xcconfig` :

```
API_BASE_URL = https:/$()/api.monapp.com
ENABLE_LOGGING = NO
```

Piège classique : `//` démarre un commentaire dans un `.xcconfig`, donc `https://` est tronqué. L'astuce `$()` (variable vide) casse la séquence `//` sans rien afficher. Tu stockes donc l'URL **sans schéma** et tu le rajoutes côté Swift, ou tu utilises ce hack.

Branche chaque fichier : **Project → Info → Configurations**, déplie `Debug`/`Staging`/`Release` et assigne le `.xcconfig` correspondant à la cible.

## 4. Exposer la valeur via Info.plist
Les Build Settings ne sont pas lisibles à l'exécution. On les fait transiter par `Info.plist`, qui supporte la substitution `$(VARIABLE)`.

Dans `Info.plist` (clic droit → Add Row, ou édition source) :

```xml
<key>API_BASE_URL</key>
<string>$(API_BASE_URL)</string>
<key>ENABLE_LOGGING</key>
<string>$(ENABLE_LOGGING)</string>
```

À la compilation, Xcode remplace `$(API_BASE_URL)` par la valeur du `.xcconfig` de la config active. À l'exécution, `Bundle.main` les lit.

## 5. Le type AppEnvironment
On centralise tout dans un type qui lit `Bundle.main` une seule fois.

```swift
enum AppEnvironment {

    /// Lecture brute d'une clé d'Info.plist.
    private static func value(for key: String) -> String {
        guard let value = Bundle.main.object(forInfoDictionaryKey: key) as? String,
              !value.isEmpty else {
            // En dev on veut crasher tôt : une config manquante = bug de build.
            fatalError("Clé Info.plist manquante : \(key)")
        }
        return value
    }

    static let baseURL: URL = {
        let raw = value(for: "API_BASE_URL")
        // Si tu stockes l'URL sans schéma, préfixe ici. Sinon utilise `raw` direct.
        guard let url = URL(string: raw) else {
            fatalError("API_BASE_URL invalide : \(raw)")
        }
        return url
    }()

    static let isLoggingEnabled = (value(for: "ENABLE_LOGGING") == "YES")
}
```

Usage :

```swift
let request = URLRequest(url: AppEnvironment.baseURL.appending(path: "users"))
```

`fatalError` ici est volontaire : si une clé manque, c'est une erreur de configuration de build, pas un cas runtime à gérer mollement. Mieux vaut un crash immédiat et explicite qu'une URL `nil` silencieuse.

## 6. #if DEBUG : utile mais à doser
`#if DEBUG` est une compilation conditionnelle (le flag `DEBUG` est posé par défaut sur la config Debug). Utile pour exclure du code de la prod :

```swift
#if DEBUG
print("Requête vers \(request.url?.absoluteString ?? "?")")
#endif
```

À retenir :
- `#if DEBUG` est **binaire** (Debug vs le reste). Staging compile comme Release → `DEBUG` y est **faux**. Pour distinguer 3 environnements, passe par `AppEnvironment`, pas par `#if`.
- Si tu veux un flag sur Staging, ajoute `-DSTAGING` dans `OTHER_SWIFT_FLAGS` du `.xcconfig` Staging, puis teste `#if STAGING`.
- N'enferme **jamais** une logique métier dans `#if DEBUG` : le code non compilé en Release n'est pas testé et diverge. Réserve-le au logging/debug.

## 7. Secrets et .gitignore
Les `.xcconfig` peuvent contenir des valeurs sensibles (clés tierces). Règle non négociable :

```
# .gitignore
Config/Secrets.xcconfig
```

Tu committes un `Secrets.example.xcconfig` (clés vides, documenté) et chaque dev/CI fournit le vrai. **Aucun secret en clair dans le repo**, même historique.

Point crucial : une clé d'API embarquée dans l'app **n'est jamais secrète** — un `.ipa` se décompile en 2 minutes. Pour les vrais secrets (clés de signature serveur, tokens privilégiés), le pattern correct est un **backend proxy** : l'app appelle ton serveur, ton serveur détient la clé et appelle le tiers. Voir la fiche Sécurité. Le `.xcconfig` ne sert qu'à séparer les **configs publiques** par environnement.

## 8. Feature flags simples
Un flag = un comportement activable sans rebuild de logique. Version locale, suffisante pour démarrer :

```swift
extension AppEnvironment {
    // `isLoggingEnabled` est déjà défini dans l'enum (section 5).
    // On ajoute ici d'autres flags, lus de la même façon depuis les .xcconfig.
    // Exemple : SHOW_DEBUG_MENU = YES (Debug/Staging), NO (Release).
    static let showsDebugMenu = (value(for: "SHOW_DEBUG_MENU") == "YES")
}
```

(`value(for:)` est `private` mais reste accessible depuis une extension déclarée dans le **même fichier**. Si tu sépares l'extension dans un autre fichier, passe la fonction en `fileprivate`→`internal` ou regroupe les flags dans le corps de l'enum.)

Au-delà, on branche un service distant (Firebase Remote Config, LaunchDarkly) pour basculer un flag **sans nouvelle release**. Le principe reste : la vue lit un bool, jamais une condition de build dispersée.

## 9. Sélecteur d'environnement caché (QA)
En Debug/Staging, la QA aime switcher d'URL sans réinstaller un autre build. On stocke un override en `UserDefaults`, lu en priorité par `AppEnvironment`, et exposé via un écran de réglages masqué.

```swift
#if DEBUG
struct DebugSettingsView: View {
    @AppStorage("override_base_url") private var overrideURL = ""

    var body: some View {
        Form {
            Section("Environnement (QA)") {
                TextField("Base URL override", text: $overrideURL)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                Text("Actuel : \(AppEnvironment.baseURL.absoluteString)")
                    .font(.footnote).foregroundStyle(.secondary)
            }
        }
    }
}
#endif
```

Côté `AppEnvironment`, lis l'override avant la valeur du bundle :

```swift
static let baseURL: URL = {
    #if DEBUG
    if let override = UserDefaults.standard.string(forKey: "override_base_url"),
       !override.isEmpty,
       let url = URL(string: override) {
        return url
    }
    #endif
    let raw = value(for: "API_BASE_URL")
    guard let url = URL(string: raw) else {
        fatalError("API_BASE_URL invalide : \(raw)")
    }
    return url
}()
```

Réflexe UIKit → l'écran caché se déclenchait souvent via un geste (tap multiple sur le logo, secousse via `motionEnded`). En SwiftUI tu fais pareil avec `.onShake` custom ou un tap répété sur un élément, et tu présentes `DebugSettingsView` en `.sheet`. Le tout sous `#if DEBUG` pour qu'il disparaisse de la prod.

## Points à connaître
- **`//` dans un `.xcconfig` est un commentaire** : ton URL est tronquée silencieusement. Utilise le hack `$()` ou stocke l'URL sans `https://`.
- **`$(VAR)` non substitué** : si `Info.plist` affiche littéralement `$(API_BASE_URL)`, le `.xcconfig` n'est pas branché sur la config, ou la clé n'existe pas dans ce `.xcconfig`. Vérifie l'onglet Configurations.
- **`#if DEBUG` ne couvre pas Staging** : Staging compile en Release, `DEBUG` y est faux. Ne crois pas qu'un override `#if DEBUG` protège ta QA Staging — il faut un flag dédié ou la lecture runtime.
- **Secret committé = secret brûlé** : même supprimé ensuite, il reste dans l'historique Git. `.gitignore` AVANT le premier commit, et toute clé sensible passe par un backend proxy.

## Exercice (15 min)
1. Dans un projet neuf, ajoute la config **Staging** (Duplicate Release) et crée 3 `.xcconfig` : `Debug`, `Staging`, `Release`, chacun avec `API_BASE_URL` distinct.
2. Branche les `.xcconfig` sur les configs et ajoute la ligne `API_BASE_URL = $(API_BASE_URL)` dans `Info.plist`.
3. Écris l'enum `AppEnvironment` avec `static let baseURL: URL` lu depuis `Bundle.main`.
4. Affiche `AppEnvironment.baseURL.absoluteString` dans un `Text`.
5. Crée un scheme `MonApp-Staging` mappé sur la config Staging. Lance le scheme principal puis le scheme Staging : l'URL affichée doit changer **sans toucher au code**.

Bonus : ajoute `ENABLE_LOGGING` et un `print` conditionné par `AppEnvironment.isLoggingEnabled`.

## Question d'entretien
**Q : Comment gères-tu dev vs prod (URL d'API, clés) dans une app iOS ?**
R : Je crée des Build Configurations (Debug, Staging, Release) avec un `.xcconfig` par config définissant `API_BASE_URL` et mes flags. Je les expose via `Info.plist` (`$(API_BASE_URL)`) et je les lis à l'exécution dans un type `AppEnvironment` centralisé, typé, qui crashe si une clé manque. Un scheme par environnement permet de switcher en un clic, y compris pour l'archive. Les `.xcconfig` de secrets sont hors Git ; et comme une clé embarquée n'est jamais réellement secrète, tout ce qui est sensible passe par un backend proxy, pas par l'app.

**Q : Pourquoi pas juste `#if DEBUG` partout ?**
R : Parce que c'est binaire (Debug vs reste) : Staging compile comme Release, donc `DEBUG` y est faux, et je ne peux pas distinguer 3 environnements. Surtout, le code sous `#if DEBUG` n'est pas compilé en Release, donc jamais testé en conditions de prod — il diverge. Je le réserve au logging et aux outils QA, jamais à la logique métier ni au choix d'environnement, qui passent par une lecture runtime.

## Résumé
- 3 Build Configurations (Debug / Staging / Release) + 1 scheme chacune pour switcher proprement.
- Valeurs par config dans des `.xcconfig` → exposées via `Info.plist` `$(VAR)` → lues dans un `AppEnvironment` typé via `Bundle.main`.
- `//` est un commentaire en `.xcconfig` : attention aux URLs tronquées.
- `#if DEBUG` = binaire, ne couvre pas Staging ; réserve-le au debug/QA, pas à la logique.
- Secrets hors Git (`.gitignore`) ; une clé embarquée n'est pas secrète → backend proxy pour le sensible.
- Sélecteur d'environnement caché en Debug (override `UserDefaults`) pour la QA.
