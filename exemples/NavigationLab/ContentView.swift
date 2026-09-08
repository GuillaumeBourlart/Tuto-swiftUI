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
