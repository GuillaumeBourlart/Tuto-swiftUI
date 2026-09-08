# Fiche 12.03 — Localisation simple

## Objectif

Comprendre comment demander la localisation et récupérer la position actuelle de l’utilisateur.

C’est utile pour une carte, une recherche autour de soi, une app de proximité ou une fonctionnalité géolocalisée.

## 1. Permission Info.plist

Pour utiliser la localisation, il faut ajouter une description dans `Info.plist`.

```text
NSLocationWhenInUseUsageDescription
```

Exemple :

```text
Nous utilisons votre position pour afficher les lieux proches de vous.
```

## 2. LocationManager simple

```swift
import CoreLocation
import SwiftUI

@MainActor
final class LocationManager: NSObject, ObservableObject {
    @Published var location: CLLocation?
    @Published var authorizationStatus: CLAuthorizationStatus = .notDetermined
    
    private let manager = CLLocationManager()
    
    override init() {
        super.init()
        manager.delegate = self
        manager.desiredAccuracy = kCLLocationAccuracyBest
    }
    
    func requestPermission() {
        manager.requestWhenInUseAuthorization()
    }
    
    func requestLocation() {
        manager.requestLocation()
    }
}
```

## 3. Delegate CLLocationManager

```swift
extension LocationManager: CLLocationManagerDelegate {
    func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        authorizationStatus = manager.authorizationStatus
        
        if manager.authorizationStatus == .authorizedWhenInUse ||
           manager.authorizationStatus == .authorizedAlways {
            manager.requestLocation()
        }
    }
    
    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        location = locations.last
    }
    
    func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        print("Location error: \(error)")
    }
}
```

## 4. Utilisation dans SwiftUI

```swift
struct NearbyView: View {
    @StateObject private var locationManager = LocationManager()
    
    var body: some View {
        VStack(spacing: AppSpacing.medium) {
            if let location = locationManager.location {
                Text("Latitude: \(location.coordinate.latitude)")
                Text("Longitude: \(location.coordinate.longitude)")
            } else {
                Text("Position non disponible")
            }
            
            Button("Autoriser la localisation") {
                locationManager.requestPermission()
            }
            
            Button("Récupérer ma position") {
                locationManager.requestLocation()
            }
        }
        .padding()
    }
}
```

## 5. Gérer les refus

```swift
switch locationManager.authorizationStatus {
case .denied, .restricted:
    Text("La localisation est désactivée. Vous pouvez l’activer dans les réglages.")
case .authorizedWhenInUse, .authorizedAlways:
    Text("Localisation autorisée")
default:
    Text("Permission non demandée")
}
```

## 6. Cas d’usage

La localisation peut servir à :

- afficher des éléments proches ;
- centrer une carte ;
- vérifier une distance ;
- trier des résultats par proximité ;
- déclencher une logique liée à un lieu.

## Résumé

- La localisation nécessite une clé `Info.plist`.
- `CLLocationManager` demande la permission et récupère la position.
- Le delegate remonte les changements d’autorisation et de position.
- En SwiftUI, on encapsule souvent ça dans un `ObservableObject`.
- Il faut gérer le refus utilisateur proprement.
