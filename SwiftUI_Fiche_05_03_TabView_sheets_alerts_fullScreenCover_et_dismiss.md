# Fiche 05.03 — TabView, sheets, alerts, fullScreenCover et dismiss

## Objectif

Savoir gérer les navigations les plus fréquentes dans une vraie app SwiftUI : onglets, modales, alertes, écrans plein écran et fermeture d’écran.

## 1. TabView

`TabView` sert à créer une tabbar iOS classique.

```swift
import SwiftUI

struct MainTabView: View {
    var body: some View {
        TabView {
            NavigationStack {
                HomeView()
            }
            .tabItem {
                Label("Accueil", systemImage: "house")
            }

            NavigationStack {
                SearchView()
            }
            .tabItem {
                Label("Recherche", systemImage: "magnifyingglass")
            }

            NavigationStack {
                ProfileView()
            }
            .tabItem {
                Label("Profil", systemImage: "person")
            }
        }
    }
}
```

En pratique, on met souvent une `NavigationStack` dans chaque onglet. Comme ça, chaque onglet garde sa propre navigation.

## 2. TabView avec sélection

```swift
struct SelectableTabView: View {
    enum Tab {
        case home
        case search
        case profile
    }

    @State private var selectedTab: Tab = .home

    var body: some View {
        TabView(selection: $selectedTab) {
            Text("Accueil")
                .tabItem { Label("Accueil", systemImage: "house") }
                .tag(Tab.home)

            Text("Recherche")
                .tabItem { Label("Recherche", systemImage: "magnifyingglass") }
                .tag(Tab.search)

            Text("Profil")
                .tabItem { Label("Profil", systemImage: "person") }
                .tag(Tab.profile)
        }
    }
}
```

La sélection est utile pour ouvrir un onglet précis après une action.

## 3. Sheet

Une `sheet` affiche une modale classique.

```swift
struct SheetExampleView: View {
    @State private var showProfileEdit = false

    var body: some View {
        Button("Modifier le profil") {
            showProfileEdit = true
        }
        .sheet(isPresented: $showProfileEdit) {
            EditProfileView()
        }
    }
}
```

Utilise une sheet pour une action secondaire : modifier un profil, ajouter un élément, choisir un filtre.

## 4. fullScreenCover

`fullScreenCover` affiche un écran plein écran.

```swift
struct FullScreenExampleView: View {
    @State private var showOnboarding = false

    var body: some View {
        Button("Voir onboarding") {
            showOnboarding = true
        }
        .fullScreenCover(isPresented: $showOnboarding) {
            OnboardingView()
        }
    }
}
```

Utile pour onboarding, login obligatoire ou flow isolé.

## 5. dismiss

Pour fermer une sheet ou revenir en arrière, on peut utiliser `dismiss`.

```swift
struct EditProfileView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var name = ""

    var body: some View {
        NavigationStack {
            Form {
                TextField("Nom", text: $name)
            }
            .navigationTitle("Modifier")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Annuler") {
                        dismiss()
                    }
                }

                ToolbarItem(placement: .confirmationAction) {
                    Button("OK") {
                        dismiss()
                    }
                }
            }
        }
    }
}
```

`dismiss()` agit sur le contexte où il a été lu : récupère-le dans la vue présentée pour fermer cette présentation. Le formulaire ci-dessus garde seulement une saisie locale ; son bouton OK ferme sans sauvegarde métier. Voir 05.06 pour Annuler/Enregistrer avec un brouillon et une source de vérité.

## 6. Alert

```swift
struct AlertExampleView: View {
    @State private var showError = false

    var body: some View {
        Button("Déclencher erreur") {
            showError = true
        }
        .alert("Erreur", isPresented: $showError) {
            Button("OK", role: .cancel) { }
        } message: {
            Text("Impossible de charger les données.")
        }
    }
}
```

Une alerte doit rester courte. Pour du contenu long, utilise plutôt une sheet.

## 7. confirmationDialog

`confirmationDialog` est utile pour proposer plusieurs actions.

```swift
struct ConfirmationDialogView: View {
    @State private var showDialog = false

    var body: some View {
        Button("Options") {
            showDialog = true
        }
        .confirmationDialog("Choisir une action", isPresented: $showDialog) {
            Button("Supprimer", role: .destructive) {
                print("Supprimer")
            }

            Button("Annuler", role: .cancel) { }
        }
    }
}
```

## 8. Cas classique : login ou app principale

```swift
struct AppRootView: View {
    @State private var isAuthenticated = false

    var body: some View {
        if isAuthenticated {
            MainTabView()
        } else {
            LoginView {
                isAuthenticated = true
            }
        }
    }
}

struct LoginView: View {
    let onLoginSuccess: () -> Void

    var body: some View {
        Button("Connexion") {
            onLoginSuccess()
        }
    }
}
```

C’est une façon simple de gérer le passage login → app.

## En UIKit (rappel)

La tabbar passait par `UITabBarController`, qu'on remplissait avec ses `viewControllers` et leurs `tabBarItem` :

```swift
let tabBar = UITabBarController()
let home = UINavigationController(rootViewController: HomeViewController())
home.tabBarItem = UITabBarItem(title: "Accueil", image: UIImage(systemName: "house"), selectedImage: nil)

let profile = UINavigationController(rootViewController: ProfileViewController())
profile.tabBarItem = UITabBarItem(title: "Profil", image: UIImage(systemName: "person"), selectedImage: nil)

tabBar.viewControllers = [home, profile]
```

Une modale (équivalent `sheet` / `fullScreenCover`) se présentait à la main avec `present(_:animated:)`, en réglant le `modalPresentationStyle` :

```swift
let editVC = EditProfileViewController()
editVC.modalPresentationStyle = .pageSheet   // .fullScreen pour un plein écran
present(editVC, animated: true)

// Et pour fermer, depuis le VC présenté :
dismiss(animated: true)
```

Les alertes et les feuilles d'action passaient par `UIAlertController` + `UIAlertAction` :

```swift
let alert = UIAlertController(title: "Erreur",
                              message: "Impossible de charger les données.",
                              preferredStyle: .alert) // .actionSheet pour un confirmationDialog
alert.addAction(UIAlertAction(title: "OK", style: .cancel))
present(alert, animated: true)
```

Différence de mentalité : en UIKit, **tu** déclenches impérativement la présentation et la fermeture (`present` / `dismiss`) et tu gères le cycle de vie des VC. En SwiftUI, tu décris un état booléen et le framework affiche ou ferme l'écran tout seul.

👉 En SwiftUI : `TabView` + `.sheet` / `.fullScreenCover` / `.alert` / `.confirmationDialog` pilotés par `@State`, et `@Environment(\.dismiss)` pour fermer.

## Résumé

- `TabView` crée une tabbar.
- Une `NavigationStack` par onglet permet une navigation propre.
- `sheet` affiche une modale.
- `fullScreenCover` affiche un écran plein écran.
- `dismiss()` ferme l’écran actuel.
- `alert` affiche une information courte.
- `confirmationDialog` propose plusieurs actions.

## Exercice

Ouvre une sheet, saisis un nom et ferme par geste. Recommence avec un bouton Fermer qui appelle le `dismiss` de la vue présentée. Explique pourquoi cela ne change pas la pile de l’onglet. Pour comparer booléen et optional, suis la [fiche 05.04](fiche_05_04_navigation_pilotee_par_etat.md).
