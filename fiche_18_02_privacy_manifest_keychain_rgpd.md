# Fiche 18.02 — Vie privée : Privacy Manifest, Keychain durci et RGPD

## Objectif

Déclarer correctement la collecte de données pour passer la review App Store (Privacy Manifest obligatoire depuis 2024), durcir le stockage des secrets dans le Keychain, et couvrir le minimum RGPD côté app iOS : consentement, minimisation, effacement et suppression de compte conforme.

---

## 1. Privacy Manifest (`PrivacyInfo.xcprivacy`) — bloquant

Depuis le 1er mai 2024, Apple **rejette à la soumission** toute app (et tout SDK tiers listé) qui n'inclut pas de Privacy Manifest quand elle touche aux données sensibles ou aux **Required Reason APIs**. C'est un fichier `.plist` nommé exactement `PrivacyInfo.xcprivacy`, ajouté à la cible (target) de l'app.

Il déclare 4 choses :

```text
NSPrivacyTracking            -> true/false : l'app fait-elle du tracking ?
NSPrivacyTrackingDomains     -> domaines contactés à des fins de tracking
NSPrivacyCollectedDataTypes  -> types de données collectées + raison
NSPrivacyAccessedAPITypes    -> Required Reason APIs + code de raison
```

Structure XML minimale :

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
 "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>NSPrivacyTracking</key>
    <false/>
    <key>NSPrivacyTrackingDomains</key>
    <array/>
    <key>NSPrivacyCollectedDataTypes</key>
    <array/>
    <key>NSPrivacyAccessedAPITypes</key>
    <array/>
</dict>
</plist>
```

Xcode : `File > New File > App Privacy File`. Xcode l'édite avec une UI à clés/valeurs, mais sache lire le XML : en entretien on te demande ce qu'il y a dedans.

---

## 2. Required Reason APIs — le piège qui fait rejeter

Apple a une liste d'APIs "communes" détournées pour fingerprinter l'utilisateur. Si tu les appelles (toi **ou un SDK**), tu dois déclarer un **code de raison** approuvé. Les plus fréquentes :

| API | Catégorie | Raison typique |
|---|---|---|
| `UserDefaults` | `NSPrivacyAccessedAPICategoryUserDefaults` | `CA92.1` (accès aux prefs de l'app uniquement) |
| File timestamp (`.creationDate`, `stat`) | `...FileTimestamp` | `C617.1` (afficher à l'utilisateur) |
| `systemUptime` / `mach_absolute_time` | `...SystemBootTime` | `35F9.1` (mesurer le temps écoulé) |
| Disk space libre | `...DiskSpace` | `E174.1` |
| `kSecAttrAccessGroup` etc. (Keychain bas niveau exotique) | — | selon usage |

Exemple : app qui utilise `UserDefaults`.

```xml
<key>NSPrivacyAccessedAPITypes</key>
<array>
    <dict>
        <key>NSPrivacyAccessedAPIType</key>
        <string>NSPrivacyAccessedAPICategoryUserDefaults</string>
        <key>NSPrivacyAccessedAPITypeReasons</key>
        <array>
            <string>CA92.1</string>
        </array>
    </dict>
</array>
```

> **Réflexe** : `@AppStorage` en SwiftUI = `UserDefaults` sous le capot. Si tu l'utilises (et tout le monde l'utilise), tu **dois** déclarer `CA92.1`. Beaucoup de premiers rejets viennent de là.

---

## 3. Types de données collectées

Tu déclares chaque type que l'app **envoie hors de l'appareil** (réseau). Email, position, photos, identifiants, etc. Pour chacun : est-ce lié à l'identité (`Linked`), sert-il au tracking, et pourquoi.

Exemple : email collecté pour le fonctionnement de l'app (auth), lié à l'utilisateur, pas de tracking.

```xml
<key>NSPrivacyCollectedDataTypes</key>
<array>
    <dict>
        <key>NSPrivacyCollectedDataType</key>
        <string>NSPrivacyCollectedDataTypeEmailAddress</string>
        <key>NSPrivacyCollectedDataTypeLinked</key>
        <true/>
        <key>NSPrivacyCollectedDataTypeTracking</key>
        <false/>
        <key>NSPrivacyCollectedDataTypePurposes</key>
        <array>
            <string>NSPrivacyCollectedDataTypePurposeAppFunctionality</string>
        </array>
    </dict>
