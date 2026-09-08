# Fiche 07.11 — Réseau de production : upload multipart, offline et erreurs métier

## Objectif

Envoyer une photo au serveur en `multipart/form-data` avec `URLSession` pur, détecter la perte de réseau avec `NWPathMonitor`, et distinguer clairement les erreurs techniques (offline, timeout) des erreurs métier (422) pour afficher le bon message. Avec un retry/backoff propre qui ne retente jamais une 4xx.

---

## 1. Multipart : pourquoi et à quoi ça ressemble

Pour envoyer un fichier (image, PDF) **plus** des champs texte dans la même requête, le standard HTTP est `multipart/form-data`. C'est ce que fait un `<form enctype="multipart/form-data">` sur le web, et ce que ton backend attend généralement pour un upload de photo.

En UIKit/Objective-C tu utilisais souvent Alamofire (`AF.upload(multipartFormData:)`) pour ne pas écrire le corps à la main. Ici on le fait en `URLSession` pur : c'est 30 lignes, ça vaut le coup de savoir le faire pour un entretien.

Le corps est une suite de **parties** séparées par un **boundary** (une chaîne unique que tu choisis) :

```text
--Boundary-XXX
Content-Disposition: form-data; name="title"

Mon titre
--Boundary-XXX
Content-Disposition: form-data; name="file"; filename="photo.jpg"
Content-Type: image/jpeg

<octets binaires de l'image>
--Boundary-XXX--
```

Chaque ligne se termine par `\r\n` (CRLF), pas `\n`. Le dernier boundary a `--` à la fin.

---

## 2. Construire le corps multipart (Data)

On écrit un petit helper qui assemble le `Data`. On reste en bas niveau pour bien voir la structure.

```swift
import Foundation

struct MultipartForm {
    let boundary = "Boundary-\(UUID().uuidString)"
    private var body = Data()

    // Champ texte simple
    mutating func addField(name: String, value: String) {
        body.appendString("--\(boundary)\r\n")
        body.appendString("Content-Disposition: form-data; name=\"\(name)\"\r\n\r\n")
        body.appendString("\(value)\r\n")
    }

    // Fichier (image, etc.)
    mutating func addFile(name: String, filename: String, mimeType: String, data: Data) {
        body.appendString("--\(boundary)\r\n")
        body.appendString("Content-Disposition: form-data; name=\"\(name)\"; filename=\"\(filename)\"\r\n")
        body.appendString("Content-Type: \(mimeType)\r\n\r\n")
        body.append(data)
        body.appendString("\r\n")
    }

    // À appeler en dernier : ferme le multipart
    func finalizedBody() -> Data {
        var copy = body
        copy.appendString("--\(boundary)--\r\n")
        return copy
    }
}

private extension Data {
    mutating func appendString(_ string: String) {
        if let data = string.data(using: .utf8) { append(data) }
    }
}
```

Le header de la requête doit annoncer le boundary :

```swift
request.setValue(
    "multipart/form-data; boundary=\(form.boundary)",
    forHTTPHeaderField: "Content-Type"
)
```

Piège classique : le `boundary` du header DOIT être identique à celui utilisé dans le corps. C'est pour ça qu'on le stocke dans la struct.

---

## 3. Compresser l'image AVANT l'envoi

Une photo iPhone fait facilement 3-8 Mo en HEIC/PNG. Envoyer ça brut, c'est lent et ça coûte de la data à l'utilisateur. Deux leviers :

**JPEG avec compression** (simple, suffisant dans 90 % des cas) :

```swift
guard let jpeg = uiImage.jpegData(compressionQuality: 0.7) else { return }
// 0.7 = bon compromis qualité/poids. Évite 1.0 (énorme) et < 0.4 (artefacts visibles).
```

**Downsampling** si l'image est plus grande que ce dont le serveur a besoin (un avatar n'a pas besoin de 4000 px). On passe par ImageIO pour ne pas charger l'image entière en mémoire :

```swift
import ImageIO
import UniformTypeIdentifiers

func downsampledJPEG(from url: URL, maxPixelSize: Int, quality: CGFloat = 0.7) -> Data? {
    let srcOptions = [kCGImageSourceShouldCache: false] as CFDictionary
    guard let source = CGImageSourceCreateWithURL(url as CFURL, srcOptions) else { return nil }

    let options: [CFString: Any] = [
        kCGImageSourceCreateThumbnailFromImageAlways: true,
        kCGImageSourceShouldCacheImmediately: true,
        kCGImageSourceCreateThumbnailWithTransform: true, // respecte l'orientation EXIF
        kCGImageSourceThumbnailMaxPixelSize: maxPixelSize
    ]
    guard let cgImage = CGImageSourceCreateThumbnailAtIndex(source, 0, options as CFDictionary) else {
        return nil
    }

    let data = NSMutableData()
    guard let dest = CGImageDestinationCreateWithData(data, UTType.jpeg.identifier as CFString, 1, nil) else {
        return nil
    }
    CGImageDestinationAddImage(dest, cgImage, [kCGImageDestinationLossyCompressionQuality: quality] as CFDictionary)
    guard CGImageDestinationFinalize(dest) else { return nil }
    return data as Data
}
```

