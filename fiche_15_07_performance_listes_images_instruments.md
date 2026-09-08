# Fiche 15.07 — Listes et images performantes + Instruments

## Objectif

Faire scroller une liste à 120 fps même avec des images réseau. En UIKit tu optimisais `cellForRowAt`, le `prepareForReuse` et le décodage hors main thread à la main ; ici les cellules sont des `View` que SwiftUI recompose, mais les mêmes lois physiques s'appliquent : cellule légère, identité stable, et **jamais** décoder une image 4000px dans une vignette 80px. On finit par diagnostiquer un lag réel avec Instruments.

---

## 1. Pont UIKit : le lag au scroll, mêmes causes

En UIKit, une `UITableView` qui rame venait presque toujours de trois choses : du travail lourd dans `cellForRowAt`, un layout coûteux par cellule, et le décodage d'images sur le main thread. La réutilisation de cellules (`dequeueReusableCell`) cachait une partie du coût.

En SwiftUI, `List` et `LazyVStack` recyclent aussi (lazy = seules les cellules visibles existent), mais **toi** tu n'écris plus `cellForRowAt` : tu écris une `View` que SwiftUI recompose. Le piège : c'est facile d'y mettre du travail lourd sans s'en rendre compte (un `DateFormatter` créé à chaque `body`, un tri, un décodage d'image synchrone).

Règle : **la cellule doit être une fonction quasi-instantanée de données déjà prêtes.** Tout calcul lourd se fait en amont (ViewModel), pas dans `body`.

---

## 2. Cellules légères : identité stable, pas d'`AnyView`

```swift
struct Photo: Identifiable, Hashable {
    let id: UUID
    let title: String
    let url: URL
}

struct PhotoList: View {
    let photos: [Photo]

    var body: some View {
        List(photos) { photo in   // id stable via Identifiable
            PhotoRow(photo: photo)
        }
    }
}
```

Trois réflexes qui changent tout :

- **Identité stable.** `id` doit être une vraie clé métier (UUID serveur), pas l'index du tableau. Avec un mauvais `id`, SwiftUI recrée des cellules au lieu de les recycler → scroll qui saccade et images qui re-clignotent. C'est l'équivalent d'un `prepareForReuse` cassé.
- **Pas d'`AnyView` dans une cellule.** `AnyView` efface le type : SwiftUI ne peut plus differ finement et recrée la sous-arborescence. Préfère `@ViewBuilder`, un `if`/`switch` typé, ou un `enum` de contenu.
- **Pas de travail dans la cellule.** Formatage de date, calcul, tri, filtrage : tout ça doit être pré-calculé.

```swift
// ❌ Pas idéal : nouveau formatter + AnyView à chaque body
struct PhotoRow: View {
    let photo: Photo
    var body: AnyView {
        let formatter = DateFormatter()          // alloué à chaque recompose
        return AnyView(Text(photo.title))        // efface le type
    }
}

// ✅ Préférable : type concret, données prêtes
struct PhotoRow: View {
    let photo: Photo
    var body: some View {
        HStack {
            Text(photo.title)
            Spacer()
        }
    }
}
```

Pour la pagination (charger la suite quand on approche du bas), voir la fiche 07.09 — c'est le complément direct : on ne charge jamais 10 000 lignes d'un coup.

---

## 3. Le piège `AsyncImage`

`AsyncImage` est pratique pour un prototype, mais en production il a deux limites qui tuent une liste :

- **Pas de cache disque fiable.** Il s'appuie sur l'`URLCache` partagé, mais le comportement est opaque et souvent il **re-télécharge** quand la cellule revient à l'écran. Au scroll, tu vois les images re-clignoter.
- **Pas de downsampling.** Il décode l'image à sa taille native. Une photo 4000×3000 décodée pour une vignette 80×80, c'est ~48 Mo en mémoire (4000×3000×4 octets) et un décodage coûteux sur un thread interne → hitch au scroll.

```swift
// OK pour une preview ou une image unique, pas pour une liste qui scrolle
AsyncImage(url: photo.url) { image in
    image.resizable().scaledToFill()
} placeholder: {
    ProgressView()
}
.frame(width: 80, height: 80)
.clipped()
```

Pour une vraie liste, on prend le contrôle : downsampling + cache (sections suivantes), ou une lib éprouvée (section 7).

---

## 4. Downsampling : décoder à la bonne taille

Le réflexe clé de la perf image : **ne jamais décoder plus de pixels que l'écran n'en affiche.** `CGImageSource` permet de générer une vignette déjà décodée à la taille cible, sans jamais matérialiser l'image pleine en mémoire.

```swift
import ImageIO
import UIKit

func downsample(imageData: Data, to pointSize: CGSize, scale: CGFloat) -> UIImage? {
    let sourceOptions = [kCGImageSourceShouldCache: false] as CFDictionary
    guard let source = CGImageSourceCreateWithData(imageData as CFData, sourceOptions) else {
        return nil
    }

    let maxPixel = max(pointSize.width, pointSize.height) * scale
    let options = [
        kCGImageSourceCreateThumbnailFromImageAlways: true,
        kCGImageSourceShouldCacheImmediately: true,        // décode tout de suite, hors main
        kCGImageSourceCreateThumbnailWithTransform: true,  // respecte l'orientation EXIF
        kCGImageSourceThumbnailMaxPixelSize: maxPixel      // ← la clé : taille max en pixels
    ] as CFDictionary

    guard let cgImage = CGImageSourceCreateThumbnailAtIndex(source, 0, options) else {
        return nil
    }
    return UIImage(cgImage: cgImage)
}
```

Point critique : **appelle ça hors du main thread.** Dans une fonction `async`, fais-le dans un contexte détaché du `MainActor` :

```swift
func loadThumbnail(url: URL, size: CGSize) async throws -> UIImage {
    let (data, _) = try await URLSession.shared.data(from: url)
    let scale = await UIScreen.main.scale
    // calcul CPU lourd : hors MainActor
    let image = await Task.detached(priority: .userInitiated) {
        downsample(imageData: data, to: size, scale: scale)
    }.value
    guard let image else { throw ImageError.decodingFailed }
    return image
}
```

En UIKit tu faisais exactement ça (`UIGraphicsImageRenderer` ou `CGImageSource` dans une `DispatchQueue.global`). Le principe est identique, seul l'emballage `async/await` change.

---

## 5. Cache mémoire (`NSCache`) + cache disque (`URLCache`)

Télécharger + downsampler à chaque apparition, c'est gâché. Deux niveaux de cache :

- **Mémoire** : `NSCache` stocke les `UIImage` déjà décodées et downsamplées. Il se purge tout seul sous pression mémoire (avantage sur un `Dictionary`).
- **Disque** : `URLCache` évite de re-télécharger les octets bruts. À configurer une fois au lancement.

```swift
import UIKit

actor ThumbnailLoader {
    static let shared = ThumbnailLoader()

    private let memory = NSCache<NSURL, UIImage>()
    private let session: URLSession

    init() {
        // cache disque pour les octets bruts (re-téléchargement évité)
        let cache = URLCache(memoryCapacity: 20_000_000,
                             diskCapacity: 200_000_000)
        let config = URLSessionConfiguration.default
        config.urlCache = cache
        config.requestCachePolicy = .returnCacheDataElseLoad
        session = URLSession(configuration: config)
    }

    func thumbnail(for url: URL, size: CGSize) async throws -> UIImage {
        if let cached = memory.object(forKey: url as NSURL) {
            return cached            // hit mémoire : instantané
        }
        let (data, _) = try await session.data(from: url)
        let scale = await UIScreen.main.scale
        let image = await Task.detached(priority: .userInitiated) {
            downsample(imageData: data, to: size, scale: scale)
        }.value
        guard let image else { throw ImageError.decodingFailed }
        memory.setObject(image, forKey: url as NSURL)
        return image
    }
}

enum ImageError: Error { case decodingFailed }
```

La vue de cellule consomme ça via `.task` (annulé automatiquement si la cellule disparaît avant la fin) :

```swift
struct ThumbnailView: View {
    let url: URL
    @State private var image: UIImage?

    var body: some View {
        Group {
            if let image {
                Image(uiImage: image).resizable().scaledToFill()
            } else {
                Color.gray.opacity(0.15)
            }
        }
        .frame(width: 80, height: 80)
        .clipped()
        .task(id: url) {   // relancé si l'url change (cellule recyclée)
            image = try? await ThumbnailLoader.shared.thumbnail(
                for: url, size: CGSize(width: 80, height: 80)
            )
        }
    }
}
```

`.task(id: url)` est le détail qui sauve la réutilisation : quand SwiftUI recycle la cellule pour une autre photo, l'`id` change, l'ancienne tâche est annulée et une nouvelle démarre. C'est le `prepareForReuse` de SwiftUI.

---

## 6. Libs : Kingfisher / Nuke (quand les utiliser)

Tout ce qui précède (téléchargement, downsampling, cache 2 niveaux, annulation, dédup des requêtes), des libs le font déjà, testé en prod et optimisé :

- **Nuke** : très performant, modulaire, downsampling et prefetch intégrés. API SwiftUI via `LazyImage`.
- **Kingfisher** : le plus répandu, `KFImage` en SwiftUI, simple à brancher.

```swift
import NukeUI

LazyImage(url: photo.url) { state in
    if let image = state.image {
        image.resizable().scaledToFill()
    } else {
        Color.gray.opacity(0.15)
    }
}
.frame(width: 80, height: 80)
.clipped()
```

Quand les prendre : **dès qu'une app affiche sérieusement des images réseau** (feed, galerie, e-commerce). Coder son loader maison est un bon exercice de compréhension, mais en mission tu choisis une lib éprouvée. En entretien, savoir *pourquoi* `AsyncImage` ne suffit pas et ce que la lib résout (downsampling, cache, annulation, prefetch) vaut plus que de l'avoir intégrée.

---

## 7. Instruments en pratique

`print` ne mesure pas un hitch au scroll. Instruments oui. Lancement : **Xcode → Product → Profile (⌘I)**, choisir un template, profiler sur **device réel** (le simulateur ment sur le CPU et le GPU).

**Time Profiler** — où part le CPU.
- Échantillonne la stack à intervalle régulier.
- Active **Invert Call Tree** (les feuilles, donc le code qui s'exécute réellement, remontent en haut) et regarde la **Heaviest Stack Trace** dans le panneau de droite.
- Coche **Hide System Libraries** pour ne voir que ton code.
- Symptôme classique d'une liste qui lague : `CGImageSourceCreateImageAtIndex` / décodage qui apparaît sur le main thread → c'est ton downsampling manquant.

**SwiftUI** (template dédié, Xcode 15+) — combien de fois `body` est recalculé.
- Montre les **View body re-evaluations** et les **Core Animation commits**.
- Une cellule dont le `body` est rappelé en boucle pendant le scroll = identité instable ou dépendance trop large (voir fiche 15.06).

**Allocations & Leaks** — mémoire.
- **Allocations** : graphe mémoire qui grimpe sans redescendre au scroll = images non downsamplées ou cache sans limite.
- **Leaks** : retain cycles (closure qui capture `self` fort dans une `Task` longue). Complément du Memory Graph (fiche 15.02).

**Hangs / Hitches** — le ressenti utilisateur.
- Un **hang** = main thread bloqué > ~250 ms (l'UI gèle). Un **hitch** = une frame loupée au scroll (saccade).
- Le template **Animation Hitches** (ou les diagnostics du Organizer en prod) pointe les frames manquées. Cible : 0 frame perdue pendant un scroll.

---

## Points à connaître

- **`id` = index** dans un `ForEach` casse la réutilisation : cellules recréées, images qui re-clignotent, scroll qui saute. Utilise toujours une identité stable.
- **`AnyView` dans une cellule** désactive le diffing fin → recompositions complètes. Reste sur des types concrets / `@ViewBuilder`.
- **Décoder à la taille native** est l'erreur n°1 : une vignette 80px qui décode une image 4000px explose la mémoire et provoque des hitches. Downsample toujours.
- **`AsyncImage` re-télécharge** souvent au scroll (pas de cache disque fiable) : OK en prototype, à remplacer par un loader cache + downsampling ou une lib en prod.
- **Profile sur device réel** : le simulateur a le CPU du Mac et fausse Time Profiler.

---

## Exercice

Pars d'une `List` de ~200 `Photo` (URLs d'images haute résolution, ex. picsum.photos) affichées en vignettes 80×80 avec `AsyncImage` — elle lague et la mémoire grimpe. Remplace `AsyncImage` par un `ThumbnailView` branché sur un `ThumbnailLoader` (downsampling `CGImageSource` + `NSCache`). Profile avant/après avec **Time Profiler** (Invert Call Tree) et **Allocations**, et note la différence de mémoire et de frames perdues au scroll. Objectif : scroll fluide et mémoire qui se stabilise.

---

## Question d'entretien

**« Ta liste d'images lague au scroll. Comment tu diagnostiques et tu corriges ? »**

> Je profile sur device réel. **Time Profiler** avec Invert Call Tree me dit où part le CPU : si je vois du décodage d'image (`CGImageSource…`) sur le main thread, le problème est le décodage d'images pleine résolution dans des petites cellules. **Allocations** confirme : la mémoire grimpe sans redescendre. La correction : downsampling via `CGImageSource` + `kCGImageSourceThumbnailMaxPixelSize` pour décoder à la taille d'affichage, hors main thread, plus un cache mémoire `NSCache` et un cache disque `URLCache`. Je vérifie aussi l'identité des cellules (id stable, pas d'`AnyView`) et avec le template **SwiftUI** que les `body` ne sont pas recalculés en boucle. En prod réelle je pars souvent sur Nuke ou Kingfisher qui font tout ça.

**« Pourquoi `AsyncImage` ne suffit pas en production ? »**

> Pas de cache disque fiable (il re-télécharge souvent au scroll) et aucun downsampling : il décode l'image à sa taille native, donc une vignette peut décoder une image 4000px et saturer la mémoire. En prototype c'est très bien ; pour une liste qui scrolle, il faut un cache et du downsampling, maison ou via une lib.

**« C'est quoi la différence entre un hang et un hitch ? »**

> Un **hang**, c'est le main thread bloqué assez longtemps (~250 ms+) pour que l'UI gèle complètement. Un **hitch**, c'est une frame loupée pendant une animation ou un scroll — une micro-saccade. On chasse les hangs avec Time Profiler / le Organizer, et les hitches avec le template Animation Hitches.

---

## Résumé

- Cellule = fonction instantanée de données prêtes : pas de calcul, pas de formatter, pas d'`AnyView` dans `body`.
- Identité stable (`id` métier, pas l'index) sinon la réutilisation casse et le scroll saccade.
- `AsyncImage` : OK prototype, mais pas de cache disque fiable ni de downsampling → re-télécharge et sature la mémoire.
- Downsampling via `CGImageSource` + `kCGImageSourceThumbnailMaxPixelSize`, **hors main thread**, pour décoder à la taille d'affichage.
- Cache mémoire `NSCache` (images décodées) + cache disque `URLCache` (octets bruts) ; `.task(id:)` annule la requête quand la cellule est recyclée.
- En prod : Nuke ou Kingfisher font tout ça, testés et optimisés.
- Instruments : Time Profiler (Invert Call Tree, Heaviest Stack), SwiftUI (body re-evaluations), Allocations & Leaks, Hangs/Hitches — toujours sur device réel.
- Compléments : pagination (07.09), re-renders et granularité @Observable (15.06), Memory Graph (15.02), Time Profiler (15.03).
