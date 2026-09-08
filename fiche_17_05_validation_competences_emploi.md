# Fiche 17.05 — Vérifier ses compétences avant de candidater

## Objectif

Transformer tes acquis UIKit et ton apprentissage SwiftUI en preuves concrètes. Cette grille sert à préparer un projet et des entretiens ; elle ne promet ni délai de recrutement ni niveau identique dans toutes les entreprises.

## 1. Ce que tu dois pouvoir montrer

| Compétence | Preuve pratique | Question à laquelle répondre |
|---|---|---|
| Interface et composition | Liste, détail, formulaire réutilisable | Pourquoi ces vues sont-elles séparées ? |
| État | Source de vérité, édition, brouillon annulable | Qui possède la donnée et qui l’écrit ? |
| Identité | Liste avec IDs stables, état préservé | Pourquoi le champ perd-il son texte dans ce `if` ? |
| Navigation | Stack typée, sheet, retour racine, onglets | Quelle différence entre booléen, optional et path ? |
| Concurrence | Chargement, recherche annulable, pas de résultat périmé | Que fait réellement `.task(id:)` ? |
| Réseau | Service injectable, décodage et erreurs HTTP | Où sont les règles métier et les erreurs ? |
| Stockage | Favoris conservés après relancement | Qu’est-ce qui vit en mémoire, sur disque et au serveur ? |
| Tests | Succès, vide, échec et un cas d’annulation pertinents | Que vérifies-tu sans interface ni réseau réel ? |
| UIKit/SwiftUI | Petit écran UIKit intégré ou écran SwiftUI hébergé | Comment migrer progressivement une app existante ? |
| Qualité | Dynamic Type, VoiceOver, aucun secret dans Git | Comment vérifier le comportement, pas seulement l’apparence ? |
| Travail d’équipe | README, commits lisibles et revue d’un changement | Comment expliquer tes décisions et leurs limites ? |

Les tests unitaires portent d’abord sur les règles, services et modèles de présentation. Tester « un booléen devient true quand on lui affecte true » n’apporte pas la même confiance qu’un scénario d’annulation ou de décodage. Les tests de navigation visuelle utilisent le simulateur et, si nécessaire, les tests UI XCTest.

## 2. Projet raisonnable à présenter

Reprends le projet fil rouge de 17.03 ou un écran d’une app client dont tu peux légalement réutiliser le concept. Un carnet, un catalogue ou un suivi d’activités suffit : liste depuis une API, recherche, détail, favoris persistants et édition locale annulable.

Garde le périmètre maîtrisable. Un backend d’authentification complet, Firebase, Supabase, TCA, une synchronisation hors ligne et une CI complexe ne sont pas tous nécessaires pour prouver que tu sais développer une fonctionnalité SwiftUI.

Dans le README du projet, indique la cible iOS, le Xcode utilisé, les étapes de lancement, les fonctionnalités, les cas d’erreur, les choix d’état/navigation, les tests exécutés et les limites connues. Ajoute quelques captures et une courte démonstration si cela aide à comprendre.

## 3. Mise en situation de 60 à 90 minutes

Sans recopier le cours, réalise une liste de clients locale. Un tap ouvre le détail ; une sheet édite le nom ; Annuler abandonne les changements ; Retour conserve le bon état ; un nom vide ne peut pas être enregistré.

Puis remplace le chargement local par un faux service asynchrone injectable avec succès, vide et erreur. Explique comment tu l’annulerais et où tu placerais un test. Le temps est un cadre d’exercice, pas un seuil universel de recrutement.

## 4. Auto-évaluation honnête

Pour chaque ligne de la grille, note une des formulations suivantes dans tes notes :

- **Je sais le refaire et l’expliquer** : garde un lien vers le fichier ou le test qui le montre.
- **Je sais avec la documentation** : identifie la décision qui te demande encore une vérification.
- **Je ne sais pas encore le déboguer** : crée un exercice précis et marque la fiche correspondante À revoir.

Tu n’as pas besoin de mémoriser toutes les API. Tu dois savoir raisonner, lire l’existant, vérifier une disponibilité et corriger un comportement incohérent.

## 5. Valoriser ton expérience UIKit

Prépare un récit concret : « J’ai déjà livré telle fonctionnalité en UIKit. En SwiftUI, j’ai conservé le service et les modèles, déplacé l’état à tel endroit, remplacé tel push par une route et vérifié ces comportements. » Sépare ce que tu as réellement livré de ce que tu as réalisé en exercice.

Lis ensuite les offres qui t’intéressent et repère les écarts récurrents dans leurs exigences. Utilise les parties complémentaires du cours pour les combler. Sans échantillon d’offres précises, on ne peut pas affirmer que chaque outil du dossier est demandé par les employeurs.

## Exercice final

Présente ton projet pendant cinq minutes, puis réponds sans notes :

1. Pourquoi l’UI change-t-elle après une mutation d’état ?
2. Pourquoi `@Observable` ne remplace-t-il pas la gestion de durée de vie ?
3. Pourquoi une sheet d’édition utilise-t-elle un brouillon ?
4. Comment une URL choisit-elle un onglet et sa pile sans dupliquer les écrans ?
5. Comment diagnostiques-tu un résultat réseau périmé ?
6. Qu’as-tu conservé de ton ancienne implémentation UIKit ?

## Pour valider cette fiche

Tu disposes d’un projet lançable, d’une explication claire, de tests pertinents et d’une liste de limites connues. Les fiches lues deviennent ainsi un support de pratique et une référence pendant la recherche d’emploi.
