# Fiche 09.01 — Quelle persistance choisir ?

## Objectif

Savoir choisir rapidement où stocker une donnée dans une app iOS : `@AppStorage`, `UserDefaults`, Keychain, fichier local ou Core Data.

Le but n’est pas de tout stocker au même endroit, mais de choisir l’outil adapté au besoin.

## 1. La règle simple

```text
Petite préférence utilisateur → AppStorage / UserDefaults
Donnée sensible comme un token → Keychain
Petit fichier JSON local → FileManager
Données complexes, filtrables ou relationnelles → Core Data
Données modernes avec SwiftData → à connaître, mais pas prioritaire pour un projet existant
```

En entretien, tu peux dire :

> “Je choisis la persistance selon la nature de la donnée. Je ne stocke jamais un token dans UserDefaults. Pour des données complexes ou offline, j’utilise Core Data.”

## 2. AppStorage / UserDefaults

À utiliser pour de petites valeurs non sensibles.

Exemples :

- onboarding déjà vu ;
- préférence de thème ;
- dernier onglet sélectionné ;
- filtre simple ;
- option activée/désactivée.

```swift
@AppStorage("hasSeenOnboarding") private var hasSeenOnboarding = false
@AppStorage("selectedTab") private var selectedTab = 0
```

À ne pas utiliser pour :

- access token ;
- refresh token ;
- mot de passe ;
- données privées importantes.

## 3. Keychain

À utiliser pour les données sensibles.

Exemples :

- access token ;
- refresh token ;
- identifiant de session ;
- secret utilisateur.

```text
Login réussi
→ l’API renvoie accessToken + refreshToken
→ l’app les stocke dans le Keychain
→ les requêtes suivantes utilisent le token
→ au logout, on supprime les tokens
```

C’est une compétence importante pour les apps avec auth propriétaire.

## 4. Fichier local JSON

À utiliser pour stocker un petit objet ou une petite liste sans base de données.

Exemples :

- cache simple ;
- paramètres exportables ;
- brouillon local ;
- dernier résultat d’API.

```swift
struct UserSettings: Codable {
    let username: String
    let notificationsEnabled: Bool
}
```

C’est plus souple que UserDefaults si la donnée est structurée, mais ça ne remplace pas une vraie base locale.

## 5. Core Data

À utiliser pour les données complexes ou durables.

Exemples :

- favoris ;
- historique ;
- objets offline ;
- relations entre entités ;
- cache local plus sérieux ;
- recherche/filtrage local.

Core Data devient pertinent quand tu veux faire des requêtes, filtrer, trier ou relier plusieurs types de données.

## 6. SwiftData

SwiftData est l’approche plus récente d’Apple, mais beaucoup de projets existants utilisent encore Core Data.

Pour ton objectif emploi, le discours propre est :

> “Je connais Core Data pour les projets existants. SwiftData est une approche moderne que je peux apprendre rapidement si le projet l’utilise.”

## 7. Tableau de décision

| Besoin | Solution conseillée |
|---|---|
| Onboarding déjà vu | `@AppStorage` |
| Préférence simple | `UserDefaults` / `@AppStorage` |
| Access token | Keychain |
| Refresh token | Keychain |
| Petit objet Codable | Fichier JSON local |
| Favoris offline | Core Data |
| Données relationnelles | Core Data |
| Cache complexe | Core Data |

## Résumé

- `@AppStorage` et `UserDefaults` servent aux petites préférences.
- Les tokens vont dans le Keychain.
- Un JSON local suffit pour de petites données structurées.
- Core Data sert aux données complexes/offline.
- SwiftData est utile à connaître, mais Core Data reste très important en entreprise.
