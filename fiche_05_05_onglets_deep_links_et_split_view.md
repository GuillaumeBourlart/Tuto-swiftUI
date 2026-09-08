# Fiche 05.05 — Onglets, liens profonds, restauration et colonnes

## Objectif

Combiner les mécanismes de navigation sans partager accidentellement toute la pile entre les onglets. Savoir quand introduire un Router et distinguer ouverture par URL et restauration.

## 1. Un état par responsabilité

Une app à onglets possède une sélection d’onglet. Chaque onglet peut posséder sa pile de routes. Une sheet a son propre état de présentation. La session choisit éventuellement quelle racine est visible. Tous ces états ne vont pas dans le même tableau.

```text
Session → racine de l’application
  Onglet sélectionné
    Contacts → pile contacts
    Réglages → pile réglages
  Modale éventuelle → état séparé
```

Un Router peut regrouper ces propriétés lorsque plusieurs fonctionnalités doivent les coordonner. Pour une petite app, l’état local à la racine suffit. La fiche 06.06 présente l’extraction vers un objet ; apprends d’abord le comportement sans cette couche.

## 2. Exemple autonome : deux onglets et une URL

iOS 17+, compatible avec la syntaxe `tabItem`/`tag`. Affiche `TabsAndLinksDemo()` dans le projet d’entraînement.

```swift
import SwiftUI

enum CourseTab: Hashable { case contacts, settings }
enum ContactRoute: Hashable, Codable { case detail(id: Int) }
enum SettingsRoute: Hashable { case about }

func contactRoute(from url: URL) -> ContactRoute? {
    guard url.scheme == "cours-swiftui",
          url.host == "contact",
          url.user == nil,
          url.password == nil,
          url.port == nil,
          url.query == nil,
          url.fragment == nil else { return nil }
    let parts = url.pathComponents.filter { $0 != "/" }
    guard parts.count == 1, let id = Int(parts[0]), id > 0 else { return nil }
    return .detail(id: id)
}

struct TabsAndLinksDemo: View {
    @State private var selectedTab: CourseTab = .contacts
    @State private var contactsPath: [ContactRoute] = []
    @State private var settingsPath: [SettingsRoute] = []

    var body: some View {
        TabView(selection: $selectedTab) {
            NavigationStack(path: $contactsPath) {
                List {
                    NavigationLink("Ada", value: ContactRoute.detail(id: 1))
                    NavigationLink("Grace", value: ContactRoute.detail(id: 2))
                }
                .navigationTitle("Contacts")
                .navigationDestination(for: ContactRoute.self) { route in
                    switch route {
                    case .detail(let id): Text("Contact \(id)")
                    }
                }
            }
            .tabItem { Label("Contacts", systemImage: "person.2") }
            .tag(CourseTab.contacts)

            NavigationStack(path: $settingsPath) {
                List {
                    NavigationLink("À propos", value: SettingsRoute.about)
                    Button("Simuler l’URL du contact 2") {
                        if let url = URL(string: "cours-swiftui://contact/2") {
                            open(url)
                        }
                    }
                }
                .navigationTitle("Réglages")
                .navigationDestination(for: SettingsRoute.self) { route in
                    switch route {
                    case .about: Text("Cours SwiftUI")
                    }
                }
            }
            .tabItem { Label("Réglages", systemImage: "gear") }
            .tag(CourseTab.settings)
        }
        .onOpenURL { open($0) }
    }

    private func open(_ url: URL) {
        guard let route = contactRoute(from: url) else { return }
        selectedTab = .contacts
        contactsPath = [route]
    }
}
```

Le bouton de simulation fonctionne sans configuration. Pour recevoir réellement `cours-swiftui://contact/2`, ajoute le schéma `cours-swiftui` dans **Target → Info → URL Types → URL Schemes**. Une URL universelle HTTPS demande une configuration supplémentaire d’Associated Domains et du domaine ; ajouter `onOpenURL` seul ne suffit pas.

