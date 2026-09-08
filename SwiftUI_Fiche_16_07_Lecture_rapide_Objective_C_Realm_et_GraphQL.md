# Fiche 16.07 — Lecture rapide Objective-C, Realm et GraphQL

## Objectif

Connaître les notions qui reviennent parfois dans les offres iOS, sans les apprendre en profondeur maintenant.

Le but est de savoir en parler honnêtement en entretien.

## 1. Objective-C

Objective-C est l’ancien langage principal du développement iOS avant Swift.

On peut encore en trouver dans :

- apps anciennes ;
- SDK legacy ;
- projets bancaires ou médias ;
- wrappers UIKit historiques.

Exemple très simple :

```objc
- (void)sayHello {
    NSLog(@"Hello");
}
```

Discours entretien :

> Mon langage principal est Swift. Je peux lire de l’Objective-C simple et m’adapter si le projet contient du legacy, mais je ne me présente pas comme expert Objective-C.

## 2. Realm

Realm est une base de données locale alternative à Core Data.

Elle sert à stocker des objets localement dans l’app.

```text
Core Data → framework Apple historique
Realm → solution tierce plus simple sur certains projets
SwiftData → approche Apple plus récente
```

Discours entretien :

> Je connais les bases de persistance locale avec Core Data. Si le projet utilise Realm, je peux m’adapter car le besoin reste de stocker, lire, modifier et supprimer des données locales.

## 3. GraphQL

GraphQL est une alternative à REST.

Avec REST :

```text
GET /users/1
```

Avec GraphQL, le client demande précisément les champs voulus :

```graphql
query {
  user(id: "1") {
    id
    name
    avatarURL
  }
}
```

Discours entretien :

> J’ai surtout travaillé avec REST/JSON. GraphQL change la manière de demander les données, mais côté app on reste sur du réseau, du parsing, des modèles et une gestion d’erreurs.

## 4. Ce qu’il ne faut pas faire

Ne mens pas en disant que tu maîtrises Objective-C, Realm ou GraphQL si tu les as seulement survolés.

Formulation correcte :

```text
Je connais le principe, je ne suis pas expert, mais je peux monter dessus rapidement si le projet l’utilise.
```

## 5. Priorité réelle

Pour ton objectif, priorité à :

```text
Swift
SwiftUI
UIKit de base
MVVM
REST/JSON
Firebase
Core Data
Git
Tests
Debug
```

Objective-C, Realm et GraphQL sont des bonus de culture technique.

## Résumé

- Objective-C sert surtout dans les projets legacy.
- Realm est une alternative à Core Data.
- GraphQL est une alternative à REST.
- Il faut connaître le principe, pas forcément maîtriser maintenant.
- En entretien, sois clair : compétence principale Swift/SwiftUI, adaptation possible sur le reste.
