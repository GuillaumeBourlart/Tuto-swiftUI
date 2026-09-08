# Fiche 11.06 — FCM, Crashlytics et règles de sécurité en intro

## Objectif

Comprendre les services Firebase importants en production : FCM pour les notifications push, Crashlytics pour les crashs, et les règles de sécurité pour protéger les données.

Cette fiche reste volontairement introductive.

## 1. FCM : Firebase Cloud Messaging

FCM sert à envoyer des notifications push.

Sur iOS, FCM travaille avec APNs, le système Apple de notifications push.

```text
Serveur / Firebase
→ FCM
→ APNs
→ iPhone utilisateur
```

## 2. Token FCM

Chaque installation de l’app peut avoir un token FCM.

```swift
import FirebaseMessaging

Messaging.messaging().token { token, error in
    if let token {
        print("FCM token: \(token)")
    }
}
```

Ce token peut être envoyé à ton backend ou stocké dans Firestore pour notifier un utilisateur.

## 3. Notification foreground / background

```text
Foreground → app ouverte
Background → app en arrière-plan
Terminated → app fermée
```

Il faut tester les trois situations, car le comportement n’est pas toujours identique.

## 4. Notification message vs data message

```text
Notification message → affichage géré plus automatiquement
Data message → payload personnalisé à traiter par l’app
```

Pour commencer, il faut surtout comprendre qu’une notification peut soit afficher un message, soit transporter des données.

## 5. Crashlytics

Crashlytics sert à voir les crashs réels chez les utilisateurs.

Il aide à connaître :

- l’erreur ;
- la stack trace ;
- la version de l’app ;
- le nombre d’utilisateurs touchés ;
- la fréquence du crash.

Tu peux aussi loguer des erreurs non fatales.

```swift
import FirebaseCrashlytics

Crashlytics.crashlytics().record(error: error)
```

## 6. Règles de sécurité Firestore

Firestore doit être protégé côté serveur avec des règles.

Mauvaise idée :

```text
Tout le monde peut lire/écrire partout.
```

Principe correct :

```text
Un utilisateur ne peut lire/modifier que ses propres données.
```

Exemple conceptuel :

```text
users/{userId}
→ lecture/écriture autorisée seulement si request.auth.uid == userId
```

## 7. App Check en une ligne

App Check aide à limiter les abus en vérifiant que les requêtes viennent bien de ton app légitime.

Tu n’as pas besoin de le maîtriser en détail au début, mais il faut savoir à quoi ça sert.

## Résumé

- FCM sert aux notifications push.
- Sur iOS, FCM passe par APNs.
- Le token FCM identifie une installation de l’app.
- Crashlytics sert à suivre les crashs réels.
- Les règles Firestore/Storage sont obligatoires en production.
- App Check aide à limiter les usages abusifs.
