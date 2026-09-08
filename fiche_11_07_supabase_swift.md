# Fiche 11.07 — Supabase avec Swift : Auth, Postgres, Realtime, Storage

## Objectif (2-3 lignes)
Supabase est absent du cours mais très demandé en freelance comme alternative open-source à Firebase. Tu vas savoir l'installer, t'authentifier, requêter du Postgres en typé `Codable`, écouter le Realtime et gérer le Storage. On le présente en miroir de Firebase pour que tu sois opérationnel vite.

## 1. C'est quoi Supabase
Un backend-as-a-service open-source bâti sur **Postgres**. Une seule plateforme te donne :
- **Auth** : email/password, magic link, OAuth (Apple, Google…), gestion de session JWT.
- **Postgres** : une vraie base SQL relationnelle (jointures, contraintes, vues, fonctions), exposée via une API REST auto-générée (PostgREST).
- **Realtime** : abonnement aux changements de tables (INSERT/UPDATE/DELETE) via WebSocket.
- **Storage** : buckets de fichiers (images, vidéos) avec URLs publiques ou signées.
- **RLS (Row Level Security)** : règles de sécurité écrites en SQL, directement sur les lignes. C'est le pilier sécurité de Supabase.

Réflexe : tu connais Firebase ? Supabase = même promesse "backend sans serveur à gérer", mais **SQL/relationnel** au lieu de NoSQL documentaire, et tu peux **self-host** (open-source) si un client l'exige.

Le RLS s'écrit en SQL dans le dashboard (SQL Editor). Pour la table `animals` du §4 :

```sql
alter table animals enable row level security;

-- chacun ne voit que SES animaux
create policy "select_own" on animals
  for select using (auth.uid() = owner_id);

-- chacun ne peut insérer que pour lui-même
create policy "insert_own" on animals
  for insert with check (auth.uid() = owner_id);
```

`using` filtre les lignes lues (SELECT/UPDATE/DELETE) ; `with check` valide les lignes écrites (INSERT/UPDATE). C'est le pendant SQL des Security Rules Firestore.

## 2. Installer supabase-swift (SPM) et créer le client
File > Add Package Dependencies > `https://github.com/supabase/supabase-swift`.

```swift
import Supabase

let supabase = SupabaseClient(
    supabaseURL: URL(string: "https://xyzcompany.supabase.co")!,
    supabaseKey: Secrets.supabaseAnonKey
)
```

**Où stocker l'anon key ?** Elle est *publique* par conception (elle part dans l'app, comme une `GoogleService-Info.plist`). Sa sécurité ne repose PAS sur le secret : elle repose sur les **policies RLS**. Mais on évite quand même de la coder en dur dans le source versionné : on la met dans un `.xcconfig` / `Info.plist` injecté, hors Git.

```swift
enum Secrets {
    static var supabaseAnonKey: String {
        Bundle.main.object(forInfoDictionaryKey: "SUPABASE_ANON_KEY") as? String ?? ""
    }
}
```

Réflexe UIKit/Firebase : équivalent de `FirebaseApp.configure()`, sauf que tu instancies un client toi-même (souvent un singleton). La `service_role` key, elle, est SECRÈTE et ne doit JAMAIS être dans l'app — uniquement côté serveur/Edge Function.

## 3. Auth : signUp / signIn / session / signOut
```swift
// Inscription
let auth = try await supabase.auth.signUp(email: "a@b.com", password: "secret123")
let user = auth.user

// Connexion
let session = try await supabase.auth.signIn(email: "a@b.com", password: "secret123")

// Session courante (nil si déconnecté)
let current = try? await supabase.auth.session
let userId = current?.user.id          // UUID, sert de clé pour le RLS

// Déconnexion
try await supabase.auth.signOut()
```

OAuth Apple/Google en bref — tu obtiens un `idToken` via `ASAuthorizationController` (Sign in with Apple natif), puis :

```swift
try await supabase.auth.signInWithIdToken(
    credentials: .init(provider: .apple, idToken: idToken, nonce: rawNonce)
)
```

