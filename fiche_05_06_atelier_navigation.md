# Fiche 05.06 — Atelier : un carnet clients de bout en bout

## Objectif

Passer de la lecture à la pratique : changer de racine, pousser un détail, présenter une sheet, annuler une édition et revenir à la liste. Le code tient dans un seul fichier pour rendre les relations visibles.

## 1. Installation

Crée un projet **iOS App / SwiftUI / Swift**, cible **iOS 17 minimum**. Remplace son `ContentView.swift` par le code ci-dessous. Garde l’unique fichier App généré, qui appelle `ContentView()`.

Le fichier est aussi disponible dans `exemples/NavigationLab/ContentView.swift` à la racine du dossier du cours, ou via [Télécharger ContentView.swift](/exemples/NavigationLab/ContentView.swift) dans le lecteur. Aucune dépendance externe.

Cette application simule une session locale. Il n’y a ni authentification réelle ni sauvegarde des clients. Le but est d’observer les mécanismes de navigation.

## 2. Ce que chaque état commande

| État | Propriétaire | Effet |
|---|---|---|
| `signedIn` | `ContentView` | Choisit la branche entrée ou espace clients |
| `clients` | `NavigationWorkspace` | Source de vérité de la liste et du détail |
| `path` | `NavigationWorkspace` | Pile des détails ouverts par identifiant |
| `showHelp` | `NavigationWorkspace` | Présentation d’une aide par booléen |
| `modal` | `NavigationWorkspace` | Une seule sheet : création ou modification |
| `pendingRoute` | `NavigationWorkspace` | Ouvre le détail après fermeture d’une création réussie |
| `draft` | `ClientForm` | Brouillon abandonné si on annule |

La destination d’aide pilotée par booléen n’ajoute pas une valeur à `[ClientRoute]`. Le compteur du bas compte **les routes par valeur**, pas toutes les présentations. C’est volontaire pour comparer les deux formes. Si le produit devait contrôler toutes les étapes avec un seul tableau, ajoute un cas `.help` à `ClientRoute` et remplace le booléen par cette route.

## 3. Code autonome

```swift
import SwiftUI

// iOS 17+. Remplace ContentView.swift dans un projet iOS App SwiftUI.
// Authentification locale de démonstration, sans service distant.
struct ContentView: View {
    @State private var signedIn = false

    var body: some View {
        if signedIn {
            NavigationWorkspace { signedIn = false }
        } else {
            VStack(spacing: 20) {
                Text("Carnet clients").font(.largeTitle.bold())
                Text("Atelier local : état, navigation et édition")
                Button("Entrer dans la démonstration") { signedIn = true }
                    .buttonStyle(.borderedProminent)
            }
            .padding()
        }
    }
}

private struct Client: Identifiable, Hashable {
    let id: UUID
    var name: String
}

private enum ClientRoute: Hashable {
    case detail(UUID)
}

private enum ClientModal: Identifiable {
    case create
    case edit(Client)

    var id: String {
        switch self {
        case .create: "create"
        case .edit(let client): "edit-\(client.id)"
        }
    }
}

private struct NavigationWorkspace: View {
    let onLogout: () -> Void
    @State private var clients = [Client(id: UUID(), name: "Ada")]
    @State private var path: [ClientRoute] = []
    @State private var modal: ClientModal?
    @State private var pendingRoute: ClientRoute?
    @State private var showHelp = false

    var body: some View {
        NavigationStack(path: $path) {
            List(clients) { client in
                NavigationLink(client.name, value: ClientRoute.detail(client.id))
            }
            .navigationTitle("Clients")
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Sortir", action: onLogout)
                }
                ToolbarItemGroup(placement: .topBarTrailing) {
                    Button("Aide") { showHelp = true }
                    Button("Ajouter") { modal = .create }
                }
            }
            .navigationDestination(for: ClientRoute.self) { route in
                switch route {
                case .detail(let id):
                    if let client = clients.first(where: { $0.id == id }) {
                        VStack(spacing: 20) {
                            Text(client.name).font(.title)
                            Button("Modifier") { modal = .edit(client) }
                            Button("Retour à la liste") { path.removeAll() }
                        }
                        .navigationTitle("Fiche client")
                    } else {
                        Text("Ce client n’existe plus")
                    }
                }
            }
            .navigationDestination(isPresented: $showHelp) {
                Text("Ajoute un client, puis modifie sa fiche.")
                    .padding()
                    .navigationTitle("Aide")
            }
        }
        .safeAreaInset(edge: .bottom) {
            Text("Routes : \(path.count) · aide : \(showHelp ? "oui" : "non")")
                .font(.caption.monospaced())
                .padding(8)
                .frame(maxWidth: .infinity)
                .background(.regularMaterial)
        }
        .sheet(item: $modal, onDismiss: openPendingRoute) { selection in
            switch selection {
            case .create:
                ClientForm(title: "Nouveau client", initialName: "") { name in
                    let client = Client(id: UUID(), name: name)
                    clients.append(client)
                    pendingRoute = .detail(client.id)
                    modal = nil
                }
            case .edit(let client):
                ClientForm(title: "Modifier", initialName: client.name) { name in
                    if let index = clients.firstIndex(where: { $0.id == client.id }) {
                        clients[index].name = name
                    }
                    modal = nil
                }
            }
        }
    }

    private func openPendingRoute() {
        guard let route = pendingRoute else { return }
        pendingRoute = nil
        path.append(route)
    }
}

private struct ClientForm: View {
    let title: String
    let onSave: (String) -> Void
    @Environment(\.dismiss) private var dismiss
    @State private var draft: String

    init(title: String, initialName: String, onSave: @escaping (String) -> Void) {
        self.title = title
        self.onSave = onSave
        _draft = State(initialValue: initialName)
    }

    private var trimmedName: String {
        draft.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    var body: some View {
        NavigationStack {
            Form { TextField("Nom", text: $draft) }
                .navigationTitle(title)
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) {
                        Button("Annuler") { dismiss() }
                    }
                    ToolbarItem(placement: .confirmationAction) {
                        Button("Enregistrer") { onSave(trimmedName) }
                            .disabled(trimmedName.isEmpty)
                    }
                }
        }
    }
}
```

