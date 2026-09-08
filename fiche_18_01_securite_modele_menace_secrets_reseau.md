# Fiche 18.01 — Sécurité iOS : modèle de menace, secrets et réseau

## Objectif

Comprendre ce qu'on peut vraiment protéger dans une app iOS : où sont les frontières de confiance, comment gérer secrets et clés API sans les fuiter, et comment sécuriser le réseau (HTTPS, ATS, pinning). C'est une compétence que les recruteurs et clients freelance vérifient systématiquement.

---

## 1. Le modèle de menace mobile (la base à intégrer)

Règle numéro un : **tout ce qui est dans le binaire est extractible.** Un `.ipa` n'est qu'un zip. N'importe qui peut le dézipper, faire tourner `strings`, `class-dump`, Hopper/Ghidra, ou hooker l'app avec Frida sur un appareil jailbreaké. Tes chaînes de caractères, tes URLs, tes constantes, ta logique sont lisibles.

Démonstration concrète :

```text
$ unzip MonApp.ipa -d extracted
$ strings extracted/Payload/MonApp.app/MonApp | grep -i "api"
AIzaSyD...        <- ta clé Google en clair, bravo
https://api.monbackend.com/v1/admin
secret_token_prod_xxxx
```

Conséquences directes :

- **Le backend est la SEULE frontière de confiance.** L'app est en territoire ennemi.
- **Valide TOUJOURS côté serveur.** Prix, droits, quotas, ownership d'une ressource : si la décision a une valeur, elle se prend sur le serveur. Le client peut tricher.
- Une vérification côté client (ex. `if user.isPremium`) est du confort UX, pas de la sécurité. Le serveur doit re-vérifier.

Réflexe à avoir : « si un attaquant rejoue cette requête à la main avec curl, est-ce que mon backend tient ? »

---

## 2. Secrets et clés API : ne JAMAIS hardcoder

L'anti-pattern classique :

```swift
// CATASTROPHE : la clé est dans le binaire, extractible en 10 secondes
let stripeSecretKey = "sk_live_51H..."
```

L'obfuscation (XOR, découpage en bouts, encodage base64) ne « protège » rien : ça ralentit juste un attaquant de quelques minutes. Ne compte jamais dessus pour un secret qui a une vraie valeur.

### Les trois niveaux, du moins bon au meilleur

**Pas idéal — `.xcconfig` hors Git :** mieux que hardcoder en dur dans le `.swift`, mais la clé finit quand même dans le binaire à la compilation. Acceptable seulement pour des clés à faible risque ou restreintes côté fournisseur.

```text
// Secrets.xcconfig  (PAS dans Git)
API_BASE_URL = api.monbackend.com
ANALYTICS_KEY = abc123
```

```swift
// Lecture depuis Info.plist (la valeur xcconfig y est injectée)
let baseURL = Bundle.main.object(forInfoDictionaryKey: "API_BASE_URL") as? String
```

**Mieux — variables d'environnement CI :** la clé n'est jamais commitée ; elle est injectée au build par le CI (Xcode Cloud, GitHub Actions, Bitrise) via des secrets chiffrés. Reste dans le binaire à l'arrivée, mais le repo est propre.

**Préférable — backend proxy :** la vraie clé secrète (Stripe, OpenAI, clé serveur tierce) vit **uniquement sur ton backend**. L'app appelle ton backend, qui appelle le service tiers avec la clé. L'app ne voit jamais le secret.

```text
App  ──(token user)──►  Ton backend  ──(clé secrète)──►  OpenAI / Stripe
```

C'est la seule approche correcte pour une clé qui peut coûter de l'argent ou donner des privilèges.

### GoogleService-Info.plist : secret ou pas ?

Question piège fréquente. **Non, ce n'est pas un secret critique.** Le fichier Firebase contient des identifiants *publics* (API key client, project ID, app ID) conçus pour être dans l'app — ils identifient ton projet, ils n'autorisent rien de sensible à eux seuls. Firebase est protégé par les **Security Rules** côté serveur et la restriction de la clé dans la console Google Cloud (bundle ID, API autorisées).

En revanche : **une clé d'API tierce à coût/privilège (Stripe secret, clé serveur SendGrid, token admin) EST un secret critique** → backend proxy obligatoire.

