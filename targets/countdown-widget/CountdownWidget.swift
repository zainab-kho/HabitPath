// @/targets/countdown-widget/CountdownWidget.swift
// home screen (small, medium) + lock screen (circular, rectangular, inline) countdown widget
import AppIntents
import SwiftUI
import WidgetKit

// ─── timeline ────────────────────────────────────────────────────────────────

struct CountdownEntry: TimelineEntry {
    let date: Date
    let countdown: SharedCountdown?
}

struct CountdownProvider: AppIntentTimelineProvider {
    func placeholder(in context: Context) -> CountdownEntry {
        CountdownEntry(date: Date(), countdown: .sample)
    }

    func snapshot(for configuration: SelectCountdownIntent, in context: Context) async -> CountdownEntry {
        let countdown = resolve(configuration) ?? (context.isPreview ? .sample : nil)
        return CountdownEntry(date: Date(), countdown: countdown)
    }

    // widgets can't run a live clock, so ios is handed a list of moments ahead of time
    // and swaps to the next one on its own, without the app being open.
    // the app also reloads this whenever a countdown changes
    func timeline(for configuration: SelectCountdownIntent, in context: Context) async -> Timeline<CountdownEntry> {
        let countdown = resolve(configuration)
        let now = Date()

        // the card-style widgets show hours and minutes, the others only show days
        let showsMinutes = context.family == .systemMedium || context.family == .systemLarge
        var dates = showsMinutes ? minuteDates(from: now) : midnightDates(from: now)

        // switch to "you did it!" at the exact moment the countdown ends
        if let countdown, let last = dates.last, countdown.targetDate > now, countdown.targetDate < last {
            dates.append(countdown.targetDate)
        }

        let entries = dates.sorted().map { CountdownEntry(date: $0, countdown: countdown) }
        return Timeline(entries: entries, policy: .atEnd)
    }

    // now, then every midnight for the next month. enough for a days-left number
    private func midnightDates(from now: Date) -> [Date] {
        let calendar = Calendar.current
        var dates = [now]
        var midnight = calendar.startOfDay(for: now)

        for _ in 0..<31 {
            guard let next = calendar.date(byAdding: .day, value: 1, to: midnight) else { break }
            midnight = next
            dates.append(midnight)
        }
        return dates
    }

    // now, then the start of every minute for the next 3 hours.
    // when those run out, ios asks for a fresh timeline
    private func minuteDates(from now: Date) -> [Date] {
        let startOfMinute = Date(timeIntervalSince1970: (now.timeIntervalSince1970 / 60).rounded(.down) * 60)
        var dates = [now]

        for minute in 1...180 {
            dates.append(startOfMinute.addingTimeInterval(Double(minute) * 60))
        }
        return dates
    }

    // the countdown picked in Edit Widget — or the soonest one if none was picked (or it was deleted)
    private func resolve(_ configuration: SelectCountdownIntent) -> SharedCountdown? {
        let all = CountdownStore.all()
        if let id = configuration.countdown?.id, let picked = all.first(where: { $0.id == id }) {
            return picked
        }
        let now = Date()
        return all.first { $0.targetDate > now } ?? all.first
    }
}

// ─── widget ──────────────────────────────────────────────────────────────────

struct CountdownWidget: Widget {
    let kind = "CountdownWidget"

    var body: some WidgetConfiguration {
        AppIntentConfiguration(kind: kind, intent: SelectCountdownIntent.self, provider: CountdownProvider()) { entry in
            CountdownWidgetView(entry: entry)
        }
        .configurationDisplayName("Countdown")
        .description("See how many days are left. Long-press → Edit Widget to pick a countdown.")
        .supportedFamilies([
            .systemSmall,
            .systemMedium,
            .systemLarge,
            .accessoryCircular,
            .accessoryRectangular,
            .accessoryInline,
        ])
    }
}

// ─── views ───────────────────────────────────────────────────────────────────

struct CountdownWidgetView: View {
    @Environment(\.widgetFamily) private var family
    let entry: CountdownEntry

    var body: some View {
        content
            // tapping opens the countdown page
            .widgetURL(URL(string: "habitpath://more/countdown"))
    }

    @ViewBuilder
    private var content: some View {
        if let countdown = entry.countdown {
            let days = daysLeft(until: countdown.targetDate, from: entry.date)
            let isDone = countdown.targetDate <= entry.date

            switch family {
            case .accessoryCircular:
                CircularView(countdown: countdown, days: days, isDone: isDone, now: entry.date)
                    .containerBackground(for: .widget) { Color.clear }
            case .accessoryRectangular:
                RectangularView(countdown: countdown, days: days, isDone: isDone)
                    .containerBackground(for: .widget) { Color.clear }
            case .accessoryInline:
                InlineView(countdown: countdown, days: days, isDone: isDone)
                    .containerBackground(for: .widget) { Color.clear }
            case .systemMedium:
                CardView(countdown: countdown, days: days, isDone: isDone, now: entry.date, style: .compact)
                    .containerBackground(for: .widget) { cardColor(countdown) }
            case .systemLarge:
                CardView(countdown: countdown, days: days, isDone: isDone, now: entry.date, style: .full)
                    .containerBackground(for: .widget) { cardColor(countdown) }
            default:
                SmallView(countdown: countdown, days: days, isDone: isDone)
                    .containerBackground(for: .widget) { cardColor(countdown) }
            }
        } else {
            NoCountdownView(family: family)
                .containerBackground(for: .widget) {
                    family.isAccessory ? Color.clear : WidgetColors.defaultCard
                }
        }
    }