Observer l'état (équivalent de `Auth.auth().addStateDidChangeListener`) :

```swift
for await (event, session) in supabase.auth.authStateChanges {
    if event == .signedIn || event == .signedOut { /* maj UI */ }
}
```

Le client **persiste et rafraîchit** le JWT automatiquement (Keychain), donc l'utilisateur reste connecté entre les lancements.

## 4. Requêtes Postgres (select / insert / update / delete)
Table `animals` avec colonnes `id (uuid)`, `name (text)`, `owner_id (uuid)`, `created_at (timestamptz)`.

```swift
struct Animal: Codable, Identifiable {
    let id: UUID
    let name: String
    let ownerId: UUID
    let createdAt: Date

    enum CodingKeys: String, CodingKey {
        case id, name
        case ownerId = "owner_id"        // snake_case Postgres -> camelCase Swift
        case createdAt = "created_at"
    }
}
```

```swift
// SELECT … WHERE owner_id = ? ORDER BY created_at DESC
let animals: [Animal] = try await supabase
    .from("animals")
    .select()
    .eq("owner_id", value: userId)
    .order("created_at", ascending: false)
    .execute()
    .value                                // décode direct en [Animal]
```

`.execute().value` décode le JSON renvoyé en ton type `Codable` (un `JSONDecoder` Supabase gère les dates ISO8601 par défaut).

```swift
// INSERT (et on récupère la row créée)
struct NewAnimal: Encodable {
    let name: String
    let ownerId: UUID
    enum CodingKeys: String, CodingKey { case name; case ownerId = "owner_id" }
}

let created: Animal = try await supabase
    .from("animals")
    .insert(NewAnimal(name: "Rex", ownerId: userId))
    .select()                             // sans ça, rien n'est renvoyé
    .single()                             // une seule row -> Animal (pas [Animal])
    .execute()
    .value

// UPDATE
try await supabase.from("animals")
    .update(["name": "Rex II"])
    .eq("id", value: created.id)
    .execute()

// DELETE
try await supabase.from("animals")
    .delete()
    .eq("id", value: created.id)
    .execute()
```

Réflexe Firestore : `db.collection("animals").whereField("owner_id", isEqualTo: uid)` devient `.from("animals").select().eq("owner_id", value: uid)`. Tu penses en **requête SQL** (filtres, tris, jointures via `select("*, owner:owners(*)")`) au lieu de chemins de documents.

## 5. Realtime : écouter les changements d'une table
```swift
let channel = supabase.channel("animals-watch")

let inserts = channel.postgresChange(
    InsertAction.self, schema: "public", table: "animals"
)

await channel.subscribe()

Task {
    for await change in inserts {
        let newAnimal = try change.decodeRecord(as: Animal.self, decoder: JSONDecoder())
        // maj du @Observable model sur le MainActor
    }
}
```

