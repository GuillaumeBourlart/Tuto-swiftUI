export const learningStages = [
  { title: "1. Passer du raisonnement UIKit à SwiftUI", goal: "Expliquer ce qui change et construire un premier écran.", slugs: ["00-00", "00-08", "01-01", "01-02", "01-03", "01-04", "01-05", "01-06", "01-07", "01-08"] },
  { title: "2. Maîtriser l’état et les échanges entre vues", goal: "Choisir qui possède les données et qui peut les modifier.", slugs: ["02-01", "02-02", "02-03", "02-12", "02-11", "02-07", "02-10", "03-01", "03-07", "03-08"] },
  { title: "3. Comprendre et pratiquer la navigation", goal: "Relier un état à une pile, une modale ou un changement de racine.", slugs: ["05-01", "05-04", "05-02", "05-03", "05-05", "05-06"] },
  { title: "4. Construire une fonctionnalité complète", goal: "Afficher une API avec chargement, erreurs, annulation et persistance.", slugs: ["06-01", "06-02", "06-03", "07-01", "07-02", "07-03", "07-04", "07-07", "07-08", "09-01", "02-08", "09-05"] },
  { title: "5. Être à l’aise dans une équipe iOS", goal: "Lire l’existant, tester et expliquer une livraison concrète.", slugs: ["02-04", "02-05", "02-06", "13-01", "13-02", "03-12", "14-01", "14-02", "14-05", "15-01", "15-06", "16-02", "16-06", "17-03", "17-05"] },
];
export const learningPath = learningStages.flatMap(stage => stage.slugs);