    private func cardColor(_ countdown: SharedCountdown) -> Color {
        countdown.color.map(Color.init(hex:)) ?? WidgetColors.defaultCard
    }
}

// the white bordered box from the app's countdown cards
private struct NumberBox: View {
    let value: String
    let size: CGFloat

    var body: some View {
        Text(value)
            .font(.app(size))
            .minimumScaleFactor(0.4)
            .lineLimit(1)
            .foregroundStyle(.black)
            .padding(.horizontal, 10)
            .padding(.vertical, 4)
            .frame(maxWidth: .infinity)
            .background(
                RoundedRectangle(cornerRadius: 12).fill(.white)
            )
            .overlay(
                RoundedRectangle(cornerRadius: 12).stroke(.black, lineWidth: 1)
            )
    }
}

// same look as the habits progress bar: white track, black border, % in the middle
private struct ProgressBarView: View {
    let value: Double
    let isDone: Bool
    var height: CGFloat = 18

    var body: some View {
        GeometryReader { geo in
            ZStack(alignment: .leading) {
                Capsule().fill(.white)
                Capsule()
                    .fill(isDone ? WidgetColors.progressDone : WidgetColors.progress)
                    .frame(width: geo.size.width * value)
                Text("\(isDone ? 100 : Int(value * 100))%")
                    .font(.app(10))
                    .foregroundStyle(.black)
                    .frame(maxWidth: .infinity)
            }
            .clipShape(Capsule())
            .overlay(Capsule().stroke(.black, lineWidth: 1))
        }
        .frame(height: height)
    }
}

private struct SmallView: View {
    let countdown: SharedCountdown
    let days: Int
    let isDone: Bool

    var body: some View {
        VStack(spacing: 6) {
            Text(countdown.title)
                .font(.app(15))
                .lineLimit(2)
                .multilineTextAlignment(.center)
                .foregroundStyle(.black)

            Spacer(minLength: 0)

            if isDone {
                Text("🎉").font(.system(size: 38))
                Text("YOU DID IT!")
                    .font(.app(11))
                    .foregroundStyle(.black)
            } else {
                NumberBox(value: "\(days)", size: 40)
                Text("\(daysLabel(days).uppercased()) LEFT")
                    .font(.app(11))
                    .foregroundStyle(.black)
            }
        }
    }
}

// the medium and large widgets: a copy of the countdown card in the app
// (components/countdown/CountdownCard.tsx), minus the seconds box, since widgets can't update every second.
// medium fits everything on one row of boxes, large uses the same two rows as the app
private struct CardView: View {
    enum Style { case compact, full }

    let countdown: SharedCountdown
    let days: Int
    let isDone: Bool
    let now: Date
    let style: Style

    private var isFull: Bool { style == .full }

    var body: some View {
        let parts = timeParts(until: countdown.targetDate, from: now)

        // same rule as the app: boxes that would only show a leading zero are hidden
        let showMonths = parts.months > 0
        let showDays = showMonths || parts.days > 0
        let showHours = showDays || parts.hours > 0

        VStack(spacing: isFull ? 10 : 4) {
            Text(countdown.title)
                .font(.app(isFull ? 20 : 16))
                .lineLimit(1)
                // keeps a long title from running under the badge
                .padding(.horizontal, 62)
            Text(countdown.targetDate, format: dateFormat)
                .font(.app(isFull ? 12 : 10))
                .opacity(0.7)

            Spacer(minLength: 0)

            if isDone {
                Text("YOU DID IT!").font(.app(isFull ? 20 : 16))
            } else if isFull {
                if showDays {
                    HStack(spacing: 12) {
                        if showMonths { TimeBox(value: parts.months, label: "MONTHS", isLarge: true) }
                        TimeBox(value: parts.days, label: "DAYS", isLarge: true)
                    }
                }
                HStack(spacing: 12) {
                    if showHours { TimeBox(value: parts.hours, label: "HOURS", isLarge: true) }
                    TimeBox(value: parts.minutes, label: "MINUTES", isLarge: true)
                }
            } else {
                HStack(spacing: 10) {
                    if showMonths { TimeBox(value: parts.months, label: "MONTHS", isLarge: false) }
                    if showDays { TimeBox(value: parts.days, label: "DAYS", isLarge: false) }
                    if showHours { TimeBox(value: parts.hours, label: "HOURS", isLarge: false) }
                    TimeBox(value: parts.minutes, label: "MINUTES", isLarge: false)
                }
            }

            Spacer(minLength: 0)

            if countdown.showProgress {
                ProgressBarView(
                    value: progress(of: countdown, at: now),
                    isDone: isDone,
                    height: isFull ? 28 : 18
                )
            }
        }
        .foregroundStyle(.black)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        // the badge floats in the corner so it doesn't push the title off center
        .overlay(alignment: .topTrailing) {
            if !isDone { DaysLeftBadge(days: days) }
        }
    }