Règle de prod : **downsample puis JPEG**. Ne fais jamais `UIImage(data:)` juste pour ré-encoder une grosse image, tu exploses la RAM.

---

## 4. Envoyer avec URLSession.upload(for:from:)

`upload(for:from:)` est la méthode async dédiée à l'envoi d'un `Data` en corps. Préférable à `data(for:)` avec `httpBody` rempli : `upload` est conçu pour les gros corps et reste streamable en arrière-plan.

On regroupe l'upload dans un type `PhotoUploader` qui porte le token. La réponse du serveur est décodée dans un `PhotoResponse` (à adapter à TON backend) :

```swift
struct PhotoResponse: Decodable {
    let id: String
    let url: URL
}

struct PhotoUploader {
    let token: String

    func uploadPhoto(_ imageData: Data, title: String) async throws -> PhotoResponse {
        var form = MultipartForm()
        form.addField(name: "title", value: title)
        form.addFile(name: "file", filename: "photo.jpg", mimeType: "image/jpeg", data: imageData)
        let body = form.finalizedBody()

        var request = URLRequest(url: URL(string: "https://api.exemple.com/v1/photos")!)
        request.httpMethod = "POST"
        request.setValue("multipart/form-data; boundary=\(form.boundary)", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.timeoutInterval = 30

        let data: Data
        let response: URLResponse
        do {
            (data, response) = try await URLSession.shared.upload(for: request, from: body)
        } catch let error as URLError {
            // Erreurs transport (offline, timeout) → NetworkError (voir section 6)
            throw Self.mapTransportError(error)
        }

        guard let http = response as? HTTPURLResponse else {
            throw NetworkError.invalidResponse
        }
        try Self.validate(status: http.statusCode, body: data) // voir section 6
        return try JSONDecoder().decode(PhotoResponse.self, from: data)
    }
}
```

Note : ne mets PAS `Content-Length` à la main, `URLSession` le calcule. Et ne mets pas `httpBody` quand tu utilises `upload(from:)`, c'est le `body` passé en argument qui compte.

---

## 5. Détecter l'offline avec NWPathMonitor

En UIKit, beaucoup réutilisaient `Reachability` (une classe tierce qui traînait dans tous les projets). L'équivalent système moderne, c'est le framework **Network** avec `NWPathMonitor`. Il pousse un nouveau `path` à chaque changement de connexion.

On l'enveloppe dans un `@Observable` pour l'exposer à SwiftUI :

```swift
import Network
import Observation

@Observable
@MainActor
final class NetworkMonitor {
    private(set) var isOnline = true

    private let monitor = NWPathMonitor()
    private let queue = DispatchQueue(label: "NetworkMonitor")

    init() {
        monitor.pathUpdateHandler = { [weak self] path in
            // Le handler tourne sur `queue`, on repasse sur le main pour muter l'état observé.
            Task { @MainActor in
                self?.isOnline = (path.status == .satisfied)
            }
        }
        monitor.start(queue: queue)
    }

    deinit {
        monitor.cancel()
    }
}
```

`path.status` vaut `.satisfied` (connecté), `.unsatisfied` (pas de réseau) ou `.requiresConnection`. On expose juste un booléen `isOnline` lisible.

Côté vue, on l'injecte dans l'environnement et on affiche un bandeau :

```swift
@main
struct MyApp: App {
    @State private var network = NetworkMonitor()

    var body: some Scene {
        WindowGroup {
            ContentView().environment(network)
        }
    }
}

struct OfflineBanner: View {
    @Environment(NetworkMonitor.self) private var network

    var body: some View {
        if !network.isOnline {
            Text("Pas de connexion")
                .font(.footnote.weight(.semibold))
                .frame(maxWidth: .infinity)
                .padding(8)
                .background(.red.opacity(0.9), in: .rect)
                .foregroundStyle(.white)
        }
    }
}
```

Attention : `NWPathMonitor` te dit si une **interface** est disponible, pas si ton serveur répond. Un Wi-Fi de café avec portail captif est `.satisfied` mais tes requêtes échouent quand même. C'est un indicateur, pas une garantie — la vraie source de vérité reste la réponse HTTP.

---

## 6. Distinguer erreur technique et erreur métier