</array>
```

Une photo que l'utilisateur choisit et que tu **gardes en local sans l'uploader** n'est pas "collectée". Le critère = sortie de l'appareil.

---

## 4. Nutrition labels App Store Connect (complémentaire)

Le manifest est dans le binaire ; les **"App Privacy" nutrition labels** sont une déclaration manuelle dans App Store Connect (onglet App Privacy), affichée sur la fiche App Store. Les deux doivent être **cohérents** : si le manifest dit "email collecté" mais la fiche dit "aucune donnée collectée", attends-toi à un rejet ou une remarque. À partir des manifests (app + SDKs), Xcode peut générer un **Privacy Report** (`Product > Archive > ... > Generate Privacy Report`) qui agrège tout — utilise-le pour remplir les labels sans rien oublier.

```text
PrivacyInfo.xcprivacy  -> dans le binaire, technique, lu par Apple à la review
App Privacy labels     -> ASC, marketing, vu par l'utilisateur avant download
```

---

## 5. ATT / IDFA — quand c'est requis

`AppTrackingTransparency` (ATT) n'est obligatoire que si tu fais du **tracking au sens Apple** : croiser les données de l'utilisateur avec celles d'autres apps/sites (pubs ciblées, IDFA, data brokers). Tu dois alors appeler `requestTrackingAuthorization` **avant** de tracker, et l'IDFA est nul tant que l'utilisateur n'a pas dit oui.

```swift
import AppTrackingTransparency
import AdSupport

let status = await ATTrackingManager.requestTrackingAuthorization()
if status == .authorized {
    let idfa = ASIdentifierManager.shared().advertisingIdentifier // sinon: tout zéro
}
```

Requiert la clé `NSUserTrackingUsageDescription` dans Info.plist. Si tu ne fais **pas** de tracking (analytics first-party type Firebase pour TON app), tu n'as **pas** besoin d'ATT — et tu mets `NSPrivacyTracking = false`. Erreur classique : afficher la pop-up ATT "pour faire bien" alors qu'on ne tracke pas → mauvaise UX et incohérence avec le manifest.

---

## 6. Durcir le Keychain

Le Keychain stocke les secrets (tokens, refresh token). Deux réglages que les recruteurs attendent :

**Accessibilité.** Le défaut historique (`kSecAttrAccessibleWhenUnlocked`) autorise la **sauvegarde iCloud/iTunes** : le secret peut migrer sur un autre appareil. Pour un token, c'est non.

```swift
// pas idéal : migre dans les backups, accessible hors de cet appareil
kSecAttrAccessible: kSecAttrAccessibleWhenUnlocked

// préférable pour un secret : jamais sauvegardé, lié à CET appareil
kSecAttrAccessible: kSecAttrAccessibleWhenUnlockedThisDeviceOnly
```

`...ThisDeviceOnly` = exclu des backups, non synchronisé. Pour un secret d'auth, c'est ce que tu veux.

**Protection par biométrie** via `SecAccessControl` (Face ID / Touch ID exigés pour **lire** l'item) :

```swift
import LocalAuthentication

var error: Unmanaged<CFError>?
let access = SecAccessControlCreateWithFlags(
    nil,
    kSecAttrAccessibleWhenUnlockedThisDeviceOnly,
    .biometryCurrentSet,          // invalidé si l'empreinte/visage change
    &error
)!

