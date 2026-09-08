# Fiche 16.08 — Qualité pro outillée : SwiftLint, CI GitHub Actions, DocC et Git avancé

## Objectif

Maîtriser les marqueurs de séniorité qui crédibilisent un freelance iOS : Git avancé, linting automatisé, CI qui build/test/lint à chaque PR, documentation pro et code review rigoureuse. C'est ce qui sépare « je code » de « je livre en équipe ».

---

## 1. Git avancé : ce qu'on attend d'un senior

### rebase -i (squash / reword)

Avant d'ouvrir une PR, tu nettoies ton historique. Une PR avec 12 commits « wip », « fix typo », « ça marche enfin » fait fuir un reviewer.

```bash
git rebase -i main        # ou HEAD~5 pour les 5 derniers commits
```

Dans l'éditeur :

```text
pick   a1b2c3 feat: ajoute l'écran profil
squash 4d5e6f wip
squash 7g8h9i fix typo
reword 0j1k2l feat: ajoute l'avatar     # → corriger le message
```

- `squash` (ou `s`) : fusionne le commit dans le précédent.
- `fixup` (`f`) : idem mais jette le message du commit fusionné.
- `reword` (`r`) : garde le commit, change juste le message.
- `drop` (`d`) : supprime le commit.

Règle d'or : **ne rebase jamais une branche déjà partagée/mergée** (tu réécris l'historique des autres). Sur ta branche feature perso, libre à toi.

### stash

Tu dois changer de branche en urgence mais ton travail n'est pas commitable :

```bash
git stash push -m "profil en cours"
git switch hotfix/crash
# ... fix ...
git switch feature/profil
git stash pop          # ré-applique et supprime le stash
git stash list         # voir la pile
```

### .gitignore iOS

Le piège classique du junior : committer `DerivedData` ou un fichier de secrets. Ton `.gitignore` minimal :

```text
# Xcode
DerivedData/
build/
*.xcuserstate
xcuserdata/

# SPM
.build/

# CocoaPods (si utilisé)
Pods/

# Secrets — JAMAIS dans le repo
*.xcconfig
Secrets.swift
GoogleService-Info.plist   # si tu ne veux pas l'exposer publiquement
.env
```

`xcuserdata/` contient tes préférences perso (breakpoints, layout) → bruit pur dans les PR. Les `.xcconfig` portent souvent des clés d'API → on les sort du repo et on les injecte via la CI ou un fichier d'exemple `Secrets.example.xcconfig` versionné, lui.

### Conventional Commits

Format standardisé qui rend l'historique lisible et permet de générer un changelog automatiquement :

```text
feat: ajoute le refresh token automatique
fix: corrige le crash au scroll de la liste vide
refactor: extrait APIClient dans un service
docs: complète le README setup
test: ajoute les tests du LoginViewModel
chore: bump SwiftLint 0.55
```

Avec `!` ou un footer `BREAKING CHANGE:` pour signaler une rupture d'API. C'est la base de la versioning sémantique automatisée (`feat` → minor, `fix` → patch, breaking → major).

### Git Flow vs trunk-based

| | Git Flow | Trunk-based |
|---|---|---|
| Branches longues | `develop`, `release`, `hotfix` | quasi aucune |
| Merge | par release | continu sur `main` |
| Pour qui | gros cycles, versions planifiées | équipes rapides, CI/CD, feature flags |

En freelance/startup, **trunk-based** domine aujourd'hui : branches courtes (`feature/xxx`), PR mergée vite, `main` toujours déployable. Git Flow reste vu chez de grosses boîtes au cycle de release lent. Sache expliquer les deux, ce sont des questions d'entretien fréquentes.

### Résoudre un conflit non trivial

Pas idéal : accepter aveuglément « current » ou « incoming » sans lire.

Préférable : comprendre les deux intentions.

```bash
git rebase main
# CONFLICT in LoginViewModel.swift
```

```swift
<<<<<<< HEAD (ta branche)
    state = .error(error.localizedDescription)
=======
    state = .error(mapError(error))   // venu de main
>>>>>>> main
```

Ici les deux changements sont valides → tu **fusionnes la logique** (`state = .error(mapError(error))` est probablement la bonne, mais vérifie). Puis :

```bash
git add LoginViewModel.swift
git rebase --continue
```

