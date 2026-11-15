// @/targets/countdown-widget/CountdownData.swift
// reads the countdown list the app writes (lib/countdown/widgetSync.ts) out of the shared App Group
import AppIntents
import Foundation
import SwiftUI

let appGroupId = "group.com.zainabkho.habitpath"
let countdownsKey = "countdowns"

// one countdown, exactly as widgetSync.ts writes it
struct SharedCountdown: Codable, Identifiable, Hashable {
    let id: String
    let title: String
    let targetMs: Double     // ms since 1970, like JS Date.getTime()
    let createdMs: Double
    let hasTime: Bool
    let color: String?       // "#RRGGBB" — nil = default countdown pink
    let showProgress: Bool

    var targetDate: Date { Date(timeIntervalSince1970: targetMs / 1000) }
    var createdDate: Date { Date(timeIntervalSince1970: createdMs / 1000) }

    // shown in the widget gallery before any real countdown exists
    static let sample = SharedCountdown(
        id: "sample",
        title: "Graduation",
        targetMs: (Date().timeIntervalSince1970 + 175 * 86400) * 1000,
        createdMs: (Date().timeIntervalSince1970 - 60 * 86400) * 1000,
        hasTime: false,
        color: "#FFD581",
        showProgress: true
    )
}

enum CountdownStore {
    // soonest first
    static func all() -> [SharedCountdown] {
        load().countdowns
    }

    // what the widget saw — shown under "No countdowns yet" in debug builds
    static func debugStatus() -> String {
        load().status
    }

    private static func load() -> (countdowns: [SharedCountdown], status: String) {
        guard let defaults = UserDefaults(suiteName: appGroupId) else {
            return ([], "no access to \(appGroupId)")
        }
        // the app stores a JSON string; accept raw Data too just in case
        let data: Data
        if let json = defaults.string(forKey: countdownsKey), let d = json.data(using: .utf8) {
            data = d
        } else if let d = defaults.data(forKey: countdownsKey) {
            data = d
        } else {
            let keys = defaults.dictionaryRepresentation().keys.filter { !$0.hasPrefix("Apple") && !$0.hasPrefix("NS") }
            return ([], "key '\(countdownsKey)' not found (keys: \(keys.sorted().joined(separator: ",")))")
        }

        // decode one at a time so a single bad entry can't hide the rest
        guard let raw = try? JSONSerialization.jsonObject(with: data) as? [Any] else {
            return ([], "not a JSON list (\(data.count) bytes)")
        }
        var list: [SharedCountdown] = []
        var lastError = ""
        for item in raw {
            do {
                let itemData = try JSONSerialization.data(withJSONObject: item)
                list.append(try JSONDecoder().decode(SharedCountdown.self, from: itemData))
            } catch {
                lastError = "\(error)"
            }
        }
        let status = lastError.isEmpty
            ? "read \(list.count) of \(raw.count)"
            : "read \(list.count) of \(raw.count) — \(lastError.prefix(120))"
        return (list.sorted { $0.targetMs < $1.targetMs }, status)
    }
}

// ─── math (mirrors lib/countdown/countdownMath.ts) ───────────────────────────

// whole calendar days left — flips at midnight, same as the app's badge + notifications
func daysLeft(until target: Date, from now: Date) -> Int {
    let calendar = Calendar.current
    let days = calendar.dateComponents(
        [.day],
        from: calendar.startOfDay(for: now),
        to: calendar.startOfDay(for: target)
    ).day ?? 0
    return max(0, days)
}

// 0...1, from the day the countdown was created to its target
func progress(of countdown: SharedCountdown, at now: Date) -> Double {
    let total = countdown.targetDate.timeIntervalSince(countdown.createdDate)
    guard total > 0 else { return 1 }
    return min(1, max(0, now.timeIntervalSince(countdown.createdDate) / total))
}

func daysLabel(_ days: Int) -> String {
    days == 1 ? "day" : "days"
}

// ─── picking a countdown (long-press → Edit Widget) ──────────────────────────

struct CountdownEntity: AppEntity {
    let id: String
    let title: String

    static var typeDisplayRepresentation: TypeDisplayRepresentation { "Countdown" }
    static var defaultQuery: CountdownQuery { CountdownQuery() }

    var displayRepresentation: DisplayRepresentation {
        DisplayRepresentation(title: "\(title)")
    }

    init(_ countdown: SharedCountdown) {
        id = countdown.id
        title = countdown.title
    }
}

struct CountdownQuery: EntityQuery {
    func entities(for identifiers: [String]) async throws -> [CountdownEntity] {
        CountdownStore.all()
            .filter { identifiers.contains($0.id) }
            .map(CountdownEntity.init)
    }

    func suggestedEntities() async throws -> [CountdownEntity] {
        CountdownStore.all().map(CountdownEntity.init)
    }

    // a freshly added widget shows the soonest upcoming countdown
    func defaultResult() async -> CountdownEntity? {
        let now = Date()
        let list = CountdownStore.all()
        return (list.first { $0.targetDate > now } ?? list.first).map(CountdownEntity.init)
    }
}

struct SelectCountdownIntent: WidgetConfigurationIntent {
    static var title: LocalizedStringResource { "Choose Countdown" }

    @Parameter(title: "Countdown")
    var countdown: CountdownEntity?
}

// ─── colors ──────────────────────────────────────────────────────────────────

enum WidgetColors {
    static let defaultCard = Color(hex: "#ff6868")   // PAGE.countdown.primary[0]
    static let progress = Color(hex: "#9BDEAC")      // COLORS.Primary
    static let progressDone = Color(hex: "#F682A4")  // COLORS.PrimaryLight
}

extension Color {
    init(hex: String) {
        var value = hex.trimmingCharacters(in: .whitespaces).replacingOccurrences(of: "#", with: "")
        if value.count == 8 { value = String(value.prefix(6)) } // drop alpha
        var rgb: UInt64 = 0
        Scanner(string: value).scanHexInt64(&rgb)
        self.init(
            red: Double((rgb >> 16) & 0xFF) / 255,
            green: Double((rgb >> 8) & 0xFF) / 255,
            blue: Double(rgb & 0xFF) / 255
        )
    }
}
