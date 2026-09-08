# Fiche 15.04 — Crashlytics, logs et erreurs non fatales

## Objectif

Comprendre comment suivre les crashs et erreurs réelles des utilisateurs avec Crashlytics et des logs utiles.

En production, tu ne peux pas regarder la console de l’utilisateur. Il faut des outils de suivi.

## 1. Crashlytics sert à quoi ?

Firebase Crashlytics permet de voir :

- les crashs ;
- la stack trace ;
- la version touchée ;
- le nombre d’utilisateurs impactés ;
- le contexte avant le crash.

C’est très courant dans les apps mobiles.

## 2. Crash fatal vs erreur non fatale

Un crash fatal ferme l’app.

Une erreur non fatale est un problème important, mais l’app continue.

Exemples non fatals :

- échec de décodage JSON ;
- erreur serveur inattendue ;
- token invalide ;
- fichier local corrompu ;
- upload image échoué.

## 3. Enregistrer une erreur non fatale

Exemple avec Crashlytics :

```swift
import FirebaseCrashlytics

func loadProfile() async {
    do {
        profile = try await profileService.fetchProfile()
    } catch {
        Crashlytics.crashlytics().record(error: error)
        errorMessage = "Impossible de charger le profil."
    }
}
```

Le but n’est pas d’envoyer toutes les petites erreurs, mais celles qui aident vraiment à comprendre un problème.

## 4. Ajouter des logs de contexte

```swift
Crashlytics.crashlytics().log("Ouverture de ProfileView")
Crashlytics.crashlytics().setCustomValue(userId, forKey: "user_id")
Crashlytics.crashlytics().setCustomValue("profile", forKey: "screen")
```

Attention : évite de mettre des données sensibles dans les logs.

Ne loggue pas :

- mot de passe ;
- token ;
- document d’identité ;
- données personnelles inutiles ;
- contenu privé utilisateur.

## 5. Logs locaux avec Logger

Pour le debug local :

```swift
import os

let logger = Logger(subsystem: "com.myapp.ios", category: "Network")

logger.info("Début appel profil")
logger.error("Erreur réseau")
```

`Logger` est plus propre que des `print` partout.

## 6. Lire une stack trace Crashlytics

Méthode simple :

```text
1. Regarder le fichier et la ligne du crash
2. Identifier l’écran concerné
3. Lire les logs avant le crash
4. Vérifier la version de l’app
5. Reproduire localement si possible
6. Corriger et surveiller la version suivante
```

## Résumé

- Crashlytics permet de suivre les crashs en production.
- Les erreurs non fatales aident à détecter des problèmes sans crash.
- Les logs doivent donner du contexte sans exposer de données sensibles.
- `Logger` est utile pour les logs locaux propres.
