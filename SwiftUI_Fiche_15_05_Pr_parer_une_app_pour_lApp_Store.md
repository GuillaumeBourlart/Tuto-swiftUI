# Fiche 15.05 — Préparer une app pour l’App Store

## Objectif

Connaître les mots-clés importants de la distribution iOS : Bundle Identifier, App ID, certificats, provisioning profile, archive, TestFlight et App Store Connect.

L’objectif n’est pas de devenir expert signature, mais de pouvoir comprendre le workflow.

## 1. Bundle Identifier

Le Bundle Identifier est l’identifiant unique de l’app.

Exemple :

```text
com.guillaumebourlart.myapp
```

Il sert à distinguer ton app côté iOS, Apple Developer, App Store Connect, Firebase, notifications, etc.

## 2. App ID

L’App ID est l’app enregistrée dans le compte Apple Developer.

Il est lié au Bundle Identifier.

Il sert à activer des capacités :

- Push Notifications ;
- Sign in with Apple ;
- Associated Domains ;
- iCloud ;
- Keychain sharing.

## 3. Certificate

Un certificat prouve que tu es autorisé à signer l’app.

Types simplifiés :

```text
Development → installer/tester pendant le développement
Distribution → distribuer via TestFlight ou App Store
```

## 4. Provisioning Profile

Un provisioning profile relie :

```text
App ID + certificat + appareils/autorisations
```

Il dit en gros :

> Cette app, signée par ce certificat, a le droit de tourner ou d’être distribuée dans ce contexte.

Avec la signature automatique Xcode, tu n’as pas toujours besoin de le gérer à la main.

## 5. Archive

Une archive est une build prête à être distribuée.

Dans Xcode :

```text
Product → Archive
```

Ensuite tu peux envoyer la build vers App Store Connect.

## 6. TestFlight

TestFlight permet de tester l’app avant publication.

Tu peux inviter :

- des testeurs internes ;
- des testeurs externes ;
- une équipe QA ;
- un client.

C’est la méthode standard pour faire tester une app iOS hors simulateur.

## 7. App Store Connect

App Store Connect sert à gérer :

- la fiche App Store ;
- les builds ;
- TestFlight ;
- les versions ;
- les captures d’écran ;
- les prix ;
- les abonnements / achats intégrés ;
- la soumission à Apple.

## 8. Version number et build number

```text
Version number → version visible utilisateur, exemple 1.0.0
Build number → numéro interne, doit augmenter à chaque upload
```

Exemple :

```text
Version : 1.2.0
Build : 45
```

## 9. À dire en entretien

> Je connais le workflow de distribution iOS : Bundle Identifier, signature, archive, upload App Store Connect, TestFlight et soumission App Store. Je peux utiliser la signature automatique Xcode, et je sais à quoi servent les certificats et provisioning profiles.

## Résumé

- Bundle Identifier : identifiant unique de l’app.
- App ID : app déclarée côté Apple Developer.
- Certificate : autorise la signature.
- Provisioning Profile : relie app, certificat et droits.
- Archive : build distribuable.
- TestFlight : test avant publication.
- App Store Connect : gestion des builds et publication.
