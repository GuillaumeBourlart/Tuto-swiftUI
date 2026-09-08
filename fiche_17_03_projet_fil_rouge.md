# Fiche 17.03 — Projet fil-rouge : une app complète à construire (et à mettre en portfolio)

## Objectif

Construire UNE app de bout en bout, incrément par incrément, en suivant les parties du cours. À la fin tu as un repo GitHub propre, taggé jalon par jalon, que tu peux montrer en entretien ou à un client freelance. Tu sais déjà coder : ici on capitalise pour produire une preuve d'embauche.

---

## 1. Pourquoi un projet fil-rouge (et pas 10 mini-démos)

Un recruteur ne lit pas ton CV en détail, il regarde ton GitHub 90 secondes. Dix dépôts à moitié finis disent "junior". Un seul repo cohérent, testé, avec une vraie archi et un historique de commits propre dit "je sais livrer".

Le but n'est pas de faire joli, c'est de **prouver des compétences que les offres exigent** : MVVM testable, async/await, persistance offline, backend, sécurité, publication. Chaque jalon coche une case d'une fiche de poste.

Réflexe UIKit -> tu avais ton "projet de stage" avec storyboards + delegates. Ici l'équivalent moderne, c'est un repo SwiftUI + @Observable + SwiftData, vendable tel quel.

---

## 2. Choisir ton app (3 candidats portfolio-friendly)

Choisis-en **une seule**. Critère : assez riche pour montrer du réseau + persistance + auth, assez petite pour la finir.

```text
A. Workout Tracker — suivi de séances de sport
   Entités : Workout, Exercise, Set. Stats hebdo, historique offline.
   Pourquoi bon : data structurée, graphiques, sync multi-appareil.

B. Recipe Box — gestionnaire de recettes avec photos
   Entités : Recipe, Ingredient, Step. Photo via PhotosPicker, upload Storage.
   Pourquoi bon : images (cas réel difficile), recherche, partage.

C. Expense Tracker — suivi de dépenses
   Entités : Transaction, Category, Budget. Camera/scan reçu, graphiques.
   Pourquoi bon : calculs, devises, Keychain pour données sensibles.
```

Conseil : prends celle dont **tu comprends le métier** (tu fais du sport -> Workout). Tu poseras de meilleures décisions produit, et tu sauras en parler en entretien.

Évite : un clone d'app connue ("mon Instagram"), un truc sans données (calculatrice), ou trop ambitieux (réseau social complet). Un client freelance veut voir que tu sais cadrer un scope.

---

## 3. La stack imposée (non négociable, c'est elle qui te rend crédible)

```text
UI            SwiftUI (iOS 17+)
État          @Observable (PAS ObservableObject sauf legacy)
Archi         MVVM + Services injectés par protocole (testable)
Navigation    Router enum-based (NavigationStack + path)
Concurrence   async/await, Task, @MainActor, actors si besoin
Persistance   SwiftData (modèle local + offline)
Réseau        URLSession + APIClient maison, pagination
Backend       Firebase OU Supabase (au choix, voir §6)
Auth          Email/password + Sign in with Apple, token en Keychain
Tests         Swift Testing (ou XCTest) sur ViewModels + services mockés
Sécurité      Keychain, Privacy Manifest, pas de secret en clair
Outils        Git + GitHub, tags par jalon, README pro
```

Pourquoi cette stack : c'est exactement ce que demandent les offres iOS 2025-2026. Tu n'inventes rien d'exotique, tu montres que tu maîtrises le standard moderne.

---

## 4. Architecture cible (le schéma à savoir dessiner)

```text
┌─────────────┐     ┌──────────────────┐     ┌──────────────┐
│   Views     │────▶│   ViewModels     │────▶│   Services    │
│ (SwiftUI)   │◀────│  (@Observable)   │◀────│ (protocoles)  │
└─────────────┘     └──────────────────┘     └──────┬───────┘
       │                                            │
       │ Router (NavigationStack path)        ┌─────┴──────┐
       └──────────────────────────────▶       ▼            ▼
                                    SwiftData      APIClient / Backend
                                    (offline)      (réseau + auth)
```

Règles :
- La View ne connaît que son ViewModel. Pas de logique réseau dans la View.
- Le ViewModel ne connaît que des **protocoles** de services (donc mockable en test).
- Le service décide : cache SwiftData d'abord, puis réseau (offline-first).
- Le Router centralise la navigation, les écrans ne se poussent pas entre eux.

Réflexe UIKit -> ton `Coordinator` devient un `Router` observable qui pousse des routes enum dans le `path` du `NavigationStack`. "Pas idéal" : naviguer avec des `NavigationLink` éparpillés. "Préférable" : un `enum Route` + `router.push(.detail(id))`.

