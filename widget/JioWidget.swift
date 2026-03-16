import WidgetKit
import SwiftUI
import AppIntents

// MARK: - Shared Data
struct WidgetData: Codable {
    let lastFeedingTime: Double?
    let lastFeedingAmount: Int?
    let todayCount: Int
    let todayTotal: Int
    let defaultMl: Int
    let timerEnd: Double?
}

func loadWidgetData() -> WidgetData {
    let defaults = UserDefaults(suiteName: "group.com.kimmin.parentingjio")
    guard let jsonString = defaults?.string(forKey: "widgetData"),
          let data = jsonString.data(using: .utf8),
          let decoded = try? JSONDecoder().decode(WidgetData.self, from: data)
    else {
        return WidgetData(
            lastFeedingTime: nil,
            lastFeedingAmount: nil,
            todayCount: 0,
            todayTotal: 0,
            defaultMl: 120,
            timerEnd: nil
        )
    }
    return decoded
}

// MARK: - Record Intent (Interactive Button)
struct RecordFeedingIntent: AppIntent {
    static var title: LocalizedStringResource = "분유 기록"
    static var description: IntentDescription = "지오 분유를 기록합니다"

    func perform() async throws -> some IntentResult {
        let defaults = UserDefaults(suiteName: "group.com.kimmin.parentingjio")
        let data = loadWidgetData()

        // Create new record
        let now = Date().timeIntervalSince1970 * 1000
        let record: [String: Any] = [
            "id": "\(Int(now))",
            "timestamp": now,
            "amount": data.defaultMl
        ]

        // Load existing records
        var records: [[String: Any]] = []
        if let jsonString = defaults?.string(forKey: "feeding_records"),
           let jsonData = jsonString.data(using: .utf8),
           let decoded = try? JSONSerialization.jsonObject(with: jsonData) as? [[String: Any]] {
            records = decoded
        }
        records.insert(record, at: 0)

        // Save records
        if let encoded = try? JSONSerialization.data(withJSONObject: records),
           let jsonString = String(data: encoded, encoding: .utf8) {
            defaults?.set(jsonString, forKey: "feeding_records")
        }

        // Update widget data
        let updatedData = WidgetData(
            lastFeedingTime: now,
            lastFeedingAmount: data.defaultMl,
            todayCount: data.todayCount + 1,
            todayTotal: data.todayTotal + data.defaultMl,
            defaultMl: data.defaultMl,
            timerEnd: data.timerEnd
        )
        if let encoded = try? JSONEncoder().encode(updatedData),
           let jsonString = String(data: encoded, encoding: .utf8) {
            defaults?.set(jsonString, forKey: "widgetData")
        }

        WidgetCenter.shared.reloadAllTimelines()
        return .result()
    }
}

// MARK: - Timeline
struct JioEntry: TimelineEntry {
    let date: Date
    let data: WidgetData
}

struct JioProvider: TimelineProvider {
    func placeholder(in context: Context) -> JioEntry {
        JioEntry(date: .now, data: WidgetData(
            lastFeedingTime: nil, lastFeedingAmount: nil,
            todayCount: 0, todayTotal: 0, defaultMl: 120, timerEnd: nil
        ))
    }

    func getSnapshot(in context: Context, completion: @escaping (JioEntry) -> Void) {
        completion(JioEntry(date: .now, data: loadWidgetData()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<JioEntry>) -> Void) {
        let entry = JioEntry(date: .now, data: loadWidgetData())
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 15, to: .now)!
        completion(Timeline(entries: [entry], policy: .after(nextUpdate)))
    }
}

// MARK: - Widget View
struct JioWidgetView: View {
    let entry: JioEntry

    var timeAgoText: String {
        guard let last = entry.data.lastFeedingTime else { return "기록 없음" }
        let lastDate = Date(timeIntervalSince1970: last / 1000)
        let diff = Int(Date().timeIntervalSince(lastDate) / 60)
        if diff < 1 { return "방금 전" }
        if diff < 60 { return "\(diff)분 전" }
        let hr = diff / 60
        if hr < 24 { return "\(hr)시간 전" }
        return "\(hr / 24)일 전"
    }

    var body: some View {
        VStack(spacing: 12) {
            // Header
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text("지오 분유")
                        .font(.system(size: 15, weight: .bold))
                        .foregroundColor(.primary)
                    Text("마지막: \(timeAgoText)")
                        .font(.system(size: 12))
                        .foregroundColor(.secondary)
                }
                Spacer()
                VStack(alignment: .trailing, spacing: 2) {
                    Text("\(entry.data.todayCount)회")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundColor(.secondary)
                    Text("\(entry.data.todayTotal)ml")
                        .font(.system(size: 13, weight: .bold))
                        .foregroundColor(.blue)
                }
            }

            // Record Button
            Button(intent: RecordFeedingIntent()) {
                HStack {
                    Image(systemName: "plus.circle.fill")
                        .font(.system(size: 18))
                    Text("\(entry.data.defaultMl)ml 기록")
                        .font(.system(size: 15, weight: .bold))
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 10)
                .background(Color.blue)
                .foregroundColor(.white)
                .cornerRadius(12)
            }
            .buttonStyle(.plain)
        }
        .padding(16)
    }
}

// MARK: - Widget Definition
struct JioWidget: Widget {
    let kind = "JioWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: JioProvider()) { entry in
            JioWidgetView(entry: entry)
                .containerBackground(.fill.tertiary, for: .widget)
        }
        .configurationDisplayName("지오 분유")
        .description("분유 기록을 바로 할 수 있어요")
        .supportedFamilies([.systemMedium])
    }
}

// MARK: - Widget Bundle
@main
struct JioWidgetBundle: WidgetBundle {
    var body: some Widget {
        JioWidget()
    }
}
