import SwiftUI

struct ContentView: View {
    @EnvironmentObject var connectivity: PhoneConnectivity

    @State private var todayCount = 0
    @State private var todayTotal = 0
    @State private var lastFeedingTime: Date?
    @State private var isRecording = false
    @State private var showSuccess = false
    @State private var defaultMl = 120

    private let firebase = FirebaseService.shared

    var timeAgoText: String {
        guard let last = lastFeedingTime else { return "기록 없음" }
        let diff = Int(Date().timeIntervalSince(last) / 60)
        if diff < 1 { return "방금 전" }
        if diff < 60 { return "\(diff)분 전" }
        let hr = diff / 60
        if hr < 24 { return "\(hr)시간 전" }
        return "\(hr / 24)일 전"
    }

    var body: some View {
        if let familyCode = connectivity.familyCode {
            VStack(spacing: 8) {
                // Stats
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("지오 분유")
                            .font(.system(size: 14, weight: .bold))
                        Text(timeAgoText)
                            .font(.system(size: 11))
                            .foregroundColor(.secondary)
                    }
                    Spacer()
                    VStack(alignment: .trailing, spacing: 2) {
                        Text("\(todayCount)회")
                            .font(.system(size: 12, weight: .semibold))
                        Text("\(todayTotal)ml")
                            .font(.system(size: 12, weight: .bold))
                            .foregroundColor(.blue)
                    }
                }

                // Record Button
                Button {
                    record(familyCode: familyCode)
                } label: {
                    HStack {
                        if isRecording {
                            ProgressView()
                                .tint(.white)
                        } else if showSuccess {
                            Image(systemName: "checkmark.circle.fill")
                            Text("완료!")
                        } else {
                            Image(systemName: "plus.circle.fill")
                            Text("\(defaultMl)ml 기록")
                        }
                    }
                    .font(.system(size: 15, weight: .bold))
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 10)
                    .background(showSuccess ? Color.green : Color.blue)
                    .foregroundColor(.white)
                    .cornerRadius(12)
                }
                .buttonStyle(.plain)
                .disabled(isRecording)
            }
            .padding(.horizontal, 4)
            .task {
                await fetchData(familyCode: familyCode)
            }
        } else {
            VStack(spacing: 8) {
                Image(systemName: "iphone.and.arrow.forward")
                    .font(.system(size: 28))
                    .foregroundColor(.secondary)
                Text("iPhone 앱에서\n가족 코드를 설정하세요")
                    .font(.system(size: 13))
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
            }
        }
    }

    private func record(familyCode: String) {
        isRecording = true
        Task {
            do {
                try await firebase.recordFeeding(familyCode: familyCode, amount: defaultMl)
                todayCount += 1
                todayTotal += defaultMl
                lastFeedingTime = Date()
                showSuccess = true
                WKInterfaceDevice.current().play(.success)
                try? await Task.sleep(nanoseconds: 1_500_000_000)
                showSuccess = false
            } catch {
                WKInterfaceDevice.current().play(.failure)
            }
            isRecording = false
        }
    }

    private func fetchData(familyCode: String) async {
        do {
            let records = try await firebase.fetchTodayRecords(familyCode: familyCode)
            todayCount = records.count
            todayTotal = records.reduce(0) { $0 + $1.amount }
            if let latest = records.first {
                lastFeedingTime = Date(timeIntervalSince1970: latest.timestamp / 1000)
            }
        } catch {
            // Silently fail
        }
    }
}
