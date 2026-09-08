# Fiche 15.09 — Publier sur l'App Store, pas à pas

## Objectif

Dérouler la vraie procédure de publication d'une app iOS, du compte développeur à la validation Apple. Pas le glossaire : les étapes concrètes + les pièges de review qui font perdre des jours.

---

## 1. Pré-requis : compte, App ID, signing

Avant tout build distribuable :

- **Apple Developer Program** : 99 $/an (compte Organization si tu publies pour un client/une société → demande un numéro D-U-N-S, comptez plusieurs jours). Sans ça, pas d'upload App Store.
- **App ID / Bundle ID** : identifiant unique reverse-DNS, ex. `com.tonentreprise.monapp`. Il est figé une fois l'app créée sur App Store Connect.
- **Capabilities** : Push, Sign in with Apple, iCloud, HealthKit… s'activent dans l'onglet **Signing & Capabilities** de Xcode ET côté App ID. Une capability ajoutée dans Xcode mais pas provisionnée → échec de signature.
- **Certificats & provisioning profiles** : historiquement gérés à la main (Distribution certificate + App Store provisioning profile). Aujourd'hui, laisse **Automatically manage signing** (case dans Signing & Capabilities) faire le travail.

Réflexe UIKit → moderne : tu connais déjà le coup des profils mobileprovision à régénérer après chaque changement de capability. Avec **Automatically manage signing**, Xcode régénère seul. Le manuel reste utile pour la CI (fastlane match, App Store Connect API key), mais en local : automatique.

```text
Pas idéal : gérer certs/profiles à la main en local → "provisioning profile doesn't include..."
Préférable : Automatically manage signing + un Apple Developer team sélectionné.
```

---

## 2. App Store Connect : créer la fiche app

