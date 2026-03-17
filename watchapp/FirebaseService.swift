import Foundation

struct FeedingRecord: Codable, Identifiable {
    let id: String
    let timestamp: Double
    let amount: Int
}

actor FirebaseService {
    static let shared = FirebaseService()

    private let apiKey = "AIzaSyDk40EB9Dp7MuoOO2ih6KpSNvc7cUQcBKg"
    private let dbURL = "https://parenting-jio-default-rtdb.firebaseio.com"

    private var idToken: String?
    private var tokenExpiry: Date?

    // MARK: - Anonymous Auth

    private func ensureAuth() async throws {
        if let token = idToken, let expiry = tokenExpiry, Date() < expiry {
            return
        }

        let url = URL(string: "https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=\(apiKey)")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONSerialization.data(withJSONObject: ["returnSecureToken": true])

        let (data, _) = try await URLSession.shared.data(for: request)
        let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]

        guard let token = json?["idToken"] as? String else {
            throw FirebaseError.authFailed
        }

        self.idToken = token
        self.tokenExpiry = Date().addingTimeInterval(3000)
    }

    // MARK: - Record Feeding

    func recordFeeding(familyCode: String, amount: Int) async throws {
        try await ensureAuth()

        let now = Date().timeIntervalSince1970 * 1000
        let shortUUID = UUID().uuidString.prefix(7)
        let recordId = "\(Int(now))-\(shortUUID)-watch"

        let record: [String: Any] = [
            "id": recordId,
            "timestamp": now,
            "amount": amount
        ]

        let url = URL(string: "\(dbURL)/families/\(familyCode)/records/\(recordId).json?auth=\(idToken!)")!
        var request = URLRequest(url: url)
        request.httpMethod = "PUT"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONSerialization.data(withJSONObject: record)

        let (_, response) = try await URLSession.shared.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
            throw FirebaseError.writeFailed
        }
    }

    // MARK: - Fetch Today's Records

    func fetchTodayRecords(familyCode: String) async throws -> [FeedingRecord] {
        try await ensureAuth()

        let url = URL(string: "\(dbURL)/families/\(familyCode)/records.json?auth=\(idToken!)")!
        let (data, _) = try await URLSession.shared.data(from: url)

        guard let json = try JSONSerialization.jsonObject(with: data) as? [String: [String: Any]] else {
            return []
        }

        let calendar = Calendar.current
        let todayStart = calendar.startOfDay(for: Date()).timeIntervalSince1970 * 1000

        return json.compactMap { (_, value) -> FeedingRecord? in
            guard let id = value["id"] as? String,
                  let timestamp = value["timestamp"] as? Double,
                  let amount = value["amount"] as? Int,
                  timestamp >= todayStart
            else { return nil }
            return FeedingRecord(id: id, timestamp: timestamp, amount: amount)
        }.sorted { $0.timestamp > $1.timestamp }
    }

    enum FirebaseError: Error {
        case authFailed
        case writeFailed
    }
}