La distinction à retenir : *« cette valeur, si elle fuite, permet-elle à un attaquant de faire quelque chose de coûteux ou privilégié sans authentification ? »* Si oui → secret critique.

---

## 3. Réseau sécurisé : HTTPS et App Transport Security

**HTTPS est obligatoire.** En clair (HTTP), n'importe qui sur le réseau (Wi-Fi public, proxy) lit et modifie le trafic.

iOS impose **App Transport Security (ATS)** par défaut : pas de HTTP en clair, TLS 1.2+ requis. C'est une bonne chose, ne la combats pas.

L'erreur de junior qu'on voit en revue de code :

```xml
<!-- À NE JAMAIS FAIRE : désactive toute la sécurité réseau -->
<key>NSAppTransportSecurity</key>
<dict>
    <key>NSAllowsArbitraryLoads</key>
    <true/>
</dict>
```

Ça autorise tout le HTTP en clair dans l'app. C'est un motif de **rejet App Store** (Apple demande une justification) et une faille évidente. Si tu dois vraiment exempter UN domaine legacy, fais-le ciblé :

```xml
<key>NSAppTransportSecurity</key>
<dict>
    <key>NSExceptionDomains</key>
    <dict>
        <key>vieux-domaine-interne.com</key>
        <dict>
            <key>NSExceptionAllowsInsecureHTTPLoads</key>
            <true/>
        </dict>
    </dict>
</dict>
```

Réflexe : une exception ATS doit être **justifiée et documentée**, jamais un `NSAllowsArbitraryLoads` global.

---

## 4. Certificate pinning : quand c'est utile, quand c'est risqué

HTTPS vérifie que le certificat du serveur est signé par une CA de confiance. Le **certificate (ou public key) pinning** va plus loin : l'app n'accepte QUE *ton* certificat / ta clé publique. Ça bloque les attaques man-in-the-middle même si une CA est compromise ou si l'utilisateur a installé un certificat racine malveillant (proxy d'entreprise, outil d'interception).

Implémentation avec `URLSessionDelegate` :

```swift
final class PinningDelegate: NSObject, URLSessionDelegate {
    // SHA-256 de la clé publique de ton serveur (à calculer en amont)
    private let pinnedKeyHash = "AAAAAA...base64..."

    func urlSession(
        _ session: URLSession,
        didReceive challenge: URLAuthenticationChallenge,
        completionHandler: @escaping (URLSession.AuthChallengeDisposition, URLCredential?) -> Void
    ) {
        guard challenge.protectionSpace.authenticationMethod == NSURLAuthenticationMethodServerTrust,
              let serverTrust = challenge.protectionSpace.serverTrust,
              let serverKey = SecTrustCopyKey(serverTrust),
              hash(of: serverKey) == pinnedKeyHash
        else {
            completionHandler(.cancelAuthenticationChallenge, nil) // on rejette
            return
        }
        completionHandler(.useCredential, URLCredential(trust: serverTrust))
    }

    private func hash(of key: SecKey) -> String { /* SHA-256 de la clé exportée */ "" }
}
```

Avec **Alamofire**, c'est plus simple via le `ServerTrustManager` :

```swift
let evaluators = [
    "api.monbackend.com": PublicKeysTrustEvaluator()
]
let session = Session(
    serverTrustManager: ServerTrustManager(evaluators: evaluators)
)
```

**Quand c'est utile :** app bancaire, santé, données très sensibles, ou cible probable d'interception.

**Le risque (souvent sous-estimé) :** si tu pins UN seul certificat et qu'il **expire ou est renouvelé**, ton app casse pour TOUS les utilisateurs jusqu'à une mise à jour App Store (plusieurs jours). Mitigations : pinner la **clé publique** (survit au renouvellement du cert si tu réutilises la paire), pinner **plusieurs** clés (backup), et prévoir un kill-switch. Le pinning est puissant mais c'est une dette opérationnelle réelle — n'en mets pas « par défaut » sans process de rotation.

---

## 5. Stockage sensible : Keychain, pas UserDefaults

Rappel critique (détaillé fiche 09.03) : **un token d'auth, un refresh token, un mot de passe ne vont JAMAIS dans `UserDefaults`.**

`UserDefaults` est stocké en clair dans un `.plist` du conteneur de l'app, lisible dans une sauvegarde non chiffrée et sur appareil jailbreaké.