Sur [appstoreconnect.apple.com](https://appstoreconnect.apple.com) → **My Apps** → **+** → **New App** :

- **Plateforme** iOS, **Nom** (unique sur tout l'App Store), **langue principale**.
- **Bundle ID** : choisis celui enregistré à l'étape 1 (s'il n'apparaît pas, c'est qu'il n'existe pas côté Certificates, Identifiers & Profiles).
- **SKU** : identifiant interne libre (ex. `MONAPP001`), jamais visible des users.
- Ensuite tu renseignes : **catégorie** (primaire + secondaire), **prix** (gratuit / payant via les Paid Apps Agreement à signer dans Business), **disponibilité** par pays.

À ce stade l'app existe mais n'a aucun build. Le numéro de version (ex. `1.0`) se crée ici et devra correspondre au `CFBundleShortVersionString` de ton archive.

---

## 3. Archive et upload du build

Dans Xcode :

1. Sélectionne **Any iOS Device (arm64)** comme destination (pas un simulateur, sinon Archive est grisé).
2. **Product > Archive**. Xcode build en Release et ouvre l'**Organizer**.
3. Dans Organizer : **Distribute App** → **App Store Connect** → **Upload**.
4. Laisse les options par défaut. Le **Bitcode** est supprimé depuis Xcode 14 : il ne reste que **Upload your app's symbols** (à laisser coché) pour la symbolication des crashs.
5. Xcode signe, valide et upload. Le build apparaît dans App Store Connect après quelques minutes de **processing** (statut "Processing").

```text
Piège : "No accounts with App Store Connect access" → ton Apple ID n'a pas le rôle
App Manager/Admin, ou la team sélectionnée n'est pas la bonne.
```

Erreur fréquente : oublier d'incrémenter le **build number** → upload refusé ("redundant binary / bundle version already exists"). Voir section 8.

---

## 4. TestFlight avant la prod

Toujours tester le build réel distribué (pas seulement en debug) :

- **Testeurs internes** : jusqu'à 100 membres de ta team App Store Connect. Accès quasi immédiat, **pas de review**.
- **Testeurs externes** : jusqu'à 10 000, via email ou lien public. Nécessite une **Beta App Review** (légère) pour le premier build d'un groupe.
- Renseigne **What to Test** + infos beta (description, contact, compte démo si login requis).
- Les builds TestFlight **expirent au bout de 90 jours**.
- Le feedback (captures + commentaires testeurs) et les **crashs TestFlight** remontent dans App Store Connect et dans l'Organizer.

Réflexe : ne jamais soumettre en prod un build que tu n'as pas lancé via TestFlight au moins une fois. Le binaire Release se comporte différemment du Debug (optimisations, assertions désactivées, signing de distribution).

---

## 5. Fiche store : screenshots, textes, compte démo

C'est là que la **review** se joue côté metadata. À préparer :

- **Screenshots** aux tailles obligatoires (sinon soumission bloquée) :

```text
iPhone 6.9" (iPhone 16 Pro Max — 1320 × 2868)   ← requis (ou le 6.5")
iPhone 6.5" (iPhone 11 Pro Max — 1242 × 2688)   ← accepté à la place du 6.9"
iPad 13"   (iPad Pro 13" — 2064 × 2752)          ← requis SI l'app supporte iPad
```

  Tu fournis **un seul** des deux iPhone (6.9" OU 6.5") ; Apple downscale automatiquement
  pour les écrans plus petits. Côté iPad, le 13" est désormais la taille par défaut requise.
  1 à 10 screenshots par taille.
- **Description**, **sous-titre** (30 car.), **mots-clés** (100 car., séparés par virgules, pas d'espaces inutiles, pas de noms de marques concurrentes).
- **URL de support** (obligatoire, doit être une vraie page atteignable) et URL marketing (optionnelle).
- **App Review Information** : nom/email/téléphone de contact + **compte démo** (identifiants de test) si ton app a un login. **Sans compte démo fonctionnel, rejet quasi garanti** (guideline 2.1).
- **Notes pour le reviewer** : explique comment atteindre les features cachées (codes, IAP, déclencheurs de notif…).

```text
Piège classique : login obligatoire + pas de compte démo valide
→ rejet 2.1 "we were unable to sign in". Teste TOI-MÊME le compte démo avant de soumettre.
```

---

## 6. Confidentialité & export compliance

Les points à ne pas rater, sinon rejet ou blocage upload :

- **App Privacy labels** : déclare dans App Store Connect quelles données tu collectes (identifiants, contacts, localisation…) et si elles te tracent. Doit être **cohérent avec le code réel** ; un label mensonger = rejet (guideline 5.1.1/5.1.2).
- **Privacy Manifest** (`PrivacyInfo.xcprivacy`) : **enforced depuis le 1er mai 2024**. Obligatoire pour déclarer les **API "à raison requise"** (required reason API : `UserDefaults`, file timestamps, `systemBootTime`, disk space…) et tes data types. Les **SDK tiers de la liste Apple** doivent fournir leur propre manifest **+ une signature**. Voir fiche 18.02. App ou SDK sans raison/manifest → email automatique d'Apple, puis rejet à l'upload.
- **Export compliance (chiffrement)** : à la première soumission d'une version, Apple demande si tu utilises du chiffrement. HTTPS standard = exemption. Pour éviter la question à chaque build, ajoute dans `Info.plist` :

```xml
<key>ITSAppUsesNonExemptEncryption</key>
<false/>
```

  (mets `<true/>` + docs ERN/CCATS uniquement si tu fais du chiffrement propriétaire non standard).

- **ATS (App Transport Security)** : par défaut iOS impose le **HTTPS (TLS 1.2+)**. Si tu désactives ATS via `NSAllowsArbitraryLoads` dans `Info.plist` pour autoriser du HTTP en clair, prépare une **justification** dans les notes reviewer (sinon questions/rejet). Préfère des exceptions ciblées par domaine plutôt qu'un `NSAllowsArbitraryLoads` global.

```xml
<!-- À éviter ; si vraiment nécessaire, exception ciblée par domaine -->
<key>NSAppTransportSecurity</key>
<dict>
    <key>NSExceptionDomains</key>
    <dict>
        <key>legacy.exemple.com</key>
        <dict>
            <key>NSExceptionAllowsInsecureHTTPLoads</key>
            <true/>
        </dict>
    </dict>
</dict>
```

---

## 7. Survivre à la review : motifs de rejet fréquents

Les rejets qui reviennent en mission/entretien :

- **Guideline 2.1 — Performance / completeness** : crash au lancement, compte démo cassé, feature qui ne marche pas, écran blanc. Le plus fréquent. Teste sur un **vrai device** un build distribution.
- **4.8 — Sign in with Apple** : si tu proposes un login social tiers (Google, Facebook…), tu **dois** aussi proposer Sign in with Apple (ou une option équivalente respectant la vie privée). Login email/mot de passe seul → exempté.
- **5.1.1(v) — Suppression de compte** : si l'app permet de créer un compte, elle **doit** permettre de le supprimer **depuis l'app** (pas juste "contactez-nous"). Oubli = rejet quasi systématique.
- **Metadata / 2.3** : screenshots trompeurs, description mentionnant d'autres plateformes ("aussi sur Android"), placeholders.
- **Contenu** : UGC sans modération/blocage/signalement (1.2), contenu inapproprié.
- **3.1.1 — Paiements** : vendre du contenu numérique hors In-App Purchase = rejet.

```text
Astuce review : si tu reçois un rejet, réponds dans Resolution Center (factuel, pas
d'argumentaire émotionnel). Tu peux aussi faire appel (App Review Board) si tu penses
que c'est une erreur d'interprétation.
```

---

## 8. Versioning, phased release, builds expirés

- **`CFBundleShortVersionString`** = version visible (ex. `1.2.0`, marketing). **`CFBundleVersion`** = build number (ex. `42`, incrément à chaque upload). Deux uploads avec le même couple version+build → refusé.

```text
Version (marketing) : 1.2.0   ← visible sur la fiche store
Build               : 42      ← interne, doit augmenter à chaque upload
```

- **Phased release** : Apple déploie une mise à jour progressivement sur 7 jours (1 % → 100 %). Optionnel, recommandé pour limiter l'impact d'un bug. Tu peux la mettre en pause ou tout débloquer d'un coup.
- **Builds expirés** : un build TestFlight expire à 90 jours. Un build en attente de review trop vieux peut devoir être re-uploadé.
- **Release manuelle vs auto** : choisis "Manually release this version" pour publier toi-même après l'approbation (utile pour synchroniser avec une comm/marketing).

---

## 9. Crashs en production : symbolication

Après publication, surveiller les crashs :

- **Xcode Organizer > Crashes** : crashs symboliqués automatiquement si les **dSYM** ont été uploadés (cas par défaut avec "Upload symbols").
- **dSYM** : fichier de symboles qui transforme `0x0001a2f4` en `MyViewModel.load()`. Sans lui, une stack trace est illisible. Pour Bitcode (déprécié) Apple recompilait → il fallait re-télécharger les dSYM depuis App Store Connect ; aujourd'hui tes dSYM locaux dans l'archive suffisent.
- **Crashlytics** (voir fiche 15.04) : reporting temps réel, regroupement par signature, alerting. Il faut **uploader les dSYM à Crashlytics** (script de build run-phase) sinon crashs non symboliqués.

```text
Piège : crashs "??? in MyApp" non symboliqués → dSYM manquant.
Vérifie que l'archive contient les dSYM (Organizer > clic droit > Show in Finder > .xcarchive/dSYMs).
```

---

## Points à connaître

- **Pas de compte démo = rejet 2.1.** Si l'app a un login, fournis toujours des identifiants de test valides + explique comment les utiliser dans les notes reviewer.
- **Suppression de compte obligatoire (5.1.1(v)).** Création de compte sans bouton de suppression in-app → rejet. Pense-le dès le design.
- **Build number jamais en doublon.** Incrémente `CFBundleVersion` à chaque upload, même pour un build identique re-soumis.
- **App Privacy labels ≠ marketing.** Ils doivent refléter le code réel (et tes SDK). Incohérence = rejet (5.1.1/5.1.2) et perte de confiance.

---

## Exercice (15-20 min)

Tu publies **"NoteFlow"**, une app de notes avec login email + Google, sync iCloud, abonnement Premium (IAP). Rédige une **checklist de soumission** complète, du Archive à la review. Couvre au minimum :

1. Pré-requis signing (capabilities à activer pour iCloud et IAP).
2. Étapes Archive → upload (destination, Organizer, statut processing).
3. Ce que tu vérifies sur TestFlight avant prod.
4. Metadata obligatoires (tailles de screenshots, compte démo, mots-clés).
5. Confidentialité (Privacy labels, Privacy Manifest, export compliance).
6. **3 risques de rejet spécifiques à cette app** et comment les couvrir.

Objectif : une liste qu'un collègue pourrait suivre sans toi. (Indice : login Google → 4.8 ; création de compte → 5.1.1(v) ; IAP Premium → 3.1.1.)

---

## Question d'entretien

**Q : "Déroule les étapes pour publier une app sur l'App Store."**
R modèle : « J'ai besoin d'un compte Apple Developer (99 $/an) et d'un Bundle ID enregistré avec les bonnes capabilities. Je crée l'app dans App Store Connect (nom, catégorie, prix, version). Côté Xcode, je laisse Automatically manage signing, je build en Release via Product > Archive, puis Distribute App > App Store Connect > Upload depuis l'Organizer. Je teste le build réel via TestFlight (interne puis externe). Je complète la fiche store : screenshots aux bonnes tailles, description, mots-clés, URL de support, compte démo pour la review, App Privacy labels, Privacy Manifest et export compliance. Enfin je soumets, et je gère les éventuels rejets dans le Resolution Center. »

**Q : "Quels sont les motifs de rejet que tu anticipes systématiquement ?"**
R modèle : « Crash ou compte démo cassé (2.1), Sign in with Apple manquant si je propose un login social (4.8), absence de suppression de compte in-app (5.1.1(v)), et metadata trompeuses (2.3). Je les couvre en testant un build distribution sur device réel et en checkant la conformité avant soumission. »

**Q : "Différence entre version et build number ?"**
R modèle : « `CFBundleShortVersionString` est la version marketing visible sur la fiche (ex. 1.2.0). `CFBundleVersion` est le numéro de build interne (ex. 42) que je dois incrémenter à chaque upload, sinon App Store Connect refuse le binaire. »

---

## Résumé

- Pré-requis : compte Developer 99 $/an, App ID + capabilities, **Automatically manage signing**.
- App Store Connect : créer l'app (Bundle ID, prix, catégorie, version) **avant** d'uploader.
- **Product > Archive** → Organizer → Distribute App → App Store Connect → Upload.
- **TestFlight** d'abord : tester le binaire Release réel (interne puis externe).
- Fiche store : screenshots aux bonnes tailles, **compte démo**, mots-clés, URL support.
- Confidentialité : **Privacy labels** + **Privacy Manifest** (fiche 18.02) + export compliance.
- Rejets fréquents : 2.1 (crash/démo), 4.8 (Sign in with Apple), 5.1.1(v) (suppression compte), metadata.
- Versioning : version marketing vs **build number** à incrémenter ; phased release optionnelle.
- Crashs : Organizer + **dSYM/symbolication**, Crashlytics (fiche 15.04).