    private var dateFormat: Date.FormatStyle {
        countdown.hasTime
            ? .dateTime.month(.abbreviated).day().year().hour().minute()
            : .dateTime.month(.abbreviated).day().year()
    }
}

// one white number box with its label underneath, like the boxes on the app's card
private struct TimeBox: View {
    let value: Int
    let label: String
    let isLarge: Bool

    var body: some View {
        VStack(spacing: isLarge ? 5 : 3) {
            Text("\(value)")
                .font(.app(isLarge ? 24 : 15))
                .minimumScaleFactor(0.6)
                .lineLimit(1)
                .frame(width: isLarge ? 72 : 50, height: isLarge ? 56 : 32)
                .background(RoundedRectangle(cornerRadius: 10).fill(.white))
                .overlay(RoundedRectangle(cornerRadius: 10).stroke(.black, lineWidth: 1))
            Text(label)
                .font(.app(isLarge ? 11 : 9))
                .opacity(0.7)
        }
    }
}

// total days left, in the same yellow and green as the badge on the app's card
private struct DaysLeftBadge: View {
    let days: Int

    var body: some View {
        HStack(spacing: 4) {
            Image(systemName: "calendar")
                .font(.system(size: 9))
                .foregroundStyle(WidgetColors.badgeIcon)
            Text(days == 0 ? "Today" : "\(days) \(daysLabel(days))")
                .font(.app(10))
                .foregroundStyle(.black)
        }
        .padding(.horizontal, 7)
        .padding(.vertical, 3)
        .background(RoundedRectangle(cornerRadius: 8).fill(WidgetColors.badgeBackground))
        .overlay(RoundedRectangle(cornerRadius: 8).stroke(WidgetColors.badgeBorder, lineWidth: 1))
    }
}

// lock screen: ring fills with progress (if on), days in the middle
private struct CircularView: View {
    let countdown: SharedCountdown
    let days: Int
    let isDone: Bool
    let now: Date

    var body: some View {
        if countdown.showProgress {
            Gauge(value: isDone ? 1 : progress(of: countdown, at: now)) {
                EmptyView()
            } currentValueLabel: {
                label
            }
            .gaugeStyle(.accessoryCircularCapacity)
        } else {
            ZStack {
                AccessoryWidgetBackground()
                label
            }
        }
    }

    @ViewBuilder
    private var label: some View {
        if isDone {
            Text("🎉").font(.system(size: 20))
        } else {
            VStack(spacing: -2) {
                Text("\(days)")
                    .font(.app(20))
                    .minimumScaleFactor(0.5)
                    .widgetAccentable()
                Text(daysLabel(days))
                    .font(.app(9))
            }
        }
    }
}

private struct RectangularView: View {
    let countdown: SharedCountdown
    let days: Int
    let isDone: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 1) {
            Text(countdown.title)
                .font(.app(15))
                .lineLimit(1)
                .widgetAccentable()
            if isDone {
                Text("YOU DID IT!")
                    .font(.app(14))
            } else {
                Text("\(days) \(daysLabel(days)) left")
                    .font(.app(14))
            }
            Text(countdown.targetDate, format: .dateTime.month(.abbreviated).day().year())
                .font(.app(12))
                .opacity(0.7)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

// the single line above the clock
private struct InlineView: View {
    let countdown: SharedCountdown
    let days: Int
    let isDone: Bool

    var body: some View {
        if isDone {
            Text("\(countdown.title) is here! 🎉")
        } else {
            Label("\(countdown.title): \(days) \(daysLabel(days))", systemImage: "hourglass")
        }
    }
}

private struct NoCountdownView: View {
    let family: WidgetFamily

    var body: some View {
        switch family {
        case .accessoryInline:
            Text("No countdowns yet")
        case .accessoryCircular:
            ZStack {
                AccessoryWidgetBackground()
                Image(systemName: "hourglass").font(.system(size: 20))
            }
        case .accessoryRectangular:
            VStack(alignment: .leading) {
                Text("No countdowns yet").font(.app(15))
                Text("Add one in HabitPath").font(.app(13))
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        default:
            VStack(spacing: 6) {
                Image(systemName: "hourglass").font(.system(size: 28))
                Text("No countdowns yet")
                    .font(.app(14))
                Text("Add one in HabitPath")
                    .font(.app(12))
                    .opacity(0.7)
            }
            .multilineTextAlignment(.center)
            .foregroundStyle(.black)
        }
    }
}

private extension WidgetFamily {
    var isAccessory: Bool {
        self == .accessoryCircular || self == .accessoryRectangular || self == .accessoryInline
    }
}
