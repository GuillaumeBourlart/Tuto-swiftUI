# Fiche 11.08 — Règles de sécurité backend : Firestore Rules et Postgres RLS

## Objectif
Écrire de vraies règles de sécurité côté backend (Firestore Security Rules et Supabase/Postgres RLS), pas juste du conceptuel. Comprendre pourquoi le client n'est jamais de confiance, sécuriser l'accès "owner-only", gérer les rôles, et faire une suppression de compte conforme RGPD / App Store 5.1.1(v).

---

## 1. Le principe : le client n'est JAMAIS de confiance

Ton app iOS tourne sur l'appareil de l'utilisateur. N'importe qui peut la décompiler, intercepter le trafic (proxy type Charles/Proxyman), forger une requête. **Toute vérification faite uniquement côté Swift est cosmétique.**

```text
[App iOS]  --- requête forgeable --->  [Backend = frontière de sécurité]
   ↑ jamais de confiance                      ↑ valide TOUT ici
```

Réflexe UIKit/iOS -> moderne : tu validais déjà un formulaire côté app pour l'UX (désactiver un bouton). Garde-le pour l'UX, mais **rejoue toujours la validation critique côté serveur**. Le contrôle d'accès (qui peut lire/écrire quoi) ne vit QUE côté backend.

Ce qui se valide obligatoirement côté serveur :
- l'identité (qui es-tu ? -> `request.auth` / `auth.uid()`) ;
- l'autorisation (as-tu le droit sur CE document ? -> ownership, rôle) ;
- l'intégrité des données (champs obligatoires, types, valeurs interdites comme `isAdmin: true`).

---

## 2. Firestore Security Rules — structure de base

Les règles vivent dans `firestore.rules`, déployées via Firebase CLI (`firebase deploy --only firestore:rules`). Elles s'exécutent sur les serveurs Google à chaque lecture/écriture du SDK client. Elles **ne s'appliquent pas** à l'Admin SDK (backend de confiance).

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    // Par défaut : tout est refusé. On ouvre explicitement.

    match /animals/{animalId} {
      // Lecture autorisée seulement au propriétaire connecté
      allow read: if request.auth != null
                  && resource.data.ownerId == request.auth.uid;

      // Création : doit être connecté ET se déclarer propriétaire
      allow create: if request.auth != null
                    && request.resource.data.ownerId == request.auth.uid;

      // Update/Delete : doit déjà être le propriétaire
      allow update, delete: if request.auth != null
                            && resource.data.ownerId == request.auth.uid;
    }
  }
}
```

Distinction cruciale :
- `resource.data` = le document **tel qu'il existe déjà** (avant l'écriture). Utilisé pour read/update/delete.
- `request.resource.data` = le document **tel qu'il sera après** l'écriture (ce que le client envoie). Utilisé pour create/update.

Sur un `create`, `resource` n'existe pas encore -> ne teste que `request.resource.data`.

---

## 3. Firestore — validation de champs

Le contrôle d'accès ne suffit pas : il faut aussi empêcher d'écrire des données invalides ou de l'escalade de privilège.

```javascript
match /animals/{animalId} {
  allow create: if request.auth != null
    && request.resource.data.ownerId == request.auth.uid
    // champs obligatoires et bien typés
    && request.resource.data.name is string
    && request.resource.data.name.size() > 0
    && request.resource.data.name.size() <= 60
    && request.resource.data.age is int
    && request.resource.data.age >= 0
    // interdit les clés non prévues (anti-injection de champ)
    && request.resource.data.keys().hasOnly(
         ['ownerId', 'name', 'age', 'createdAt']);

  allow update: if request.auth != null
    && resource.data.ownerId == request.auth.uid
    // on ne peut PAS changer le propriétaire d'un document existant
    && request.resource.data.ownerId == resource.data.ownerId;
}
```

`hasOnly([...])` bloque un client malveillant qui ajouterait `isPremium: true` ou `role: "admin"`. C'est l'équivalent serveur d'une whitelist de champs.

Pas idéal : `allow read, write: if request.auth != null;` -> n'importe quel utilisateur connecté lit/écrit TOUS les documents de tout le monde.
Préférable : filtrer par `ownerId` comme ci-dessus.

---

## 4. Firestore — rôles via custom claims

Pour un rôle admin/modérateur, n'écris pas le rôle dans un document Firestore que le client pourrait modifier. Utilise les **custom claims** du token Firebase Auth, posés côté backend (Admin SDK / Cloud Function) :

```javascript
// Backend Node (Admin SDK), jamais côté app :
// await admin.auth().setCustomUserClaims(uid, { role: 'admin' });