```swift
// NON : token en clair
UserDefaults.standard.set(authToken, forKey: "token")

// OUI : Keychain (chiffré, protégé par le Secure Enclave, exclu des backups si configuré)
```

Le **Keychain** chiffre les données et permet des protections fines (`kSecAttrAccessibleWhenUnlockedThisDeviceOnly` pour exclure des backups iCloud et empêcher la restauration sur un autre appareil). C'est l'unique bon endroit pour les secrets côté utilisateur. Voir fiche 09.03 pour l'implémentation.

À ranger non plus jamais en UserDefaults : tokens, clés de session, PIN, réponses de sécurité, données de santé/finance.

---

## 6. Privacy Manifest : déclarer ce que l'app collecte (obligatoire 2024)

Depuis le **printemps 2024**, Apple exige un fichier **`PrivacyInfo.xcprivacy`** (Privacy Manifest) pour les apps et de nombreux SDK tiers. Il déclare les **données collectées**, le **tracking**, les **domaines de tracking** et l'usage des **« required reason APIs »** (APIs à motif obligatoire, ex. `UserDefaults`, timestamps de fichiers, espace disque, `systemBootTime`). Un SDK listé par Apple sans manifeste signé bloque la soumission App Store.

Pourquoi c'est dans une fiche sécu : un manifeste honnête force à **cartographier les flux de données sensibles** (PII, identifiants) qui sortent de l'app — c'est la même discipline que le modèle de menace.

```xml
<!-- PrivacyInfo.xcprivacy : extrait -->
<key>NSPrivacyTracking</key>
<false/>
<key>NSPrivacyCollectedDataTypes</key>
<array/>
<key>NSPrivacyAccessedAPITypes</key>
<array>
    <dict>
        <key>NSPrivacyAccessedAPIType</key>
        <string>NSPrivacyAccessedAPICategoryUserDefaults</string>
        <key>NSPrivacyAccessedAPITypeReasons</key>
        <array><string>CA92.1</string></array>
    </dict>
</array>
```

À retenir aussi, côté App Store, deux exigences souvent oubliées : la **suppression de compte in-app obligatoire** (Guideline **5.1.1(v)**) dès qu'une app permet de créer un compte, et **Sign in with Apple** (Guideline **4.8**) requis comme option dès qu'on propose une connexion sociale tierce comme seul ou principal moyen de login.

---

## 7. Top erreurs de sécu mobile (checklist)

```text
[ ] Clé API secrète hardcodée dans le code ou un .xcconfig commité
[ ] Secrets.xcconfig / GoogleService-Info absents du .gitignore (clé poussée sur GitHub)
[ ] NSAllowsArbitraryLoads = true (ATS désactivé globalement)
[ ] Token d'auth stocké en UserDefaults au lieu du Keychain
[ ] Décisions de sécurité prises côté client sans re-vérification serveur
[ ] Logs en prod qui impriment tokens / réponses API / PII (print/os_log non filtré)
[ ] Aucune validation serveur des achats in-app / droits premium
[ ] Pinning posé sans process de rotation -> app cassée au renouvellement du cert
[ ] Données sensibles dans les snapshots multitâche (pas de masquage à la mise en arrière-plan)
```

---

## Points à connaître

- **L'obfuscation n'est pas du chiffrement.** Cacher une clé dans le binaire la retarde, ne la protège pas. Un secret qui doit rester secret ne doit pas être dans l'app, point.
- **`.gitignore` ne nettoie pas l'historique.** Si tu as déjà commité une clé, l'ajouter au `.gitignore` ne la retire pas de l'historique Git. Il faut **révoquer/régénérer la clé** côté fournisseur (et éventuellement réécrire l'historique). Considère toute clé poussée comme compromise.
- **Pinning = dette opérationnelle.** Beaucoup l'activent « pour faire sérieux » puis se font casser l'app par un renouvellement de certificat. À ne mettre qu'avec un plan de rotation et des clés de backup.
- **Les logs fuient.** `print(response)` en prod ou un `os_log` mal configuré peut écrire des tokens dans la console / les logs système. Filtre les données sensibles et utilise `privacy: .private` avec `Logger`.

---

## Exercice (10-20 min)

