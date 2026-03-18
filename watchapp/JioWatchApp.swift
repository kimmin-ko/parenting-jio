import SwiftUI

@main
struct JioWatchApp: App {
    @StateObject private var connectivity = PhoneConnectivity()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(connectivity)
        }
    }
}