---

## 5. Les jalons (un commit + un tag par étape)

Chaque partie du cours ajoute une couche. Tu commits, tu tags, tu pousses. À la fin l'historique **raconte ta montée en compétence**.

```text
Jalon  Partie cours          Ce que tu ajoutes au projet                          Tag
─────  ───────────────────   ──────────────────────────────────────────────────   ──────
J0     00 Modèles            Structs/enums value types, Identifiable, sample data  v0.1
J1     02-06 Archi           Views + ViewModels @Observable, Services protocoles,  v0.2
                             Router enum, DI manuelle
J2     07 Réseau             APIClient async/await, mapping erreurs, pagination     v0.3
J3     09 Persistance        SwiftData : @Model, container, offline-first cache     v0.4
J4     10-11 Backend + Auth  Firebase OU Supabase, login email + Apple, sync,       v0.5
                             suppression de compte (règle App Store 5.1.1(v))
J5     12 Capacités natives  PhotosPicker / camera / notif locale selon l'app       v0.6
J6     14 Tests              Tests ViewModels + services mockés, >60% sur le coeur   v0.7
J7     15 Perf/Debug         Instruments, fix re-renders, fix leaks (weak self)     v0.8
J8     18 Sécurité           Keychain tokens, Privacy Manifest, audit secrets       v0.9
J9     15.09 Publication      Build release, icônes, screenshots, README final       v1.0
```

Discipline Git (montre que tu sais bosser en équipe) :

```bash
git switch -c feature/networking
# ... code ...
git add .
git commit -m "feat(network): APIClient async/await + pagination"
git switch main && git merge --no-ff feature/networking
git tag -a v0.3 -m "Jalon J2 — couche réseau"
git push origin main --tags
```

"Pas idéal" : un seul commit géant "projet final". "Préférable" : des commits atomiques avec messages conventionnels (`feat:`, `fix:`, `test:`, `refactor:`), branches par feature.

---

## 6. Backend : Firebase ou Supabase (choisis, ne mélange pas)

```text
                Firebase                      Supabase
──────────     ─────────────────────────     ─────────────────────────
Base           Firestore (NoSQL docs)        Postgres (SQL, relationnel)
Auth           Firebase Auth                 Supabase Auth (GoTrue)
Temps réel     listeners snapshot            Realtime channels
Storage        Cloud Storage                 Storage (S3-like)
Quand          schéma souple, prototypage     données relationnelles, SQL
Sécurité       Security Rules                 Row Level Security (RLS)
```

Pour le portfolio, l'un ou l'autre est crédible. **Supabase** te fait gagner des points si l'offre mentionne SQL/Postgres ; **Firebase** si elle veut du temps réel rapide. Décide AU JALON J4 et assume le choix en entretien (savoir justifier > savoir les deux à moitié).

Erreur fréquente : laisser les règles de sécurité backend en mode "test" (tout ouvert). En entretien c'est éliminatoire. Écris des règles : un user ne lit/écrit que SES données.

---

## 7. Sécurité minimale (jalon J8, ce que les recruteurs vérifient)

```text
✓ Tokens (access/refresh) en Keychain (kSecAttrAccessibleWhenUnlockedThisDeviceOnly),
  JAMAIS UserDefaults
✓ Aucune clé API / secret en dur dans le code committé
✓ Privacy Manifest (PrivacyInfo.xcprivacy) : Required Reason APIs déclarées
✓ App Transport Security : HTTPS only, pas d'exception arbitraire (NSAllowsArbitraryLoads)
✓ Règles backend strictes (un user = ses données)
✓ Suppression de compte DANS l'app si on peut s'y inscrire (règle App Store 5.1.1(v))
✓ Sign in with Apple proposé si on offre un login social tiers (règle 4.8)
✓ Données sensibles (montants, santé) chiffrées au repos si besoin
```

Réflexe UIKit -> tu stockais peut-être un token dans `NSUserDefaults`. "Pas idéal" aujourd'hui. "Préférable" : Keychain avec `kSecAttrAccessibleWhenUnlockedThisDeviceOnly` (exclu des backups iCloud, cf. fiche 09.03). Le Privacy Manifest est **obligatoire** pour publier depuis le 1er mai 2024 : sans déclaration correcte des Required Reason APIs (y compris pour les SDK tiers), rejet automatique à l'upload. Deux règles de review souvent oubliées : **5.1.1(v)** impose une suppression de compte accessible dans l'app dès que l'inscription y est possible ; **4.8** exige de proposer Sign in with Apple si tu offres un login social tiers (Google/Facebook).