match /animals/{animalId} {
  // Un admin peut tout lire ; sinon owner-only
  allow read: if request.auth != null
    && (request.auth.token.role == 'admin'
        || resource.data.ownerId == request.auth.uid);
}
```

Le claim est signé dans le JWT : le client ne peut pas le falsifier. Après `setCustomUserClaims`, l'app doit rafraîchir son token (`Auth.auth().currentUser?.getIDTokenResult(forcingRefresh: true)`).

---

## 5. Supabase / Postgres RLS — activer et écrire une policy

Avec Supabase (Postgres), la sécurité passe par **Row Level Security**. Point clé : tant que RLS n'est pas activée sur une table, soit elle est ouverte, soit (selon l'API) inaccessible. **Activer RLS = refus par défaut**, puis tu ouvres avec des policies.

```sql
-- 1. Activer RLS (sinon les policies ne s'appliquent pas)
alter table animals enable row level security;

-- 2. SELECT : ne voir que ses propres lignes
create policy "read own animals"
on animals for select
using ( auth.uid() = owner_id );

-- 3. INSERT : ne créer que des lignes dont on est propriétaire
create policy "insert own animals"
on animals for insert
with check ( auth.uid() = owner_id );

-- 4. UPDATE : modifier ses lignes, et rester propriétaire après
create policy "update own animals"
on animals for update
using ( auth.uid() = owner_id )
with check ( auth.uid() = owner_id );

-- 5. DELETE : supprimer ses propres lignes
create policy "delete own animals"
on animals for delete
using ( auth.uid() = owner_id );
```

Distinction clé (équivalent du couple `resource` / `request.resource` Firestore) :
- `using` = filtre les lignes **existantes** que l'opération a le droit de voir/toucher (SELECT, UPDATE, DELETE).
- `with check` = valide les lignes **après** écriture (INSERT, UPDATE). Empêche d'insérer/modifier une ligne avec `owner_id` ≠ soi.

`auth.uid()` renvoie l'UUID de l'utilisateur extrait du JWT vérifié par Postgres. Infalsifiable côté client.

---

## 6. Supabase — rôles via colonne + policy

Pour un rôle, ajoute une colonne `role` sur une table `profiles` (1 ligne par user, `id = auth.uid()`), puis lis-la dans tes policies. Ne laisse jamais l'utilisateur écrire sa propre colonne `role`.

```sql
-- Un admin voit tout ; les autres voient leurs lignes
create policy "read animals (owner or admin)"
on animals for select
using (
  auth.uid() = owner_id
  or exists (
    select 1 from profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
);

-- profiles : chacun met à jour son profil...
create policy "update own profile"
on profiles for update
using ( auth.uid() = id )
with check ( auth.uid() = id );

-- ...mais NE PEUT PAS changer la colonne role : on retire le privilège
-- d'UPDATE sur cette seule colonne (plus robuste qu'un test dans la policy).
revoke update (role) on profiles from authenticated;
```

Pourquoi `revoke update (role)` plutôt qu'un test dans le `with check` ? Une policy RLS n'a pas accès à l'ancienne valeur de la ligne (pas de `OLD` comme dans un trigger) : tenter de comparer le nouveau `role` à un `select role from profiles where id = auth.uid()` est fragile et trompeur. Le privilège au niveau colonne, lui, bloque proprement toute écriture de `role` par le rôle `authenticated`. Seul le backend (service role) peut alors poser un rôle.

Côté Swift, l'appel reste trivial : le SDK envoie le JWT, Postgres applique la policy. Tu n'écris jamais de `WHERE owner_id = ...` côté app pour la sécurité — la base le fait, et ne ment pas.

```swift
// Supabase Swift SDK — la RLS filtre déjà côté serveur
let animals: [Animal] = try await supabase
    .from("animals")
    .select()
    .execute()
    .value
// Renvoie UNIQUEMENT les lignes de l'utilisateur courant, même sans .eq("owner_id", uid)
```

---

## 7. Suppression de compte conforme (RGPD / App Store 5.1.1(v))

Depuis juin 2022, **toute app qui permet de créer un compte doit permettre de le supprimer depuis l'app** (guideline App Store 5.1.1(v)). Masquer un bouton ou rediriger vers un email = rejet. RGPD ajoute le droit à l'effacement.

Séquence correcte :
1. **Réauthentifier** (opération sensible -> Firebase exige un token récent, sinon `requiresRecentLogin`).
2. **Supprimer les données** en cascade (documents Firestore/Storage ou lignes Postgres).
3. **Supprimer le compte Auth** en dernier (une fois Auth supprimé, tu n'as plus l'`uid` pour nettoyer).

L'ordre est important : supprime les données AVANT le compte. En pratique, la suppression en cascade et fiable se fait **côté backend** (Cloud Function `deleteUser`, ou `ON DELETE CASCADE` + Edge Function), car l'app peut être tuée en plein milieu.

```swift
import FirebaseAuth
import FirebaseFirestore

@MainActor
func deleteAccount() async throws {
    guard let user = Auth.auth().currentUser else { return }
    let uid = user.uid

    // 1. Réauth récente requise (ex. ré-saisie mot de passe ou Sign in with Apple)
    let credential = try await reauthenticate() // EmailAuthProvider / OAuth selon le cas
    try await user.reauthenticate(with: credential)

    // 2. Supprimer les données utilisateur (idéalement déclenché côté backend)
    let db = Firestore.firestore()
    let snapshot = try await db.collection("animals")
        .whereField("ownerId", isEqualTo: uid)
        .getDocuments()
    for doc in snapshot.documents {
        try await doc.reference.delete()
    }
    // + supprimer les fichiers Storage de l'utilisateur (préfixe users/{uid}/...)

    // 3. Supprimer le compte Auth en dernier
    try await user.delete()
}
```

Côté Supabase : suppression de l'utilisateur Auth via une Edge Function avec la **service role key** (jamais dans l'app), les tables liées partant en `ON DELETE CASCADE` sur `auth.users(id)`.

---

## Points à connaître
- **Laisser une collection/table ouverte.** Le piège n°1 : `allow read, write: if true;` "le temps du dev", ou oublier `enable row level security`. Tout est exposé publiquement, y compris les données d'autres users. Vérifie chaque table/collection avant prod.
- **Valider uniquement côté app.** Désactiver un bouton ou un `guard` en Swift n'empêche personne de forger la requête. Si ce n'est pas dans les Rules / RLS, ce n'est pas sécurisé.
- **Confondre `resource` et `request.resource`** (Firestore) ou `using` et `with check` (RLS). `resource`/`using` = état actuel ; `request.resource`/`with check` = état après écriture. Mauvais choix = soit ça bloque tout, soit ça laisse passer l'escalade de privilège (changer son `ownerId`/`role`).
- **Supprimer le compte Auth avant les données.** Tu perds l'`uid`/UUID nécessaire au nettoyage -> données orphelines, non-conformité RGPD. Données d'abord, Auth en dernier, idéalement côté backend.

---

## Exercice (10-20 min)
Pour une collection/table `notes` où chaque note a un propriétaire, écris :

1. **Firestore** : une règle qui n'autorise lecture, création, modification et suppression QUE par le propriétaire, où la note stocke `ownerId`, et où on ne peut pas réassigner `ownerId` lors d'un update.

2. **Supabase RLS** : les 4 policies (select/insert/update/delete) équivalentes sur une table `notes(owner_id uuid, ...)`, après avoir activé RLS.

Bonus : ajoute dans la règle Firestore une validation `title` (string, 1 à 100 caractères) et un `hasOnly([...])` pour bloquer tout champ non prévu.

Solution de référence (à comparer après) :

```javascript
// Firestore
match /notes/{noteId} {
  allow read, delete: if request.auth != null
    && resource.data.ownerId == request.auth.uid;
  allow create: if request.auth != null
    && request.resource.data.ownerId == request.auth.uid
    && request.resource.data.title is string
    && request.resource.data.title.size() >= 1
    && request.resource.data.title.size() <= 100
    && request.resource.data.keys().hasOnly(['ownerId', 'title', 'createdAt']);
  allow update: if request.auth != null
    && resource.data.ownerId == request.auth.uid
    && request.resource.data.ownerId == resource.data.ownerId;
}
```

```sql
-- Supabase
alter table notes enable row level security;
create policy "notes_select" on notes for select using ( auth.uid() = owner_id );
create policy "notes_insert" on notes for insert with check ( auth.uid() = owner_id );
create policy "notes_update" on notes for update
  using ( auth.uid() = owner_id ) with check ( auth.uid() = owner_id );
create policy "notes_delete" on notes for delete using ( auth.uid() = owner_id );
```

---

## Question d'entretien
**Q : Comment sécurises-tu l'accès aux données dans une app iOS connectée à un backend ? Que valides-tu côté serveur ?**

R : Le client n'est jamais de confiance : la frontière de sécurité est le backend. Toute validation critique (identité, autorisation, intégrité) est rejouée côté serveur. Avec Firebase, j'écris des Firestore Security Rules : `request.auth != null` pour exiger l'authentification, et je compare l'`ownerId` du document à `request.auth.uid` pour du owner-only. Je valide aussi les champs (types, tailles, `hasOnly` pour interdire des clés non prévues comme un faux `role: admin`). Avec Supabase, j'active Row Level Security et j'écris des policies SQL avec `auth.uid() = owner_id`, en distinguant `using` (lignes existantes) et `with check` (état après écriture). Les rôles passent par les custom claims Firebase ou une colonne `role` lue dans les policies, jamais par une donnée que le client peut modifier. Côté app, je valide aussi mais uniquement pour l'UX.

**Q : Pourquoi ne pas juste filtrer les données côté app avec un `WHERE ownerId == currentUser` ?**

R : Parce que ce filtre est dans du code que l'attaquant contrôle. Il peut forger une requête sans ce filtre et lire toutes les données. La RLS / les Rules s'exécutent côté serveur et ne peuvent pas être contournées : la base elle-même ne renvoie que les lignes autorisées.

---

## Résumé
- Le client n'est jamais de confiance ; la frontière de sécurité est le backend.
- Firestore : `rules_version = '2'`, `match`, `allow read/write: if request.auth != null && resource.data.ownerId == request.auth.uid`.
- `resource.data` = document actuel ; `request.resource.data` = document après écriture (à valider en create/update).
- Valide les champs : types, tailles, `hasOnly([...])` pour bloquer l'injection de clés et l'escalade de privilège.
- Supabase : `enable row level security` (refus par défaut) puis policies SQL select/insert/update/delete avec `auth.uid() = owner_id`.
- `using` = lignes existantes ; `with check` = état après écriture.
- Rôles : custom claims Firebase (token signé) ou colonne `role` + policy ; jamais une donnée modifiable par le client.
- Suppression de compte (RGPD / App Store 5.1.1(v)) : réauth -> supprimer les données en cascade -> supprimer le compte Auth en dernier, idéalement côté backend.
- Pièges majeurs : laisser une collection/table ouverte, et valider uniquement côté app.
