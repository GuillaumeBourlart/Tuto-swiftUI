# Fiche 09.06 — FileManager et cache d'images

## Objectif
Maîtriser le stockage fichier sur iOS (Documents vs Caches vs tmp), lire/écrire du Codable en JSON sur disque, et construire un cache d'images à deux niveaux (mémoire NSCache + disque) parce qu'`AsyncImage` ne suffit pas dès qu'on veut persister. Savoir aussi *quand* utiliser FileManager plutôt que UserDefaults / Keychain / SwiftData.

## 1. Les trois dossiers du sandbox

Chaque app a un sandbox. Trois dossiers comptent au quotidien :

| Dossier | Sauvegardé (iCloud/iTunes) | Purgeable par iOS | Usage |
|---|---|---|---|
| **Documents** | Oui | Non | Données utilisateur irremplaçables (fichiers créés par l'user, exports) |
| **Caches** | Non | **Oui** (sous pression disque) | Données reconstructibles : images téléchargées, réponses réseau |
| **tmp** | Non | Oui (à tout moment) | Fichiers jetables, le temps d'une opération |

```swift
let fm = FileManager.default

// API canonique (retourne un tableau, on prend .first)
let documents = fm.urls(for: .documentDirectory, in: .userDomainMask).first!
let caches    = fm.urls(for: .cachesDirectory,   in: .userDomainMask).first!
let tmp       = fm.temporaryDirectory   // propriété directe, pas d'enum
```

Réflexe UIKit : c'est exactement le même `FileManager` qu'en UIKit, aucune nouveauté SwiftUI ici. Ce qui change, c'est *où* tu déclenches l'I/O (dans un `actor` / `Task`, pas sur le main).

Règle App Store : tout ce qui est dans Documents est sauvegardé sur iCloud. Si tu y mets 200 Mo d'images téléchargeables, Apple peut **rejeter l'app**. Les caches vont dans Caches.

## 2. Écrire et lire un Codable en JSON sur disque

```swift
struct Note: Codable, Identifiable {
    let id: UUID
    var title: String
    var body: String
}

enum DiskStore {
    static let dir = FileManager.default
        .urls(for: .documentDirectory, in: .userDomainMask).first!

    static func save<T: Encodable>(_ value: T, to filename: String) throws {
        let url = dir.appendingPathComponent(filename)
        let data = try JSONEncoder().encode(value)
        try data.write(to: url, options: [.atomic])   // .atomic = écriture sûre
    }

    static func load<T: Decodable>(_ type: T.Type, from filename: String) throws -> T {
        let url = dir.appendingPathComponent(filename)
        let data = try Data(contentsOf: url)
        return try JSONDecoder().decode(T.self, from: data)
    }
}
```

`.atomic` écrit dans un fichier temporaire puis renomme : pas de fichier à moitié écrit si l'app crashe en plein milieu.

## 3. Sous-dossiers, suppression, taille d'un dossier

```swift
let fm = FileManager.default

// Créer un sous-dossier (withIntermediateDirectories crée toute l'arborescence)
let imagesDir = caches.appendingPathComponent("images", isDirectory: true)
try fm.createDirectory(at: imagesDir, withIntermediateDirectories: true)

// Existe ? (préfère try? Data(contentsOf:) au lieu de fileExists puis read = TOCTOU)
let exists = fm.fileExists(atPath: imagesDir.path)

// Supprimer
try? fm.removeItem(at: imagesDir)

// Taille d'un dossier (somme des tailles de fichiers)
func directorySize(_ url: URL) -> Int {
    let keys: [URLResourceKey] = [.totalFileAllocatedSizeKey, .isRegularFileKey]
    guard let e = FileManager.default.enumerator(at: url,
                                                 includingPropertiesForKeys: keys) else { return 0 }
    return e.reduce(0) { total, item in
        guard let fileURL = item as? URL,
              let v = try? fileURL.resourceValues(forKeys: Set(keys)),
              v.isRegularFile == true else { return total }
        return total + (v.totalFileAllocatedSize ?? 0)
    }
}
```

`totalFileAllocatedSize` = place réellement occupée sur disque (alignée sur les blocs), plus juste que `fileSize`.

## 4. Protection des données (en bref)

iOS chiffre les fichiers via la Data Protection. Tu choisis *quand* ils sont déchiffrés :

```swift
try data.write(to: url, options: [.atomic, .completeFileProtection])
// ou après coup :
try (url as NSURL).setResourceValue(URLFileProtection.complete,
                                    forKey: .fileProtectionKey)
```

- `.complete` : fichier illisible quand l'appareil est verrouillé.
- `.completeUnlessOpen` : lisible si déjà ouvert avant le verrouillage (téléchargements en tâche de fond).
- `.completeUntilFirstUserAuthentication` (**défaut**) : lisible après le premier déverrouillage post-boot.
- `.none` : pas de protection.

Mets `.complete` sur les fichiers sensibles (données santé, tokens). Mais ne mets **jamais** un secret pur dans un fichier : ça va dans le Keychain (fiche 09.xx).

## 5. Pourquoi AsyncImage ne suffit pas

```swift
AsyncImage(url: url) { phase in
    switch phase {
    case .success(let image): image.resizable()
    case .failure: Image(systemName: "photo")
    default: ProgressView()
    }
}
```

Limites concrètes d'`AsyncImage` :
- Cache mémoire **non garanti** : un re-render / un scroll qui recycle la cellule peut re-télécharger.
- Pas de cache disque persistant entre lancements.
- Pas de downsampling : une image 4000×3000 occupe ~48 Mo en RAM même affichée en 80 pt.
- Pas de contrôle sur les priorités / annulation fine.

Réflexe UIKit : pas idéal d'utiliser AsyncImage pour une liste qui scrolle vite. Préférable : un `ImageCache` maison (section 7), exactement comme tu cachais des `UIImage` dans une `NSCache` côté UIKit.

## 6. Downsampling avant de cacher (rappel perf)

Ne stocke jamais l'image pleine résolution en RAM. Downsample avec ImageIO (cf. fiche perf images) :

```swift
import ImageIO
import UIKit

func downsample(_ data: Data, to pointSize: CGSize, scale: CGFloat) -> UIImage? {
    let opts = [kCGImageSourceShouldCache: false] as CFDictionary
    guard let src = CGImageSourceCreateWithData(data as CFData, opts) else { return nil }
    let maxPixels = max(pointSize.width, pointSize.height) * scale
    let down: [CFString: Any] = [
        kCGImageSourceCreateThumbnailFromImageAlways: true,
        kCGImageSourceShouldCacheImmediately: true,
        kCGImageSourceCreateThumbnailWithTransform: true,
        kCGImageSourceThumbnailMaxPixelSize: maxPixels
    ]
    guard let cg = CGImageSourceCreateThumbnailAtIndex(src, 0, down as CFDictionary)
    else { return nil }
    return UIImage(cgImage: cg)
}
```

Tu caches le `Data` brut sur disque (pour pouvoir re-downsampler à une autre taille) et l'`UIImage` downsamplée en mémoire.

## 7. Un ImageCache mémoire + disque (stratégie mémoire → disque → réseau)

```swift
import UIKit
import CryptoKit

actor ImageCache {
    static let shared = ImageCache()

    // Niveau 1 : mémoire. NSCache purge tout seul sous pression RAM, et est thread-safe.
    private let memory = NSCache<NSURL, UIImage>()

    // Niveau 2 : disque, dans Caches (purgeable par iOS, normal pour des images réseau)
    private let diskDir: URL
    private let fm = FileManager.default

    // Échelle écran capturée une fois (UIScreen.main est @MainActor ; on évite de
    // le toucher à chaque appel depuis l'actor). 3 = pire cas Retina, suffisant pour un cache.
    private let scale: CGFloat = 3

    init() {
        let caches = fm.urls(for: .cachesDirectory, in: .userDomainMask).first!
        diskDir = caches.appendingPathComponent("ImageCache", isDirectory: true)
        try? fm.createDirectory(at: diskDir, withIntermediateDirectories: true)
        memory.countLimit = 200            // garde-fou
        memory.totalCostLimit = 50_000_000 // ~50 Mo
    }

    func image(for url: URL, targetSize: CGSize = CGSize(width: 200, height: 200)) async -> UIImage? {
        // 1. Mémoire
        if let cached = memory.object(forKey: url as NSURL) { return cached }

        // 2. Disque
        let fileURL = diskURL(for: url)
        if let data = try? Data(contentsOf: fileURL),
           let image = downsample(data, to: targetSize, scale: scale) {
            store(image, data: nil, for: url)   // remonte en mémoire seulement
            return image
        }

        // 3. Réseau
        guard let (data, _) = try? await URLSession.shared.data(from: url),
              let image = downsample(data, to: targetSize, scale: scale)
        else { return nil }
        store(image, data: data, for: url)      // mémoire + disque
        return image
    }

    private func store(_ image: UIImage, data: Data?, for url: URL) {
        let cost = image.cgImage.map { $0.bytesPerRow * $0.height } ?? 0
        memory.setObject(image, forKey: url as NSURL, cost: cost)
        if let data { try? data.write(to: diskURL(for: url), options: [.atomic]) }
    }

    private func diskURL(for url: URL) -> URL {
        // Hash SHA256 STABLE entre lancements (hashValue ne l'est pas !).
        // Évite aussi les / et caractères interdits dans un nom de fichier.
        let digest = SHA256.hash(data: Data(url.absoluteString.utf8))
        let name = digest.map { String(format: "%02x", $0) }.joined()
        return diskDir.appendingPathComponent(name)
    }

    func clearDisk() {
        try? fm.removeItem(at: diskDir)
        try? fm.createDirectory(at: diskDir, withIntermediateDirectories: true)
    }
}
```

Vue d'appel :

```swift
struct CachedImage: View {
    let url: URL
    @State private var image: UIImage?

    var body: some View {
        Group {
            if let image { Image(uiImage: image).resizable().scaledToFill() }
            else { Color.gray.opacity(0.2) }
        }
        .task(id: url) {   // task(id:) ré-exécute si l'URL change → réutilisable en liste
            image = await ImageCache.shared.image(for: url)
        }
    }
}
```

Alternative "zéro code" : `URLCache.shared` (configuré avec un `memoryCapacity` / `diskCapacity`) cache automatiquement les réponses HTTP cacheables — utile si le serveur envoie les bons headers `Cache-Control`. Mais tu n'as alors **pas** de downsampling ni de contrôle sur les `UIImage`, d'où le cache maison ci-dessus pour une liste qui scrolle.

## 8. FileManager vs UserDefaults vs Keychain vs SwiftData (arbre de décision)

```
C'est un secret (token, mot de passe, clé) ?
  └─ OUI → Keychain (chiffré, hors backup contrôlable). JAMAIS UserDefaults/fichier.

Petite préférence / réglage simple (Bool, String, Int) ?
  └─ OUI → UserDefaults / @AppStorage.

Données structurées requêtables, relations, beaucoup d'entités, tri/filtre ?
  └─ OUI → SwiftData (ou Core Data legacy).

Un blob : fichier user, gros JSON, image, PDF, export ?
  └─ OUI → FileManager.
        ├─ irremplaçable (créé par l'user) → Documents
        └─ reconstructible (téléchargé) → Caches
```

Erreur classique : stocker un tableau de 5000 objets en JSON via FileManager alors qu'on filtre/trie dessus → c'est le job de SwiftData. À l'inverse, mettre une image de 3 Mo dans UserDefaults : interdit (UserDefaults charge tout en RAM au lancement).

## Points à connaître
- **Documents est sauvegardé sur iCloud** : y stocker des données reconstructibles peut faire rejeter l'app. Caches pour tout ce qui se re-télécharge.
- **Caches est purgeable** : iOS peut le vider quand l'espace manque. Ton code doit gérer le "fichier disparu" → re-fetch réseau, jamais un crash.
- **I/O sur le main thread = freeze**. Mets l'I/O dans un `actor` / `Task`. `Data(contentsOf:)` est synchrone et bloquant.
- **Ne réinvente pas le Keychain avec un fichier `.complete`** : un secret va dans le Keychain, point.
- **`hashValue` n'est PAS stable entre lancements** : pour nommer un fichier de cache disque persistant, utilise un hash déterministe (SHA256 via CryptoKit, comme en section 7). Sinon, après relance, tu ne retrouves jamais ton fichier sur disque.

## Exercice (15 min)
Écris un `ImageCache` (actor) avec uniquement les niveaux **mémoire + disque** (sans réseau, on te fournit le `Data`) :
1. `func store(_ data: Data, for key: String)` : écrit le `Data` dans un sous-dossier `Caches/imgs/` et garde l'`UIImage` downsamplée à 100×100 en `NSCache`.
2. `func image(for key: String) -> UIImage?` : mémoire d'abord, sinon disque (re-downsample + remonte en mémoire), sinon `nil`.
3. `func diskUsage() -> Int` : taille totale du dossier disque (réutilise `directorySize` de la section 3).
4. Bonus : la `key` peut contenir des `/` (c'est une URL) — dérive le nom de fichier via un hash SHA256 (`import CryptoKit`) stable entre lancements, comme en section 7.

Vérifie que relancer l'app (mémoire vidée) retrouve bien l'image depuis le disque.

## Question d'entretien

**Q : Tu télécharges une image (ou un PDF) depuis le réseau. Tu la stockes dans Documents ou dans Caches ?**
R : Dans **Caches**. C'est une donnée *reconstructible* : on peut la re-télécharger. Documents est sauvegardé sur iCloud et destiné aux données irremplaçables créées par l'utilisateur — y mettre des téléchargements gonfle les backups inutilement et peut faire rejeter l'app à la review. Contrepartie : Caches étant purgeable par iOS, le code doit gérer l'absence du fichier en re-fetchant.

**Q : Pourquoi ne pas juste utiliser AsyncImage partout ?**
R : Il n'offre pas de cache disque persistant entre lancements, son cache mémoire n'est pas garanti (re-download au scroll), et il ne downsample pas — une grosse image occupe sa taille pleine en RAM. Pour une liste qui scrolle, un cache mémoire (NSCache) + disque (Caches) avec downsampling est nettement plus performant.

## Résumé
- **Documents** (iCloud, irremplaçable) vs **Caches** (purgeable, reconstructible) vs **tmp** (jetable). `urls(for:in:)` / `temporaryDirectory`.
- Codable → `JSONEncoder` → `Data` → `write(to:options:[.atomic])` ; relire avec `Data(contentsOf:)` + `JSONDecoder`.
- Sous-dossiers : `createDirectory(withIntermediateDirectories: true)` ; taille via `enumerator` + `totalFileAllocatedSize`.
- `FileProtectionType.complete` pour les fichiers sensibles ; les secrets purs vont au Keychain.
- AsyncImage insuffisant en liste → `ImageCache` : **mémoire (NSCache) → disque (Caches) → réseau**, avec **downsampling** (ImageIO) avant de cacher.
- Décision : secret → Keychain ; réglage simple → UserDefaults ; données requêtables → SwiftData ; blob/fichier → FileManager (Documents ou Caches selon réversibilité).
