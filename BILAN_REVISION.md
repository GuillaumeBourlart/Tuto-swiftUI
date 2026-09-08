# Bilan du cours — révision du 8 septembre 2026

## Avis pour un développeur ayant déjà livré des apps UIKit

Le dossier constitue une bonne base de transition et une bibliothèque assez large. La présence de rappels Swift, de ponts UIKit, de réseau, de tests, de débogage et d’un projet fil rouge est utile. Il était toutefois moins adapté à une lecture linéaire depuis zéro en SwiftUI : Observation arrivait après toute la famille ObservableObject, les formes de navigation étaient dispersées, et plusieurs formulations simplifiaient excessivement la durée de vie et la concurrence.

Pour ce profil, il est plus utile de reconstruire le modèle mental de l’interface que de refaire toute une formation iOS débutant. Le parcours conseillé suit cette priorité et conserve les acquis de livraison UIKit.

## Modifications réalisées

**7 fiches ajoutées**, portant la bibliothèque de 123 à **130 fiches** :

| Fiche | Apport |
|---|---|
| 00.00 | Parcours adapté au profil UIKit, acquis réutilisables, cible des exemples et méthode d’étude |
| 01.08 | Identité, durée de vie, distinction init/body/apparition, annulation et recherche |
| 02.12 | Choix de la source de vérité, bindings, Observation/ObservableObject, édition avec brouillon |
| 05.04 | Comparaison lien direct, booléen, optional, tableau de routes, sheet et racine |
| 05.05 | Onglets indépendants, URL validée, restauration et NavigationSplitView |
| 05.06 | Atelier autonome de carnet clients, avec comportements attendus et défis |
| 17.05 | Compétences à démontrer dans un projet et en entretien |

**16 fiches existantes corrigées ou contextualisées**, notamment :

- Conservation par identité ≠ constructeur d’un objet dans `@State` appelé une seule fois (property wrapper utilisé avec Xcode 26.6).
- Le parent avec `@State` peut déjà créer `$model.property` ; `@Bindable` n’est pas systématiquement nécessaire.
- Observation n’est pas KVO, une architecture obligatoire, une isolation concurrente ou une persistance.
- `.task` n’est pas `viewDidLoad` ; l’annulation est coopérative ; `Task { }` dans un bouton n’est pas annulée par la seule disparition de la vue.
- `await` n’implique pas exécution hors du main actor ; les réglages Swift 6 et la version du compilateur comptent.
- Les types valeur ne garantissent pas à eux seuls absence de fuite ou sécurité concurrente.
- Une connexion change généralement la racine ; un succès ne doit pas rejouer indéfiniment une route.
- Formulaire de sheet réellement éditable, portée de `dismiss`, validation du schéma et de la forme des liens profonds.

Le lecteur propose un **parcours de 53 fiches en 5 étapes**. Les autres fiches restent des rappels ou approfondissements à utiliser selon les besoins. Les liens « Suite du parcours » suivent l’ordre pédagogique, distinct de l’ordre numérique de la bibliothèque.

## Sauvegarde de progression

Ajout du statut manuel, des notes, d’un repère de lecture sous les titres, de la dernière fiche, de la reprise, des compteurs et d’une liste À revoir. L’import/export JSON permet de transférer la progression ; une copie locale plus récente n’est pas remplacée par un ancien export.

L’état est local au navigateur et à l’origine du site. Aucune synchronisation distante n’est annoncée. Une erreur de stockage est visible ; les changements restent en mémoire et peuvent être exportés. La progression n’est pas intégrée aux fichiers de l’export statique.

## Vérifications et périmètre

- Inventaire complet du registre, existence des **130 fichiers**, absence de doublons de slugs/fichiers, cohérence des **53 étapes** et résolution des liens Markdown locaux.
- Contrôle de cohérence ciblé sur le pont UIKit, les bases d’état, la navigation, le cycle de vie, la concurrence et les questions d’entretien correspondantes.
- Comparaison avec les documentations Apple et Swift citées dans les fiches. L’environnement de référence est **Xcode 26.6**, SDK simulateur **iOS 26.5**, mode **Swift 6**, cible minimale **iOS 17** pour les nouveaux exemples. La documentation peut décrire des API plus récentes ; leur adoption n’est pas imposée au parcours.
- Vérification des types de **17 blocs Swift regroupés en 6 ensembles autonomes**, dont l’atelier complet. Le script contrôle également que le fichier Swift, son téléchargement et le bloc de la fiche 05.06 correspondent.
- **9 tests du lecteur** : aller-retour d’export, conservation des notes/repères, fusion de dates, refus de données invalides, identifiants inconnus, liens du cours et repères déterministes.
- Vérification TypeScript et génération statique du lecteur. Le résultat détaillé du build est enregistré séparément dans `verification-lecteur.txt`.

Cette révision **ne certifie pas la compilation de tous les anciens extraits**, dont beaucoup supposent des services ou modèles extérieurs au bloc. Elle ne constitue pas un essai manuel de toutes les interactions sur simulateur ou dans les navigateurs. Les scénarios de 05.06 indiquent ce que l’apprenant doit vérifier en exécutant l’atelier.

Les fiches de fournisseurs tiers, de publication, de sécurité et de confidentialité restent des introductions à vérifier avec la documentation applicable au projet lors de leur mise en pratique. Elles n’ont pas fait l’objet d’un audit exhaustif de conformité, de sécurité ou de chaque version de SDK dans cette révision.

## Conseils d’utilisation

Commencer par 00.00 et le parcours de l’accueil. Pour le point bloquant de navigation : 05.04 puis 05.06. À chaque étape, refaire un exemple et changer une contrainte avant de valider. Utiliser 17.05 pour évaluer les compétences avec un projet, sans attendre de mémoriser toutes les fiches ou tous les frameworks.

Une copie des sources avant modification est conservée dans `sauvegardes/avant-mise-a-jour-2026-09-08.zip`.

## Sources principales

- [Apple — migration vers Observation](https://developer.apple.com/documentation/swiftui/migrating-from-the-observable-object-protocol-to-the-observable-macro).
- [Apple — State](https://developer.apple.com/documentation/swiftui/state) et [Bindable](https://developer.apple.com/documentation/swiftui/bindable).
- [Apple — Demystify SwiftUI](https://developer.apple.com/videos/play/wwdc2021/10022/).
- [Apple — The SwiftUI cookbook for navigation](https://developer.apple.com/videos/play/wwdc2022/10054/).
- [Apple — Understanding the navigation stack](https://developer.apple.com/documentation/swiftui/understanding-the-navigation-stack).
- [Swift.org — Swift 6.2](https://www.swift.org/blog/swift-6.2-released/).
