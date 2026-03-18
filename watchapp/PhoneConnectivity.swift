import Foundation
import WatchConnectivity

class PhoneConnectivity: NSObject, ObservableObject, WCSessionDelegate {
    @Published var familyCode: String?

    private let familyCodeKey = "family_code"

    override init() {
        super.init()
        if WCSession.isSupported() {
            let session = WCSession.default
            session.delegate = self
            session.activate()
        }
        // Load cached family code
        familyCode = UserDefaults.standard.string(forKey: familyCodeKey)
    }

    func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {}

    func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String: Any]) {
        DispatchQueue.main.async {
            if let code = applicationContext["familyCode"] as? String {
                self.familyCode = code
                UserDefaults.standard.set(code, forKey: self.familyCodeKey)
            }
        }
    }

    func session(_ session: WCSession, didReceiveMessage message: [String: Any]) {
        DispatchQueue.main.async {
            if let code = message["familyCode"] as? String {
                self.familyCode = code
                UserDefaults.standard.set(code, forKey: self.familyCodeKey)
            }
        }
    }
}