Active `git config --global merge.conflictstyle zdiff3` : il affiche aussi l'ancêtre commun, ce qui clarifie qui a changé quoi. En cas de doute total : `git rebase --abort` et tu recommences à tête reposée.

---

## 2. SwiftLint + SwiftFormat

Deux outils complémentaires : **SwiftLint** détecte (et parfois corrige) les problèmes de style et certaines erreurs ; **SwiftFormat** reformate le code automatiquement.

### Installer

```bash
brew install swiftlint swiftformat
# ou via SPM en plugin de build (recommandé pour figer la version par projet)
```

### .swiftlint.yml de base

```yaml
included:
  - Sources
  - App
excluded:
  - .build
  - DerivedData
  - "**/*.generated.swift"

disabled_rules:
  - trailing_whitespace      # géré par SwiftFormat

opt_in_rules:
  - force_unwrapping         # signale les ! dangereux
  - empty_count
  - first_where
  - weak_delegate

line_length:
  warning: 120
  error: 200

type_body_length:
  warning: 300

identifier_name:
  min_length: 2              # autorise "id", "x", "y"

force_cast: error
force_try: error
```

Règles utiles à connaître : `force_unwrapping`, `force_cast`, `force_try` (les `!`, `as!`, `try!` qui crashent), `cyclomatic_complexity`, `weak_delegate`. `swiftlint --fix` corrige automatiquement ce qui est corrigeable.

### Intégrer : build phase

Dans Xcode → Target → Build Phases → New Run Script Phase :

```bash
if which swiftlint >/dev/null; then
  swiftlint
else
  echo "warning: SwiftLint non installé, brew install swiftlint"
fi
```

Les violations apparaissent comme warnings/errors directement dans Xcode. Pas idéal seul : ça ralentit le build et un dev peut ignorer un warning. Préférable : **combiner build phase + pre-commit + CI**.

### Intégrer : pre-commit hook

