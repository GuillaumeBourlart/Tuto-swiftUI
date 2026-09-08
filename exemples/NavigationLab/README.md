# Atelier NavigationLab

Dans Xcode 26.6 : File → New → Project → iOS App, interface SwiftUI, langage Swift. Cible iOS 17 minimum. Remplacer le fichier `ContentView.swift` généré par celui de ce dossier, puis lancer sur un simulateur. Garder l'unique fichier `App` généré par Xcode : il affiche déjà `ContentView()`.

Le code est autonome, sans dépendance, compte, réseau ou configuration de signature particulière pour le simulateur. La connexion et les données sont simulées et disparaissent avec la branche d'interface ou le processus. Suivre les manipulations et leurs résultats attendus dans la fiche 05.06 du cours.

Vérification automatisée depuis la racine du cours : `python3 scripts/verifier_exemples.py`. Il s'agit d'une vérification des types Swift avec le SDK iOS du Xcode installé, pas d'un test d'interaction sur simulateur.
