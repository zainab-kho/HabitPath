// @/targets/countdown-widget/CountdownData.swift
// reads the countdown list the app writes (lib/countdown/widgetSync.ts) out of the shared App Group
import AppIntents
import CoreText
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
    // every countdown the app has saved, soonest first.
    // comes back empty if nothing is saved yet or the shared storage can't be opened
    static func all() -> [SharedCountdown] {
        guard
            let defaults = UserDefaults(suiteName: appGroupId),
            let json = defaults.string(forKey: countdownsKey),
            let data = json.data(using: .utf8),
            let rawList = try? JSONSerialization.jsonObject(with: data) as? [Any]
        else { return [] }

        // decoded one at a time, so a single countdown that can't be read doesn't hide the rest
        let countdowns = rawList.compactMap { item -> SharedCountdown? in
            guard let itemData = try? JSONSerialization.data(withJSONObject: item) else { return nil }
            return try? JSONDecoder().decode(SharedCountdown.self, from: itemData)
        }

        return countdowns.sorted { $0.targetMs < $1.targetMs }
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

// the time left, split into the boxes the card-style widgets show.
// calendar does the same real-month math as getCountdownParts in the app
struct TimeParts {
    let months: Int
    let days: Int
    let hours: Int
    let minutes: Int
}

func timeParts(until target: Date, from now: Date) -> TimeParts {
    guard target > now else { return TimeParts(months: 0, days: 0, hours: 0, minutes: 0) }

    let parts = Calendar.current.dateComponents([.month, .day, .hour, .minute], from: now, to: target)
    return TimeParts(
        months: max(0, parts.month ?? 0),
        days: max(0, parts.day ?? 0),
        hours: max(0, parts.hour ?? 0),
        minutes: max(0, parts.minute ?? 0)
    )
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

// ─── font ────────────────────────────────────────────────────────────────────
// the app's body font (apercu medium, the same one globalStyles.body uses).
// the font file sits in this folder so it gets bundled with the widget

enum AppFont {
    // the font's internal name, not its file name
    static let name = "ApercuPro-Medium"
    private static let fileName = "apercu_medium_pro"

    // widgets can't see the fonts the app loads, so the widget registers its own copy.
    // a static let only ever runs once, no matter how many times register() is called
    private static let isRegistered: Bool = {
        guard let url = Bundle.main.url(forResource: fileName, withExtension: "otf") else { return false }
        return CTFontManagerRegisterFontsForURL(url as CFURL, .process, nil)
    }()

    static func register() {
        _ = isRegistered
    }
}

extension Font {
    // the app font at a given size. if the font can't be loaded, ios falls back to its own font
    static func app(_ size: CGFloat) -> Font {
        AppFont.register()
        return .custom(AppFont.name, fixedSize: size)
    }
}

// ─── colors ──────────────────────────────────────────────────────────────────

enum WidgetColors {
    static let defaultCard = Color(hex: "#ff6868")   // PAGE.countdown.primary[0]
    static let progress = Color(hex: "#9BDEAC")      // COLORS.Primary
    static let progressDone = Color(hex: "#F682A4")  // COLORS.PrimaryLight
    static let badgeBackground = Color(hex: "#E4E986") // COLORS.RewardsBackground
    static let badgeBorder = Color(hex: "#7FD1AE")     // COLORS.RewardsAccent
    static let badgeIcon = Color(hex: "#FF7F50")       // COLORS.Rewards
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