C'est LE point qui sépare un junior d'un dev sérieux. Deux familles totalement différentes :

- **Technique** : pas de réseau, timeout, DNS, serveur 500. L'utilisateur n'a rien fait de mal → message "réessaie / vérifie ta connexion".
- **Métier** : le serveur a reçu la requête, l'a comprise, et la refuse pour une raison fonctionnelle (image trop grande, format interdit, quota dépassé). En REST c'est souvent un **422 Unprocessable Entity** avec un body JSON expliquant le pourquoi → message précis venant du serveur.

On modélise ça dans un seul type d'erreur :

```swift
enum NetworkError: Error {
    case offline                 // technique : pas de connexion
    case timedOut                // technique : trop lent
    case server(status: Int)     // technique : 5xx
    case business(message: String, code: String?) // métier : 4xx avec body décodé
    case invalidResponse
    case decoding(Error)
}

// Body d'erreur renvoyé par TON backend, à adapter
struct APIErrorBody: Decodable {
    let code: String?
    let message: String
}
```

La validation centralisée transforme un statut HTTP en bon cas d'erreur :

```swift
extension PhotoUploader {
    static func validate(status: Int, body: Data) throws {
        switch status {
        case 200...299:
            return // OK
        case 422, 400, 409:
            // Erreur métier : on décode le message du serveur
            if let apiError = try? JSONDecoder().decode(APIErrorBody.self, from: body) {
                throw NetworkError.business(message: apiError.message, code: apiError.code)
            }
            throw NetworkError.business(message: "Requête refusée.", code: nil)
        case 401:
            throw NetworkError.business(message: "Session expirée, reconnecte-toi.", code: "unauthorized")
        case 500...599:
            throw NetworkError.server(status: status)
        default:
            throw NetworkError.invalidResponse
        }
    }
}
```

Et on attrape les erreurs **transport** (offline, timeout) côté `URLError`, qui sont levées par `URLSession` avant même d'avoir un statut HTTP :

```swift
extension PhotoUploader {
    static func mapTransportError(_ error: URLError) -> NetworkError {
        switch error.code {
        case .notConnectedToInternet, .dataNotAllowed:
            return .offline
        case .timedOut:
            return .timedOut
        default:
            return .server(status: -1)
        }
    }
}
```

Enfin, on traduit pour l'utilisateur (jamais de code brut à l'écran) :

```swift
extension NetworkError {
    var userMessage: String {
        switch self {
        case .offline:                 "Pas de connexion. Vérifie ton réseau puis réessaie."
        case .timedOut:                "Le serveur met trop de temps à répondre. Réessaie."
        case .server:                  "Problème côté serveur. Réessaie dans un instant."
        case .business(let msg, _):    msg                      // message métier du serveur
        case .invalidResponse, .decoding: "Une erreur est survenue."
        }
    }
}
```

---

## 7. Retry avec backoff exponentiel (et ce qu'il ne faut PAS retry)

Une erreur **transitoire** (timeout, 500, coupure réseau brève) peut réussir au 2e essai. Une erreur **métier** (422 « image trop grande ») réussira jamais en réessayant — la retry serait un bug qui spamme le serveur.

Règle : on retry seulement `offline`, `timedOut`, `server`. **Jamais** `business`.

```swift
func retrying<T>(
    maxAttempts: Int = 3,
    operation: () async throws -> T
) async throws -> T {
    var attempt = 0
    while true {
        do {
            return try await operation()
        } catch let error as NetworkError {
            attempt += 1
            let isRetryable: Bool
            switch error {
            case .offline, .timedOut, .server: isRetryable = true
            case .business, .invalidResponse, .decoding: isRetryable = false
            }
            guard isRetryable, attempt < maxAttempts else { throw error }

            // Backoff exponentiel : 0.5s, 1s, 2s... + un peu de jitter
            let delay = pow(2.0, Double(attempt - 1)) * 0.5
            let jitter = Double.random(in: 0...0.3)
            try await Task.sleep(for: .seconds(delay + jitter))
        }
    }
}
```

Usage :

```swift
let result = try await retrying {
    try await uploadPhoto(jpeg, title: "Vacances")
}
```

Le jitter évite que mille clients qui ont perdu le réseau en même temps tapent le serveur pile à la même seconde (effet « thundering herd »).

---

## 8. Le ViewModel qui assemble tout