## 4. Manipulations et résultats attendus

1. **Entrer** : l’espace clients remplace l’entrée. Aucun bouton Retour vers la connexion : ce n’est pas un push.
2. **Toucher Ada** : le compteur de routes passe à 1. Retour le remet à 0.
3. **Ouvrir Aide depuis la liste** : `showHelp` devient vrai, tandis que le tableau reste vide. Retour remet le booléen à faux.
4. **Ajouter Grace puis Annuler** : aucun client ajouté, aucune route poussée. Le brouillon n’est pas une écriture directe dans `clients`.
5. **Ajouter Grace puis Enregistrer** : la sheet se ferme, puis le détail de Grace s’ouvre. La route en attente est consommée et remise à `nil`.
6. **Modifier Grace, taper un autre nom, puis Annuler** : le détail reste Grace. Recommence et Enregistre : le détail et la liste affichent le nouveau nom, avec le même identifiant.
7. **Retour à la liste** : `path.removeAll()` retire les détails, conserve les clients.
8. **Sortir puis Entrer** : l’espace clients a été retiré de l’arbre. Son état local est réinitialisé ; seule Ada revient. C’est attendu ici, pas une persistance de données.

Teste également un nom vide ou composé d’espaces : Enregistrer doit être désactivé. Ferme une sheet par glissement : aucune sauvegarde ni navigation parasite ne doit se produire.

## 5. Pourquoi attendre onDismiss ?

Après une création, la closure ajoute le client, prépare une route et ferme la sheet. `onDismiss` pousse ensuite le détail et consomme la route. Ainsi, Annuler ne pousse rien et une fermeture ultérieure ne rejoue pas un ancien succès. On ne confond pas l’état durable de la session et un événement à consommer.

Dans une application réelle, ajoute les états chargement/erreur et n’annonce le succès qu’après la réussite du service. L’annulation ou une réponse tardive ne doit pas naviguer vers un écran inattendu.

## 6. Défis sans recopier la solution

- Ajoute un cas `.help` à l’enum, puis supprime le booléen. L’aide doit maintenant compter comme une route.
- Transforme le formulaire en binding direct. Observe pourquoi Annuler ne peut plus abandonner les changements, puis rétablis le brouillon.
- Déplace `clients` au-dessus du `if signedIn`. Observe qu’ils survivent à Sortir/Entrer mais pas à une fermeture du processus.
- Ajoute un deuxième onglet avec sa propre pile en suivant 05.05.
- Écris trois phrases expliquant quand tu extrairais un Router, un service et un modèle observable. N’extrais rien tant que tu ne peux pas nommer le problème résolu.

## Rappel UIKit

Repère UIKit : toucher un client correspond au besoin de `pushViewController`, modifier au besoin de `present`, et sortir de l’espace clients à un changement de racine. Le brouillon et la validation du nom sont des décisions de produit qui restent les mêmes dans les deux frameworks.

## Pour valider cette fiche

Refais une petite version liste → détail → édition annulable depuis un fichier vide. Tu dois pouvoir justifier chaque état et expliquer le retour système, la fermeture de sheet et le remplacement de la racine.
