# Fiche 12.04 — Notifications locales et ouverture des réglages

## Objectif

Comprendre comment demander l’autorisation des notifications locales, programmer une notification simple et ouvrir les réglages de l’app.

## 1. Notifications locales vs push

Notification locale : créée par l’app sur le téléphone.

Notification push : envoyée depuis un serveur via APNs/FCM.

```text
Locale → rappel, timer, notification interne
Push → message serveur, événement distant, update compte
```

## 2. Demander la permission

```swift
import UserNotifications

final class LocalNotificationService {
    func requestAuthorization() async -> Bool {
        do {
            return try await UNUserNotificationCenter.current().requestAuthorization(
                options: [.alert, .sound, .badge]
            )
        } catch {
            return false
        }
    }
}
```

## 3. Programmer une notification simple

```swift
func scheduleNotification() async throws {
    let content = UNMutableNotificationContent()
    content.title = "Rappel"
    content.body = "N’oublie pas de revenir dans l’app."
    content.sound = .default
    
    let trigger = UNTimeIntervalNotificationTrigger(
        timeInterval: 10,
        repeats: false
    )
    
    let request = UNNotificationRequest(
        identifier: UUID().uuidString,
        content: content,
        trigger: trigger
    )
    
    try await UNUserNotificationCenter.current().add(request)
}
```

Cette notification s’affiche après 10 secondes.

## 4. ViewModel simple

```swift
@MainActor
final class NotificationSettingsViewModel: ObservableObject {
    @Published var message: String?
    
    private let service = LocalNotificationService()
    
    func enableNotifications() async {
        let granted = await service.requestAuthorization()
        message = granted ? "Notifications activées" : "Notifications refusées"
    }
}
```

## 5. Ouvrir les réglages de l’app

Si l’utilisateur refuse les notifications, iOS ne réaffiche pas toujours la popup.

Tu peux proposer d’ouvrir les réglages.

```swift
import UIKit

func openAppSettings() {
    guard let url = URL(string: UIApplication.openSettingsURLString) else { return }
    UIApplication.shared.open(url)
}
```

## 6. Vue SwiftUI

```swift
struct NotificationSettingsView: View {
    @StateObject private var viewModel = NotificationSettingsViewModel()
    
    var body: some View {
        VStack(spacing: AppSpacing.medium) {
            Button("Activer les notifications") {
                Task { await viewModel.enableNotifications() }
            }
            
            Button("Ouvrir les réglages") {
                openAppSettings()
            }
            
            if let message = viewModel.message {
                Text(message)
                    .foregroundStyle(AppColors.textSecondary)
            }
        }
        .padding()
    }
}
```

## 7. Point important

Il faut éviter de demander les notifications sans contexte.

Meilleur scénario :

```text
L’utilisateur active une fonctionnalité de rappel
→ l’app explique pourquoi
→ puis demande la permission
```

## Résumé

- Une notification locale est créée par l’app sur l’appareil.
- Une notification push vient d’un serveur via APNs/FCM.
- Il faut demander l’autorisation avec `UNUserNotificationCenter`.
- Une notification locale a un content, un trigger et une request.
- Si l’utilisateur refuse, on peut proposer d’ouvrir les réglages.