```swift
import Observation

@Observable
@MainActor
final class UploadViewModel {
    enum State { case idle, uploading, success, failed(String) }

    private(set) var state: State = .idle
    private let uploader: PhotoUploader
    private let network: NetworkMonitor

    init(uploader: PhotoUploader, network: NetworkMonitor) {
        self.uploader = uploader
        self.network = network
    }

    func upload(image: UIImage, title: String) async {
        guard network.isOnline else {
            state = .failed("Pas de connexion. Vérifie ton réseau puis réessaie.")
            return
        }
        guard let jpeg = image.jpegData(compressionQuality: 0.7) else {
            state = .failed("Image illisible.")
            return
        }

        state = .uploading
        do {
            _ = try await retrying {
                try await uploader.uploadPhoto(jpeg, title: title)
            }
            state = .success
        } catch let error as NetworkError {
            state = .failed(error.userMessage)
        } catch {
            state = .failed("Une erreur est survenue.")
        }
    }
}
```

La vue, elle, ne connaît que `state` et `NetworkMonitor` — toute la complexité réseau est cachée.

---

## Points à connaître

- **CRLF, pas LF.** Tout le multipart utilise `\r\n`. Un `\n` simple et certains serveurs (nginx strict) rejettent le corps en 400. C'est l'erreur la plus fréquente quand on écrit le multipart à la main.
- **`NWPathMonitor` ≠ « mon serveur répond ».** `.satisfied` signifie juste qu'une interface réseau existe. Portail captif, VPN tombé, serveur down : tu es `.satisfied` et pourtant la requête échoue. Garde la réponse HTTP comme vérité finale.
- **Ne retry jamais une 4xx métier.** Un 422/409 ne se règle pas en réessayant ; tu spammes le serveur et tu masques le vrai message. Seuls `timeout`, `5xx` et `offline` sont retryables.
- **Compresse avant, pas après.** Envoyer le HEIC brut de l'appareil photo, c'est des Mo inutiles et des uploads qui timeout en 4G. `jpegData(compressionQuality: 0.7)` ou downsampling ImageIO selon le besoin.

---

## Exercice

Pars de l'app de la fiche : ajoute un `NetworkMonitor` `@Observable` et affiche un bandeau « Pas de connexion » en haut de l'écran quand `isOnline == false` (teste en activant le mode Avion). Puis branche un bouton « Envoyer » qui prend une `UIImage` fixe, la compresse en JPEG 0.7, et l'uploade en multipart vers `https://httpbin.org/post` (qui renvoie 200 et te montre ce qu'il a reçu). Affiche `.uploading` / `.success` / `.failed(message)` à l'écran. Faisable en 15-20 min.

---

## Question d'entretien

**Q : Comment envoies-tu une photo au serveur depuis une app iOS ?**
R modèle : « Je compresse d'abord l'image (JPEG `compressionQuality` ~0.7, voire un downsampling via ImageIO si elle est trop grande) pour ne pas envoyer plusieurs Mo inutiles. Puis je construis un corps `multipart/form-data` : un boundary unique, une partie par champ texte et une partie fichier avec `Content-Disposition` + `Content-Type: image/jpeg`, chaque ligne en `\r\n`. J'envoie avec `URLSession.upload(for:from:)` en async/await, et le header `Content-Type` annonce le même boundary. »

**Q : Comment détectes-tu la perte de réseau ?**
R modèle : « Avec `NWPathMonitor` du framework Network : son `pathUpdateHandler` me pousse un `path`, je regarde `path.status == .satisfied`, et j'expose un `isOnline` dans un `@Observable` injecté dans l'environnement SwiftUI. Mais c'est un indicateur d'interface, pas une garantie que mon serveur répond — un portail captif est `.satisfied`. Donc la vérité finale reste la réponse HTTP, et je traite séparément les `URLError.notConnectedToInternet`/`.timedOut` côté transport. »

**Q : Différence entre une erreur 500 et une 422, côté gestion ?**
R modèle : « La 500 est technique (serveur planté), transitoire : je peux la retry avec un backoff exponentiel et afficher un message générique. La 422 est métier : le serveur a compris ma requête et la refuse pour une raison fonctionnelle, avec un message dans le body que je décode et montre tel quel. Je ne retry jamais une 422, ce serait inutile et ça spammerait l'API. »

---

## Résumé

- `multipart/form-data` en `URLSession` pur : boundary unique, parties séparées, `\r\n` partout, `upload(for:from:)`.
- Compresse l'image avant l'envoi : `jpegData(compressionQuality: 0.7)` et/ou downsampling ImageIO.
- `NWPathMonitor` (framework Network) → `path.status == .satisfied` → `isOnline` dans un `@Observable` → bandeau « Pas de connexion ».
- Sépare technique (`URLError` offline/timeout, 5xx) et métier (422/409 avec body décodé) → messages utilisateur différents.
- Retry seulement les erreurs transitoires avec backoff exponentiel + jitter ; jamais une 4xx métier.
- `NWPathMonitor` indique une interface réseau, pas que ton serveur répond : la réponse HTTP reste la vérité.
