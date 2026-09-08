# Fiche 03.13 — Human Interface Guidelines : les bases

## Objectif

Connaître les Human Interface Guidelines (HIG) d'Apple : les conventions de design que les recruteurs et les reviewers App Store attendent. Le but est de savoir **respecter la plateforme** et d'en parler, pas de devenir designer.

## 1. C'est quoi les HIG

Les **Human Interface Guidelines** sont le document officiel d'Apple qui décrit comment doivent se comporter et s'afficher les apps iOS. Une app qui « fait du natif » et qui passe la review respecte les HIG. Une app qui les ignore paraît étrangère à iOS et peut être **rejetée**.

Trois grands principes historiques : **Clarté**, **Déférence** (l'UI s'efface devant le contenu), **Profondeur** (hiérarchie et transitions qui situent l'utilisateur).

## 2. Respecter les conventions de la plateforme

La règle d'or : **ne combats pas iOS**, utilise ses patterns.

- Navigation : `NavigationStack` (push/back), `TabView` (sections principales), `.sheet` (tâche modale courte), `.fullScreenCover` (flux qui prend tout l'écran).
- Le geste « swipe pour revenir » et le bouton retour doivent rester naturels (ne les casse pas).
- Réutilise les composants système (`Button`, `Toggle`, `List`, `Menu`) plutôt que de tout réinventer.

Pont UIKit : ce sont les mêmes conventions que tu connais (UINavigationController, UITabBarController, présentation modale), exprimées en SwiftUI.

## 3. Toucher : les zones tactiles

Cible tactile minimale recommandée : **44×44 points**. Un bouton ou une icône cliquable plus petit est frustrant à toucher.

```swift
Button {
    favorite()
} label: {
    Image(systemName: "heart")
}
.frame(minWidth: 44, minHeight: 44) // zone de tap confortable
```

## 4. Lisibilité : Dynamic Type, Dark Mode, contraste

Une app conforme HIG s'adapte aux réglages de l'utilisateur :

- **Dynamic Type** : polices système (`.body`, `.headline`) qui grandissent (voir fiche 03.12).
- **Dark Mode** : couleurs sémantiques (`Color.primary`, `Color(.systemBackground)`) (voir fiche 03.11).
- **Accessibilité** : labels VoiceOver, contraste suffisant (voir fiche 03.12).

Ce ne sont pas des options : ce sont des attentes de base, et des points regardés en review et en entretien.

## 5. SF Symbols

Apple fournit des milliers d'icônes cohérentes avec le système, qui s'adaptent au poids de police, à la taille et à la couleur.

```swift
Image(systemName: "trash")
    .foregroundStyle(.red)
    .imageScale(.large)
```

Utilise SF Symbols plutôt que des icônes custom quand un symbole existe : c'est plus cohérent et gratuit en accessibilité.

## 6. Feedback et états

L'utilisateur doit toujours comprendre ce qui se passe :

- Chargement → `ProgressView` (et tes états loading/empty/error, fiche 02.10).
- Action destructive → confirmation (`.confirmationDialog`, rôle `.destructive`).
- Retour haptique pour les actions importantes (`.sensoryFeedback`).
- Jamais d'écran figé sans indication.

## Points à connaître

- HIG = **respecter la plateforme** : conventions de navigation, composants système, 44pt, Dynamic Type, Dark Mode, SF Symbols.
- Ignorer les HIG = app qui « ne fait pas iOS » + risque de **rejet App Store**.
- Tu appliques déjà une bonne partie des HIG via les fiches dark mode (03.11), accessibilité (03.12) et états d'écran (02.10).
- Les HIG évoluent (ex. nouveaux styles de matériau/navigation selon les versions d'iOS) : on consulte la doc officielle pour les détails fins.

## Exercice

Prends un écran de ton app (ou une maquette) et passe-le en revue HIG : les cibles tactiles font-elles ≥ 44pt ? Le texte suit-il Dynamic Type ? Les couleurs marchent-elles en Dark Mode ? Utilises-tu des composants système et des SF Symbols ? Note ce qui ne respecte pas, corrige-le.

## Question d'entretien

> **« Comment t'assures-tu qu'une app respecte les standards iOS ? »**
> Réponse modèle : « Je suis les Human Interface Guidelines : j'utilise les patterns de navigation natifs (NavigationStack, TabView, sheets), des composants système et des SF Symbols, des cibles tactiles d'au moins 44 points, et je rends l'app accessible — Dynamic Type, Dark Mode, contraste, labels VoiceOver. Concrètement, ça veut dire ne pas combattre la plateforme et tester l'app avec les réglages d'accessibilité activés. »

## Résumé

- Les **HIG** sont les conventions de design officielles d'Apple ; les respecter = app native et review facilitée.
- Principes : clarté, déférence au contenu, profondeur.
- Concret : patterns de navigation natifs, composants système, **44pt** de cible tactile, Dynamic Type, Dark Mode, **SF Symbols**, feedback clair.
- Tu en couvres déjà une bonne part (03.11 dark mode, 03.12 accessibilité, 02.10 états).
- Objectif entretien : montrer que tu **respectes la plateforme** plutôt que de la combattre.