Vérifie qu'aucun secret n'est dans l'historique Git :

```bash
git log -p | grep -iE "api[_-]?key|secret|password" || echo "clean"
```

---

## 8. Le README pro (c'est lui qu'on lit, pas ton code)

Structure qui fait pro :

```markdown
# WorkoutTracker

App iOS de suivi d'entraînements. SwiftUI, MVVM, offline-first, Supabase.

## Aperçu
[3-4 captures d'écran ou un GIF de démo]

## Stack
SwiftUI · @Observable · SwiftData · async/await · Supabase · Swift Testing

## Fonctionnalités
- Création de séances et suivi des séries
- Mode offline (SwiftData) avec sync au retour réseau
- Auth email + Apple Sign In
- Statistiques hebdomadaires

## Architecture
MVVM + services injectés par protocole + Router enum.
[Schéma d'archi]
Décisions clés : Supabase (Postgres relationnel) pour la sync ;
offline-first car l'app sert à la salle (réseau faible).

## Lancer le projet
1. `cp Config.example.xcconfig Config.xcconfig` et remplir les clés
2. Ouvrir `WorkoutTracker.xcodeproj`, run sur iOS 17+

## Tests
`Cmd+U`. Couverture ciblée : ViewModels + services.
```

Les captures comptent énormément : ajoute 3-4 images dans `/Screenshots` et intègre-les. Un repo iOS sans capture = personne ne clique.

---

## 9. Le pitch d'archi de 2 minutes (à répéter à l'oral)

En entretien on te dira "présente un projet". Prépare 2 min chrono :

```text
1. Le problème (15s) : "Suivi d'entraînements utilisable en salle, donc offline."
2. La stack et POURQUOI (30s) : "SwiftUI + @Observable pour l'état, MVVM
   pour tester la logique sans UI, Supabase parce que mes données sont
   relationnelles (séance -> exercices -> séries)."
3. Une décision difficile (30s) : "Offline-first : je lis SwiftData d'abord,
   je sync en tâche de fond. Compromis : gestion des conflits de sync."
4. Ce que tu testes (15s) : "ViewModels + services mockés via protocoles."
5. Une limite assumée (15s) : "Pas de résolution de conflit fine, last-write-wins.
   Pour aller plus loin j'ajouterais des timestamps versionnés."
```

Montrer que tu connais les **limites** de ton archi vaut plus que de prétendre que tout est parfait. C'est le réflexe d'un dev senior.

---

## 10. Se vendre en freelance (le volet business)

```text
Portfolio GitHub
  - Épingle CE repo en haut de ton profil (Pinned repositories)
  - Bio claire : "iOS dev — SwiftUI, MVVM, Swift Testing"
  - README pro = ta vitrine, c'est ton "site" sans avoir de site

Présenter tes choix techniques (au client)
  - Parle bénéfice, pas techno : "offline-first = l'app marche sans réseau"
    plutôt que "j'utilise SwiftData avec un cache"
  - Justifie chaque choix par un besoin produit, pas par la mode

Estimation / devis (en bref)
  - Découpe en jalons livrables (comme tes tags) : le client paie par jalon
  - Estime en jours-homme, ajoute 20-30% de marge d'incertitude
  - TJM junior/freelance iOS France : ~250-450€ selon profil/région
  - Devis = scope clair + ce qui est HORS scope (évite les litiges)
```

Le repo fil-rouge sert double : preuve de compétence ET base de code que tu peux réutiliser pour démarrer une mission rapidement.

---

## 11. Idées de features bonus (pour pousser plus loin)

Si tu veux te démarquer, ajoute 1-2 de ces features (pas toutes) :

```text
1. Widget WidgetKit (résumé du jour sur l'écran d'accueil)
2. App Intents / Siri ("Hey Siri, démarre ma séance")
3. iCloud / CloudKit sync à la place ou en plus du backend
4. Notifications push (FCM ou APNs) pour rappels
5. watchOS companion app (montre le métier multi-plateforme)
6. Mode sombre soigné + Dynamic Type complet (accessibilité)
7. Localisation FR/EN (String Catalogs)
8. CI GitHub Actions : build + tests à chaque push (montre la rigueur)
```

