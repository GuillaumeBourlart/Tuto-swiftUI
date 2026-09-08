# Fiche 12.01 — Permissions iOS

## Objectif

Comprendre comment gérer les permissions iOS : photos, caméra, localisation et notifications.

Une permission doit être demandée au bon moment, avec un message clair.

## 1. Principe général

Pour accéder à certaines fonctionnalités sensibles, iOS demande l’accord de l’utilisateur.

Exemples :

- photos ;
- caméra ;
- micro ;
- localisation ;
- notifications.

Il faut aussi ajouter une description dans `Info.plist`.

## 2. Info.plist

Exemples de clés fréquentes :

```text
NSCameraUsageDescription
NSPhotoLibraryUsageDescription
NSLocationWhenInUseUsageDescription
NSUserNotificationUsageDescription
```

Le texte doit expliquer pourquoi l’app demande l’accès.

Exemple :

```text
Nous utilisons votre caméra pour vous permettre d’ajouter une photo de profil.
```

## 3. Demander au bon moment

Mauvaise approche : demander toutes les permissions au lancement.

Bonne approche : demander quand l’utilisateur utilise la fonctionnalité.

```text
L’utilisateur appuie sur “Ajouter une photo”
→ l’app demande l’accès aux photos
```

C’est plus compréhensible et plus rassurant.

## 4. Gérer le refus

L’utilisateur peut refuser une permission.

L’app doit prévoir :

- un message clair ;
- une alternative si possible ;
- un bouton pour ouvrir les réglages si nécessaire.

```swift
if let url = URL(string: UIApplication.openSettingsURLString) {
    UIApplication.shared.open(url)
}
```

## 5. Statuts possibles

Selon la permission, tu peux avoir plusieurs états :

```text
notDetermined → pas encore demandé
authorized → autorisé
denied → refusé
restricted → bloqué par restriction système
limited → accès limité, par exemple photos
```

## 6. Exemple UX simple

```text
Écran profil
→ bouton “Ajouter une photo”
→ demande permission photos
→ si accepté : PhotosPicker
→ si refusé : message + bouton Réglages
```

## Points à connaître

Les permissions sont aussi un sujet UX. Un utilisateur refuse souvent quand il ne comprend pas pourquoi l’app demande l’accès.

Les textes `Info.plist` doivent être simples, précis et cohérents avec la fonctionnalité.

## Résumé

- iOS protège les accès sensibles avec des permissions.
- Il faut ajouter les clés nécessaires dans `Info.plist`.
- Il faut demander la permission au bon moment.
- Il faut gérer le refus proprement.
- Un bouton vers les réglages peut aider si l’utilisateur a refusé.