Tu peux aussi écouter `UpdateAction.self` et `DeleteAction.self` (filtre possible : `filter: "owner_id=eq.\(userId)"`). Pense à `await channel.unsubscribe()` quand la vue disparaît. Note : les versions récentes du SDK proposent `try await channel.subscribeWithError()` (qui remonte les erreurs d'abonnement) à la place de `subscribe()`.

Réflexe Firestore : équivalent d'un `addSnapshotListener`, mais ici tu choisis explicitement INSERT/UPDATE/DELETE, et il faut **activer Realtime** sur la table dans le dashboard.

## 6. Storage : upload / download / URL
```swift
let bucket = supabase.storage.from("avatars")
let path = "\(userId)/photo.jpg"

// Upload
try await bucket.upload(path, data: imageData,
                        options: FileOptions(contentType: "image/jpeg", upsert: true))

// Download (bucket privé)
let data = try await bucket.download(path: path)

// URL publique (bucket public)
let publicURL = try bucket.getPublicURL(path: path)

// URL signée temporaire (bucket privé, expire en 1h)
let signed = try await bucket.createSignedURL(path: path, expiresIn: 3600)
```

Réflexe Firebase Storage : `Storage.storage().reference().putData(...)` puis `downloadURL()`. Ici tu choisis public (URL stable) vs signé (URL qui expire), selon que le bucket est public ou protégé par RLS.

## Points à connaître (2-4 pièges)
- **Sans RLS, ta base est ouverte.** L'anon key étant publique, n'importe qui peut requêter une table dont RLS est désactivé. Active RLS sur CHAQUE table et écris des policies (`using (auth.uid() = owner_id)` en lecture, `with check (...)` en écriture). C'est l'erreur n°1 des débutants Supabase.
- **`.insert(...)` ne renvoie rien par défaut.** Tu dois chaîner `.select()` (et `.single()` pour une row) pour récupérer la ligne créée et la décoder.
- **snake_case vs camelCase.** Postgres est en `snake_case`. Soit tu mappes via `CodingKeys`, soit tu configures un décodeur `.convertFromSnakeCase` — sans ça, échec de décodage silencieux côté `value`.
- **Realtime n'est pas activé par défaut** sur une table. Si ton listener ne reçoit rien, vérifie l'onglet Realtime/Replication du dashboard avant de chercher un bug dans le code.

## Exercice (concret, autonome, 10-20 min)
Crée une table `animals` (colonnes du §4) dans un projet Supabase, active RLS avec une policy `auth.uid() = owner_id` pour SELECT et INSERT. Dans une `View` SwiftUI :
1. Connecte un utilisateur (`signIn`) au lancement.
2. Charge ses animaux avec un `.select().eq("owner_id", ...)` typé `[Animal]`.
3. Un `TextField` + bouton "Ajouter" qui fait un `.insert(...).select().single()`, ajoute la row retournée à ton tableau `@State`/`@Observable`, et l'affiche dans une `List`.
Bonus : gère les états chargement / vide / erreur (cf. fiche 03.05).

## Question d'entretien (1-3 Q AVEC réponse modèle courte)
**Q : "Firebase ou Supabase, comment tu choisis ?"**
R : Firebase pour du NoSQL documentaire, un écosystème Google mature (Analytics, Crashlytics, Remote Config, FCM) et un time-to-market ultra rapide ; idéal quand les données sont peu relationnelles. Supabase quand tu veux du **SQL relationnel** (jointures, contraintes, intégrité), une **sécurité par policies RLS** en SQL, l'open-source / la possibilité de self-host (souveraineté des données, exigences client/RGPD), et éviter le lock-in. En résumé : modèle de données relationnel + besoin de contrôle/portabilité → Supabase ; prototype rapide, NoSQL, écosystème Google → Firebase.

**Q : "L'anon key est dans l'app, c'est pas un trou de sécurité ?"**
R : Non, elle est publique par design. La sécurité repose sur le **RLS** : chaque requête passe par les policies SQL qui filtrent selon `auth.uid()`. La clé secrète à protéger est la `service_role`, qui bypass le RLS et ne vit que côté serveur.

## Résumé (puces)
- Supabase = backend open-source sur **Postgres** : Auth + SQL + Realtime + Storage + **RLS**, alternative relationnelle à Firebase.
- Client : `SupabaseClient(supabaseURL:supabaseKey:)`, anon key publique mais injectée via config (jamais la `service_role` dans l'app).
- Auth : `signUp` / `signIn` / `session` / `signOut`, OAuth via `signInWithIdToken`, JWT persisté/rafraîchi auto.
- Postgres : `.from("t").select().eq(...).order(...).execute().value` décode en `Codable` ; `insert` exige `.select()` pour renvoyer la row.
- Realtime : `channel.postgresChange(...)` + `subscribe()` pour INSERT/UPDATE/DELETE (à activer sur la table).
- Storage : `upload` / `download` / `getPublicURL` / `createSignedURL`.
- RLS : `enable row level security` + `create policy ... using(...) with check(...)` avec `auth.uid()`.
- Piège n°1 : **active RLS partout**, sinon base ouverte.