La CI (#8) est sous-estimée : un badge "tests passing" sur ton README impressionne plus qu'une feature de plus.

---

## Points à connaître

- **Scope creep.** L'erreur n°1 : ajouter des features avant d'avoir fini le coeur. Termine J0->J9 sur un scope minimal AVANT les bonus. Un projet fini > un projet riche inachevé.
- **Commits propres dès J0.** Ne te dis pas "je nettoierai l'historique après". Personne ne le fait. Messages conventionnels et branches dès le premier jour.
- **Secrets committés.** Un `GoogleService-Info.plist` ou une clé Supabase dans l'historique Git est public à vie (même supprimé après). Mets-les dans `.gitignore` AVANT le premier commit, fournis un `*.example`.
- **Tests "décoratifs".** Tester `1+1==2` ne compte pas. Teste la vraie logique : pagination, gestion d'erreur réseau, transition d'état du ViewModel. La couverture du coeur métier est ce qu'on regarde.
- **Suppression de compte oubliée.** Si l'app permet de créer un compte, Apple exige (règle 5.1.1(v)) un bouton de suppression DANS l'app — un simple "contactez le support" est refusé. Prévois-la dès J4, pas la veille de la soumission.

---

## Exercice (15-20 min)

1. **Choisis ton app** parmi les 3 (§2) ou une variante que tu maîtrises. Note en une phrase le problème qu'elle résout.
2. **Écris ton README initial** (`README.md`) avec : le pitch (2 lignes), la liste de features (5 max), la stack imposée (§3), et une section "Architecture" même vide pour l'instant.
3. **Crée le repo GitHub** et fais ton premier commit :

```bash
mkdir WorkoutTracker && cd WorkoutTracker
git init
printf "*.xcconfig\nGoogleService-Info.plist\n.DS_Store\nxcuserdata/\n" > .gitignore
# colle ton README.md ici
git add .
git commit -m "chore: init projet fil-rouge + README"
gh repo create WorkoutTracker --public --source=. --push
git tag -a v0.1 -m "Jalon J0 — squelette"
git push --tags
```

4. **Épingle le repo** sur ton profil GitHub.

Livrable : un repo public avec un README qui pitch ton app et un premier tag `v0.1`. Tu construiras le reste jalon par jalon en avançant dans le cours.

---

## Question d'entretien

**Q1 — "Présente-moi un projet perso et explique ton architecture."**
> "J'ai construit [WorkoutTracker], une app de suivi d'entraînements utilisable hors-ligne. Côté archi : SwiftUI pour l'UI, des ViewModels `@Observable` qui portent la logique, et des services injectés par protocole — ce qui me permet de tester la logique sans lancer l'UI. La navigation passe par un Router enum dans un `NavigationStack`. Pour les données, je suis offline-first : je lis SwiftData d'abord, puis je synchronise avec Supabase en arrière-plan. J'ai choisi Supabase car mes données sont relationnelles. Mes tokens sont en Keychain, j'ai un Privacy Manifest pour la publication. La limite assumée : la résolution de conflits de sync est en last-write-wins."

**Q2 — "Pourquoi @Observable plutôt qu'ObservableObject ?"**
> "`@Observable` (Observation framework, iOS 17+) est plus performant : SwiftUI ne réévalue que les vues qui lisent réellement une propriété modifiée, alors qu'`ObservableObject` notifie tout abonné à `objectWillChange`. C'est aussi moins de boilerplate : plus de `@Published` ni de `@StateObject`, juste `@State` ou `@Bindable`. Je garde `ObservableObject` uniquement pour du code legacy ou si je dois supporter iOS 16."

**Q3 — "Comment garantis-tu que ton ViewModel est testable ?"**
> "Le ViewModel ne dépend jamais d'une implémentation concrète, seulement de protocoles (`WorkoutServiceProtocol`). En production j'injecte le vrai service, en test un mock qui renvoie des données ou des erreurs contrôlées. Je peux ainsi tester chaque transition d'état — loading, loaded, empty, error — de façon déterministe, y compris le code async avec Swift Testing."

---

## Résumé

- Un seul projet fil-rouge cohérent > dix démos inachevées : c'est ta preuve d'embauche.
- Choisis une app dont tu comprends le métier (Workout, Recipe ou Expense) avec un scope cadré.
- Stack imposée et crédible : SwiftUI + @Observable + MVVM testable + async/await + Router + SwiftData + backend (Firebase OU Supabase) + tests + sécurité.
- Construis par jalons J0->J9 alignés sur les parties du cours, **un commit + un tag par jalon**.
- Backend : choisis Firebase OU Supabase, ne mélange pas, et sache justifier le choix.
- Sécurité (J8) : Keychain (`...ThisDeviceOnly`), Privacy Manifest, zéro secret committé, règles backend strictes, suppression de compte (5.1.1(v)) et Sign in with Apple (4.8) si login social.
- Livrable final : repo GitHub public, README pro avec captures, pitch d'archi de 2 min répété.
- Volet freelance : épingle le repo, vends les bénéfices (pas la techno), découpe tes devis en jalons.
- Finis le coeur AVANT les bonus (widget, watchOS, CI, App Intents).