Sur un de tes projets (ou un projet d'exemple), fais un mini-audit des secrets :

1. **Liste** tous les secrets et valeurs sensibles du projet (clés API, URLs internes, tokens, identifiants Firebase, clés analytics). Classe chacun en *« critique »* (coût/privilège si fuité) ou *« non critique »*.
2. **Décide où chaque secret doit vivre** : `.xcconfig` + CI (non critique), ou **backend proxy** (critique). Écris une ligne de justification par secret.
3. **Écris l'entrée `.gitignore`** :

```gitignore
# Secrets
*.xcconfig
Secrets.xcconfig
GoogleService-Info.plist
.env
```

4. **Propose la structure xcconfig** :

```text
Config/
  Debug.xcconfig        (commité, valeurs non sensibles + #include Secrets)
  Release.xcconfig      (commité)
  Secrets.xcconfig      (IGNORÉ par Git, injecté par le CI en build)
```

```text
// Secrets.xcconfig (non commité)
API_BASE_URL = api.monbackend.com
ANALYTICS_KEY = $(ANALYTICS_KEY)   // injecté depuis une variable CI
```

Bonus : lance `strings` sur ton binaire compilé et vérifie qu'aucun secret critique n'apparaît.

---

## Question d'entretien

**Q1 — « Où stockes-tu une clé d'API dans une app iOS ? »**
Ça dépend de sa criticité. Une clé secrète à coût ou privilège (Stripe secret, clé serveur tierce) ne doit jamais être dans l'app : elle vit sur le backend, qui fait proxy. Une clé non critique ou déjà restreinte côté fournisseur peut passer par un `.xcconfig` hors Git injecté au build par le CI. Et un token utilisateur va dans le Keychain, jamais en UserDefaults. Le principe : tout binaire est extractible (`strings` sur l'`.ipa` suffit), donc aucun vrai secret ne doit s'y trouver.

**Q2 — « C'est quoi le certificate pinning et quel est son risque ? »**
C'est le fait de configurer l'app pour n'accepter que le certificat ou la clé publique de ton propre serveur, au lieu de faire confiance à toutes les CA du système. Ça bloque les attaques man-in-the-middle même si une CA est compromise ou si un certificat racine malveillant est installé. Le risque principal est opérationnel : si le certificat pinné expire ou est renouvelé sans que l'app soit à jour, elle casse pour tous les utilisateurs jusqu'à une release App Store. On mitige en pinnant la clé publique plutôt que le cert, en gardant des clés de backup et en prévoyant un process de rotation.

**Q3 — « Pourquoi GoogleService-Info.plist n'est pas un secret critique ? »**
Parce qu'il ne contient que des identifiants publics (API key client, project ID) conçus pour être embarqués dans l'app. La sécurité Firebase repose sur les Security Rules côté serveur et la restriction de la clé dans la console Google Cloud, pas sur le secret du fichier. Une clé serveur tierce, elle, autorise des actions coûteuses sans auth : c'est ça, un secret critique.

---

## Résumé

- Tout binaire iOS est extractible/inspectable (`strings` sur l'`.ipa`) ; le **backend est la seule frontière de confiance** ; valide toujours côté serveur.
- Ne hardcode **jamais** un secret critique ; l'obfuscation ne protège pas.
- Hiérarchie : `.xcconfig` hors Git (pas idéal) < variables CI (mieux) < **backend proxy** (préférable) pour toute clé à coût/privilège.
- `GoogleService-Info.plist` = identifiants publics, pas critique ; une clé serveur tierce = critique.
- **HTTPS obligatoire** ; ne désactive jamais ATS globalement (`NSAllowsArbitraryLoads`) — exceptions ciblées et justifiées seulement.
- **Certificate pinning** utile pour les apps sensibles, mais c'est une dette opérationnelle : pinner la clé publique, garder des backups, prévoir la rotation.
- Tokens et données sensibles → **Keychain**, jamais UserDefaults (voir fiche 09.03).
- Une clé déjà commitée est compromise : la révoquer/régénérer, le `.gitignore` ne suffit pas.
- **`PrivacyInfo.xcprivacy` obligatoire depuis 2024** (données collectées, tracking, required-reason APIs) ; côté App Store, suppression de compte in-app (**5.1.1(v)**) et **Sign in with Apple** (**4.8**) à prévoir.