`.git/hooks/pre-commit` (ou via l'outil `pre-commit`) :

```bash
#!/bin/sh
swiftformat --lint .
swiftlint --strict   # --strict : tout warning devient une erreur bloquante
```

Le commit est refusé si le code n'est pas propre. La CI reste le dernier rempart : même si quelqu'un contourne le hook local, la PR sera rouge.

> Réflexe UIKit : tu vérifiais à l'œil dans la PR. Équivalent moderne : tu automatises, l'humain review le fond pas la forme.

---

## 3. CI GitHub Actions réelle

Objectif : à chaque PR, un runner macOS **build + teste + linte** ton app. Si c'est rouge, on ne merge pas.

`.github/workflows/ci.yml` :

```yaml
name: CI

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  build-test-lint:
    runs-on: macos-15        # runner macOS (Xcode préinstallé)
    steps:
      - uses: actions/checkout@v4

      - name: Select Xcode
        # le runner macos-15 fournit plusieurs Xcode ; épingle une version précise installée
        # (ls /Applications | grep Xcode pour vérifier ; le défaut macos-15 est Xcode 16.4)
        run: sudo xcode-select -s /Applications/Xcode_16.4.app

      - name: SwiftLint
        run: |
          brew install swiftlint
          swiftlint --strict

      - name: Build & Test
        run: |
          set -o pipefail   # sinon un échec de xcodebuild est masqué par xcbeautify
          xcodebuild test \
            -scheme MonApp \
            -destination 'platform=iOS Simulator,name=iPhone 16,OS=latest' \
            -resultBundlePath TestResults \
            CODE_SIGNING_ALLOWED=NO | xcbeautify
```

Points concrets :
- `runs-on: macos-15` est obligatoire pour `xcodebuild` (pas de Xcode sur Linux).
- `CODE_SIGNING_ALLOWED=NO` évite les galères de signature en CI (on ne distribue pas, on teste).
- `xcbeautify` (préinstallé sur les runners macOS GitHub ; ou `brew install xcbeautify`) rend les logs lisibles ; `set -o pipefail` est **obligatoire** pour ne pas masquer un échec derrière le pipe.
- `--strict` sur SwiftLint = la PR échoue au moindre warning.

Pour aller plus loin : cache des dépendances SPM (`actions/cache`), upload du `resultBundle` en artefact, matrix de plusieurs simulateurs.

---

## 4. Documentation

### /// doc comments + DocC

Les commentaires `///` ne sont pas du blabla : Xcode les affiche en Quick Help (⌥-clic) et DocC les compile en doc navigable.

```swift
/// Récupère le profil de l'utilisateur courant.
///
/// - Parameter id: L'identifiant de l'utilisateur.
/// - Returns: Le `User` décodé depuis l'API.
/// - Throws: `APIError.unauthorized` si le token a expiré.
func fetchUser(id: String) async throws -> User
```

Pour générer la doc : Xcode → **Product → Build Documentation** (⌃⇧⌘D). Ça ouvre le DocC viewer avec tes types, symboles et articles `.md`. Indispensable si tu livres un SDK ou un package à d'autres devs.

### README pro

Un README qui inspire confiance contient :

```markdown
# MonApp

![CI](https://github.com/user/monapp/actions/workflows/ci.yml/badge.svg)
![Swift](https://img.shields.io/badge/Swift-6.0-orange)
![Platform](https://img.shields.io/badge/iOS-17%2B-blue)

App de gestion de [...].

## Setup
1. `git clone ...`
2. Copier `Secrets.example.xcconfig` → `Secrets.xcconfig` et remplir les clés.
3. Ouvrir `MonApp.xcodeproj`, lancer sur iPhone 16.

## Architecture
MVVM + services injectés. Voir `/Docs/architecture.md`.

## Tests
`Cmd+U` ou `xcodebuild test -scheme MonApp`.
```

Le badge CI vert en haut du README = signal immédiat que le projet est sérieux.

### ADR (Architecture Decision Record)

Un ADR documente **pourquoi** une décision technique a été prise. Un fichier court par décision dans `/Docs/adr/` :

```markdown
# ADR 003 — Choix de @Observable plutôt qu'ObservableObject

## Statut
Accepté — 2026-03

## Contexte
Cible iOS 17+. Besoin de réduire le boilerplate des ViewModels.

## Décision
Utiliser la macro @Observable. Pas de @Published, suivi automatique.

## Conséquences
+ Moins de code, recompositions plus fines.
- Incompatible iOS < 17 (acceptable, on cible 17+).
```

En entretien, savoir ce qu'est un ADR montre que tu penses « équipe sur la durée », pas juste « ça compile ».

---

## 5. Code review iOS : la checklist

Une review iOS solide chasse des choses précises. Ta checklist :

- **Force unwrap / force try** : un `!` ou `try!` non justifié = crash potentiel en prod. Refuser.
- **`[weak self]`** dans les closures qui survivent (Task longue, completion réseau, Combine `sink`) → retain cycle sinon.
- **`@MainActor`** : tout ce qui touche l'UI doit tourner sur le main thread. Une mutation de `@State`/`@Observable` hors MainActor est un bug latent.
- **Réseau dans la View** : un `URLSession` ou une logique métier directement dans `body` = anti-pattern. Ça va dans le ViewModel/service.
- **Secrets committés** : clé API en dur, `GoogleService-Info.plist` exposé, token dans le code → bloquant absolu.
- **Tests** : un fix sans test de non-régression, une feature sans couverture du ViewModel.
- **Gestion d'erreur** : `try?` qui avale silencieusement, erreur technique brute affichée à l'user.

### Donner une review

Sois précis et bienveillant, commente le code pas la personne. Pas idéal : « c'est faux ». Préférable : « ce `self.user!` crashera si l'appel échoue avant l'assignation — un `guard let` ici ? ». Distingue le bloquant (`must`) du goût perso (`nit:`).

### Recevoir une review

Ne le prends pas perso. Réponds à chaque commentaire (corrigé / pas d'accord car X). Si tu n'es pas d'accord, argumente techniquement, ne mergue pas en force.

---

## 6. Process de bug pro

Le réflexe junior : « je vois le bug, je patche vite ». Le réflexe senior, en 3 temps :

```text
1. Reproduire   → un cas minimal et fiable qui déclenche le bug.
2. Test de non-régression → un test qui ÉCHOUE à cause du bug (rouge).
3. Fixer        → le test passe au vert. Le bug ne reviendra plus.
```

Exemple : crash quand la liste est vide.

```swift
func test_totalPrice_emptyCart_returnsZero() {
    let vm = CartViewModel(items: [])
    XCTAssertEqual(vm.totalPrice, 0)   // rouge avant le fix (division par count)
}
```

Tu fixes `totalPrice`, le test passe. Bonus : tu commits avec `fix: corrige le crash du panier vide (+ test)` et la review est triviale à valider.

---

## Points à connaître

- **`git rebase -i` sur une branche partagée** : tu réécris l'historique commun → tout le monde casse. Squash seulement sur ta branche feature avant la PR.
- **Secrets committés une fois = compromis pour toujours** : `git rm --cached` ne suffit pas, ils restent dans l'historique. Il faut purger (`git filter-repo`) ET révoquer/régénérer la clé. Mieux vaut ne jamais les committer.
- **CI sans `--strict` sur SwiftLint** : les warnings s'accumulent et plus personne ne les lit. Strict ou rien.
- **Doc comments `///` ≠ commentaires `//`** : seuls les `///` (et `/** */`) alimentent Quick Help et DocC. Un `//` reste invisible dans la doc générée.

---

## Exercice (15-20 min)

Sur un projet Xcode existant (ou un nouveau) :

1. Crée `.swiftlint.yml` à la racine avec : `line_length` à 120 (warning), `force_cast` et `force_try` en `error`, et `force_unwrapping` en opt-in. Lance `swiftlint` et corrige au moins une violation.
2. Crée `.github/workflows/ci.yml` qui, sur chaque `pull_request` vers `main` : sélectionne Xcode, lance `swiftlint --strict`, puis `xcodebuild test` sur un simulateur iPhone 16.
3. Vérifie que ton `.gitignore` exclut bien `DerivedData/`, `xcuserdata/` et les `*.xcconfig`.
4. Fais un commit en Conventional Commits (`chore: ajoute SwiftLint et la CI`).

Bonus : pousse sur une branche, ouvre une PR, et observe le job CI tourner (vert/rouge).

---

## Question d'entretien

**Q : « Comment tu garantis la qualité du code en équipe ? C'est quoi ta CI ? »**

R modèle : « Plusieurs garde-fous. En local, SwiftLint + SwiftFormat en build phase et en pre-commit, donc le style est non négociable avant même le commit. Côté process, tout passe par une PR avec au moins une review : je check les force unwrap, les `[weak self]`, que rien de métier ou de réseau ne traîne dans une View, et qu'aucun secret n'est committé. Et une CI GitHub Actions sur runner macOS qui, à chaque PR, fait `swiftlint --strict` puis `xcodebuild test` sur un simulateur — si c'est rouge, on ne merge pas. Pour les bugs, je reproduis, j'écris un test de non-régression qui échoue, puis je fixe. Comme ça la qualité ne dépend pas de la discipline de chacun, elle est outillée. »

**Q : « Git Flow ou trunk-based ? »**

R modèle : « Ça dépend du rythme de release. Git Flow avec `develop`/`release`/`hotfix` convient aux cycles longs et versionnés. Mais pour la plupart des équipes produit aujourd'hui je préfère le trunk-based : branches courtes, PR mergée vite, `main` toujours déployable, soutenu par une bonne CI et des feature flags pour cacher le travail en cours. Moins de merges douloureux, livraison plus continue. »

---

## Résumé

- **Git avancé** : `rebase -i` pour nettoyer (squash/reword) avant la PR, `stash` pour mettre de côté, `.gitignore` iOS qui exclut DerivedData/xcuserdata/secrets.
- **Conventional Commits** (`feat:`/`fix:`/...) : historique lisible + versioning auto.
- **Trunk-based** domine en équipe produit ; sache expliquer Git Flow aussi.
- **SwiftLint + SwiftFormat** : `.swiftlint.yml`, intégration build phase + pre-commit, `--strict` en CI.
- **CI GitHub Actions** sur `macos-15` : build + test (`xcodebuild test`) + lint à chaque PR ; rouge = pas de merge.
- **Documentation** : `///` + DocC (Build Documentation), README pro avec badges, ADR pour tracer les décisions.
- **Code review iOS** : force unwrap, `[weak self]`, `@MainActor`, réseau dans la View, secrets — la checklist.
- **Bug** : reproduire → test de non-régression rouge → fixer → vert.
- Tout ça = la qualité est **outillée**, pas laissée à la discipline. C'est le marqueur de séniorité que les recruteurs cherchent.