Le parseur rejette une URL étrangère ou mal formée. Cela ne remplace pas le contrôle d’accès : avec un backend, vérifie que le contact existe et que l’utilisateur a le droit de le consulter. Si la session n’est pas prête, conserve une route en attente, authentifie, puis applique-la une seule fois. Gère aussi la modale éventuellement ouverte avant de présenter un nouveau parcours. Référence : [onOpenURL — Apple](https://developer.apple.com/documentation/swiftui/view/onopenurl(perform:)).

## 3. Pourquoi remplacer la pile ?

`contactsPath = [route]` donne un état déterministe : accueil des contacts, puis contact visé. Recevoir la même URL ne crée pas plusieurs copies du détail. `append` correspond à une autre intention : poursuivre la pile actuelle. La bonne opération dépend du produit, pas du nom du pattern.

Vérifie : ouvre À propos dans Réglages, change d’onglet, puis reviens. L’étape Réglages reste présente, car elle a son propre état. Aucun besoin de deux routers pour observer cette propriété.

## 4. Restaurer n’est pas seulement encoder

Le tableau `ContactRoute` est `Codable`, donc il peut être encodé. Extrait qui réutilise l’enum précédente :

```swift
let saved = try JSONEncoder().encode([ContactRoute.detail(id: 2)])
let restored = try JSONDecoder().decode([ContactRoute].self, from: saved)
```

Pour une vraie restauration, il faut ensuite choisir un stockage, charger au bon moment, gérer un JSON invalide ou d’une ancienne version, attendre la session et vérifier les identifiants. Une route valide syntaxiquement peut désigner une donnée supprimée. Prévois alors un écran « introuvable » ou un retour vers une route sûre.

Ne stocke ni token ni donnée sensible dans une route. Préfère des identifiants aux gros modèles susceptibles de changer. Pour une scène, `@SceneStorage` peut conserver certaines valeurs sérialisées, sans garantie de sauvegarde métier. Un simple `@State path` conserve la pile pendant sa durée de vie, **pas après tous les relancements**. Avec `NavigationPath`, sa représentation codable n’est disponible que si les éléments sont encodables. Référence : [Restoring your app’s state with SwiftUI — Apple](https://developer.apple.com/documentation/swiftui/restoring-your-app-s-state-with-swiftui).

## 5. NavigationSplitView : liste et détail adaptatifs

Exemple autonome, iOS 17+ :

```swift
import SwiftUI

struct SplitContact: Identifiable, Hashable {
    let id: Int
    let name: String
}

struct SplitNavigationDemo: View {
    private let contacts = [
        SplitContact(id: 1, name: "Ada"),
        SplitContact(id: 2, name: "Grace")
    ]
    @State private var selectedID: Int?

    var body: some View {
        NavigationSplitView {
            List(contacts, selection: $selectedID) { contact in
                NavigationLink(contact.name, value: contact.id)
            }
            .navigationTitle("Contacts")
        } detail: {
            if let contact = contacts.first(where: { $0.id == selectedID }) {
                Text(contact.name).navigationTitle("Profil")
            } else {
                Text("Sélectionne un contact")
            }
        }
    }
}
```

Teste en largeur compacte et sur iPad. La sélection est le modèle de la relation liste/détail ; le conteneur adapte la présentation aux contraintes de place. Ne superpose pas des stacks par réflexe : `NavigationSplitView` fournit déjà une structure de navigation à ses colonnes. Ajoute une stack explicite seulement pour un besoin de navigation plus profonde bien identifié. Référence : [NavigationSplitView — Apple](https://developer.apple.com/documentation/swiftui/navigationsplitview).

## Exercice et vérification

Dans l’exemple d’onglets, ouvre deux fois l’URL du contact 2 : une seule étape doit apparaître. Essaie `cours-swiftui://contact/abc`, `cours-swiftui://contact/-1`, `autre://contact/2` et `cours-swiftui://contact/2/inconnu` : aucune navigation ne doit se produire. Ajoute ensuite un traitement pour un contact inexistant (par exemple 999).

## Rappel UIKit

Repère UIKit : `UITabBarController` pouvait contenir un `UINavigationController` par onglet, chacun conservant sa pile. Le principe d’indépendance reste le même ici, exprimé avec une sélection et des tableaux de routes. `NavigationSplitView` répond au besoin d’une interface en colonnes que tu gérais notamment avec `UISplitViewController`.

## Pour valider cette fiche

Tu sais expliquer les trois opérations d’un lien profond : valider/interpréter l’URL, choisir l’onglet, appliquer la pile. Tu distingues cette opération d’une restauration persistante et d’une vérification d’autorisation.
