# Fiche 17.02 — App complète : SwiftUI, MVVM, API, Firebase, persistance, tests, debug

## Objectif

Savoir relier toutes les parties du cours dans une app complète mais raisonnable.

Cette fiche sert de plan d’implémentation global.

## 1. Écrans de l’app

L’app finale peut contenir :

```text
Login
Register
Home
Detail
Favorites
Profile
Settings
```

Navigation :

```text
Auth flow → MainTabView → NavigationStack par onglet
```

## 2. Auth flow

Objectif :

```text
utilisateur non connecté → Login/Register
utilisateur connecté → MainTabView
logout → retour Login
```

Composants :

```text
AuthState
AuthService
LoginViewModel
RegisterViewModel
Keychain si auth REST
FirebaseAuth si auth Firebase
```

## 3. Home avec API

Flux :

```text
HomeView
→ HomeViewModel.load()
→ ItemsService.fetchItems()
→ APIClient.request()
→ affichage loading / list / empty / error
```

La home doit montrer :

- appel réseau ;
- `async/await` ;
- état d’écran ;
- liste SwiftUI ;
- refresh.

## 4. Détail et favoris

Depuis Home :

```text
tap item → DetailView(item)
```

Dans Detail :

- afficher les infos ;
- bouton favori ;
- sauvegarde locale ;
- lecture des favoris dans un onglet dédié.

Persistance :

```text
Core Data ou fichier local selon simplicité
```

Pour montrer un niveau pro, Core Data est plus intéressant.

## 5. Profil et upload image

Flux simple :

```text
ProfileView
→ PhotosPicker
→ Firebase Storage upload
→ récupérer downloadURL
→ sauvegarder URL dans Firestore
```

Cela montre :

- permission photo ;
- sélection média ;
- upload ;
- backend Firebase ;
- mise à jour profil.

## 6. Notifications et Crashlytics

Minimum :

```text
FCM token récupéré
permission notification demandée
Crashlytics installé
erreurs non fatales enregistrées sur certaines erreurs réseau
```

Pas besoin de faire un système push avancé au début.

## 7. Tests

Tests minimum :

```text
LoginViewModelTests
HomeViewModelTests
FavoritesServiceTests
APIClientTests avec mock
```

Objectif : prouver que l’architecture est testable.

## 8. Debug et passage production

Avant de considérer l’app propre :

```text
- pas de crash au lancement
- pas de token dans UserDefaults
- pas de secret dans Git
- erreurs réseau gérées
- Memory Graph vérifié sur les écrans principaux
- Crashlytics configuré
- build TestFlight possible
```

## 9. Ce que ce projet prouve en entretien

Tu peux dire :

> J’ai construit une app SwiftUI structurée en MVVM, avec auth, navigation, API REST, Firebase, persistance locale, tests unitaires, debug et préparation distribution. Je sais aussi expliquer comment je l’adapterais à un projet d’entreprise existant.

## Résumé

- Le projet final relie toutes les compétences utiles.
- Il doit rester réaliste et pas trop gros.
- Il montre SwiftUI, MVVM, API, Firebase, Core Data, tests et debug.
- C’est le meilleur support pour entretien et portfolio.