let query: [String: Any] = [
    kSecClass as String: kSecClassGenericPassword,
    kSecAttrAccount as String: "refreshToken",
    kSecValueData as String: tokenData,
    kSecAttrAccessControl as String: access   // remplace kSecAttrAccessible
]
SecItemAdd(query as CFDictionary, nil)
```

Au prochain `SecItemCopyMatching`, iOS déclenche Face ID automatiquement (tu peux passer un `kSecUseAuthenticationContext: LAContext()` **à la lecture** pour personnaliser le prompt ou réutiliser une auth récente). `.biometryCurrentSet` invalide l'item si la biométrie enregistrée change (sécurité anti-ajout d'empreinte).

> **Ne synchronise jamais un secret en iCloud Keychain** : ne mets pas `kSecAttrSynchronizable = true` sur un token. Réserve la synchro à des prefs non sensibles, jamais aux credentials.

---

## 7. RGPD côté app (le minimum)

Tu n'es pas juriste, mais on attend de toi 3 réflexes concrets :

- **Consentement** : pas de pop-up consentement avant la première donnée non essentielle (analytics, pub). Le strictement fonctionnel (login que l'utilisateur demande) n'a pas besoin de consentement séparé.
- **Minimisation** : ne collecte/transmets que le nécessaire. Pas de "on log tout au cas où". Chaque champ envoyé au backend doit avoir une raison.
- **Droits utilisateur** : accès, rectification, **effacement** ("droit à l'oubli"), portabilité. En pratique, expose au moins l'export et la suppression depuis l'app ou un lien clair.

Stocke le consentement avec horodatage (pour prouver le quand/quoi), versionné si ta politique change.

```swift
@AppStorage("analyticsConsent") var analyticsConsent = false
@AppStorage("consentDate") var consentDate = ""
```

---

## 8. Suppression de compte conforme (App Store 5.1.1(v))

**Règle Apple, pas juste RGPD** : si ton app permet de **créer** un compte, elle doit permettre de le **supprimer depuis l'app** (pas un simple "envoyez-nous un email"). Rejet garanti sinon. Flux attendu :

1. **Réauthentification** (l'action est sensible → re-login récent requis, surtout Firebase qui exige un credential frais).
2. **Suppression en cascade** : données backend (Firestore/SQL) **puis** le compte Auth.
3. **Confirmation** explicite avant, et nettoyage local (Keychain, caches) après.

```swift
func deleteAccount() async throws {
    guard let user = Auth.auth().currentUser else { return }

    // 1. Réauth (sinon Firebase lève .requiresRecentLogin)
    let cred = EmailAuthProvider.credential(withEmail: email, password: password)
    try await user.reauthenticate(with: cred)

    // 2. Cascade : données métier d'abord, compte Auth ensuite
    try await Firestore.firestore().collection("users").document(user.uid).delete()
    try await user.delete()

    // 3. Nettoyage local
    KeychainStore.deleteAll()
    UserDefaults.standard.removeObject(forKey: "session")
}
```

Côté UI : bouton clair dans les réglages, `alert` de confirmation ("Cette action est irréversible"), puis retour à l'écran de login. Pense aussi à supprimer les fichiers utilisateur (Storage, photos uploadées).

---

## Points à connaître

- **`@AppStorage` = `UserDefaults`** : oublier `CA92.1` dans le manifest est la cause n°1 de rejet sur ce sujet. Tu y as droit, mais tu dois le déclarer.
- **Les SDKs tiers** doivent fournir **leur** manifest (et certains une signature). Un vieux SDK non à jour peut bloquer ta soumission — vérifie tes dépendances.
- **Manifest ≠ labels App Store Connect** : deux déclarations distinctes qui doivent rester cohérentes ; une incohérence se voit à la review.
- **Suppression de compte** : "contactez le support" ne suffit pas si le compte est créable dans l'app. Et n'oublie pas la **réauth** : `user.delete()` seul échoue souvent avec `requiresRecentLogin`.

---

## Exercice (10-20 min)

Rédige le `PrivacyInfo.xcprivacy` **complet et minimal** d'une app qui :
- utilise `UserDefaults` (via `@AppStorage`),
- fait des appels **réseau** envoyant l'**email** de l'utilisateur à son backend (pour l'auth),
- laisse l'utilisateur **choisir une photo** qu'elle **uploade** sur le serveur,
- ne fait **aucun tracking**.

Attendu : `NSPrivacyTracking = false`, `UserDefaults` déclaré avec `CA92.1`, et deux types collectés (email + photos/`NSPrivacyCollectedDataTypePhotosorVideos`) liés à l'utilisateur, sans tracking, en `...PurposeAppFunctionality`. Écris le XML complet et vérifie qu'il parse :

```bash
plutil -lint PrivacyInfo.xcprivacy
```

Bonus : ajoute la pierre angulaire d'un écran "Supprimer mon compte" (signature de fonction + l'`alert` de confirmation).

---

## Question d'entretien

**Q : C'est quoi le Privacy Manifest et pourquoi c'est bloquant ?**
R : C'est `PrivacyInfo.xcprivacy`, un fichier embarqué dans le binaire qui déclare le tracking, les domaines de tracking, les types de données collectées et l'usage des **Required Reason APIs** (UserDefaults, file timestamps, etc.). Depuis 2024, Apple le rend obligatoire : sans déclaration correcte des Required Reason APIs — ou si un SDK tiers ne fournit pas le sien — la soumission est **rejetée automatiquement** à l'upload. C'est bloquant parce que c'est vérifié à la review, pas optionnel.

**Q : Quelle différence avec les "App Privacy labels" d'App Store Connect ?**
R : Le manifest est technique, dans le binaire, lu par Apple. Les labels sont une déclaration manuelle dans ASC, affichée sur la fiche App Store pour l'utilisateur. Complémentaires, et ils doivent être cohérents entre eux. Xcode peut générer un Privacy Report agrégeant les manifests (app + SDKs) pour remplir les labels.

**Q : Comment sécuriserais-tu un refresh token dans le Keychain ?**
R : `kSecAttrAccessibleWhenUnlockedThisDeviceOnly` pour l'exclure des backups et le lier à l'appareil, jamais `synchronizable = true`, et idéalement un `SecAccessControl` avec `.biometryCurrentSet` pour exiger Face ID à la lecture. Le défaut `WhenUnlocked` migre dans les backups iCloud — à éviter pour un secret.

---

## Résumé

- `PrivacyInfo.xcprivacy` est **obligatoire** depuis 2024 : tracking, domaines, données collectées, Required Reason APIs. Manque = **rejet**.
- `@AppStorage`/`UserDefaults` → déclare la raison `CA92.1`, sinon rejet.
- Manifest (binaire) **et** nutrition labels (App Store Connect) : deux choses, à garder cohérentes.
- ATT/IDFA seulement si **vrai tracking** cross-app ; sinon `NSPrivacyTracking = false`, pas de pop-up.
- Keychain durci : `...ThisDeviceOnly`, jamais `synchronizable`, biométrie via `SecAccessControl`.
- RGPD app : consentement horodaté, minimisation, droit à l'effacement.
- Suppression de compte **dans l'app** (règle 5.1.1(v)) : réauth → cascade backend + Auth → confirmation + nettoyage local.
