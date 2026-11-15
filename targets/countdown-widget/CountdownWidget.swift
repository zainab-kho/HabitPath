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

    // hands iOS the next month of midnights up front — the number ticks down on its own,
    // no app launch needed. the app also reloads this whenever a countdown changes.
    func timeline(for configuration: SelectCountdownIntent, in context: Context) async -> Timeline<CountdownEntry> {
        let countdown = resolve(configuration)
        let now = Date()
        let calendar = Calendar.current

        var dates = [now]
        var midnight = calendar.startOfDay(for: now)
        for _ in 0..<31 {
            guard let next = calendar.date(byAdding: .day, value: 1, to: midnight) else { break }
            midnight = next
            dates.append(midnight)
        }
        // flip to "You did it!" at the exact moment when a time was set
        if let countdown, countdown.hasTime, countdown.targetDate > now, countdown.targetDate < midnight {
            dates.append(countdown.targetDate)
        }

        let entries = dates.sorted().map { CountdownEntry(date: $0, countdown: countdown) }
        return Timeline(entries: entries, policy: .atEnd)
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
                MediumView(countdown: countdown, days: days, isDone: isDone, now: entry.date)
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
            .font(.system(size: size, weight: .bold, design: .rounded))
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

    var body: some View {
        GeometryReader { geo in
            ZStack(alignment: .leading) {
                Capsule().fill(.white)
                Capsule()
                    .fill(isDone ? WidgetColors.progressDone : WidgetColors.progress)
                    .frame(width: geo.size.width * value)
                Text("\(isDone ? 100 : Int(value * 100))%")
                    .font(.system(size: 10, weight: .semibold, design: .rounded))
                    .foregroundStyle(.black)
                    .frame(maxWidth: .infinity)
            }
            .clipShape(Capsule())
            .overlay(Capsule().stroke(.black, lineWidth: 1))
        }
        .frame(height: 18)
    }
}

private struct SmallView: View {
    let countdown: SharedCountdown
    let days: Int
    let isDone: Bool

    var body: some View {
        VStack(spacing: 6) {
            Text(countdown.title)
                .font(.system(size: 15, weight: .bold, design: .rounded))
                .lineLimit(2)
                .multilineTextAlignment(.center)
                .foregroundStyle(.black)

            Spacer(minLength: 0)

            if isDone {
                Text("🎉").font(.system(size: 38))
                Text("YOU DID IT!")
                    .font(.system(size: 11, weight: .bold, design: .rounded))
                    .foregroundStyle(.black)
            } else {
                NumberBox(value: "\(days)", size: 40)
                Text("\(daysLabel(days).uppercased()) LEFT")
                    .font(.system(size: 11, weight: .bold, design: .rounded))
                    .foregroundStyle(.black)
            }
        }
    }
}

private struct MediumView: View {
    let countdown: SharedCountdown
    let days: Int
    let isDone: Bool
    let now: Date

    var body: some View {
        HStack(spacing: 16) {
            VStack(alignment: .leading, spacing: 4) {
                Text(countdown.title)
                    .font(.system(size: 18, weight: .bold, design: .rounded))
                    .lineLimit(2)
                Text(countdown.targetDate, format: dateFormat)
                    .font(.system(size: 12, weight: .medium, design: .rounded))
                    .opacity(0.7)

                Spacer(minLength: 0)

                if countdown.showProgress {
                    ProgressBarView(value: progress(of: countdown, at: now), isDone: isDone)
                }
            }
            .foregroundStyle(.black)
            .frame(maxWidth: .infinity, alignment: .leading)

            VStack(spacing: 4) {
                if isDone {
                    Text("🎉").font(.system(size: 44))
                    Text("YOU DID IT!")
                        .font(.system(size: 11, weight: .bold, design: .rounded))
                } else {
                    NumberBox(value: "\(days)", size: 44)
                    Text("\(daysLabel(days).uppercased()) LEFT")
                        .font(.system(size: 11, weight: .bold, design: .rounded))
                }
            }
            .foregroundStyle(.black)
            .frame(width: 110)
        }
    }

    private var dateFormat: Date.FormatStyle {
        countdown.hasTime
            ? .dateTime.month(.abbreviated).day().year().hour().minute()
            : .dateTime.month(.abbreviated).day().year()
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
                    .font(.system(size: 20, weight: .bold, design: .rounded))
                    .minimumScaleFactor(0.5)
                    .widgetAccentable()
                Text(daysLabel(days))
                    .font(.system(size: 9, weight: .semibold, design: .rounded))
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
                .font(.system(size: 15, weight: .bold, design: .rounded))
                .lineLimit(1)
                .widgetAccentable()
            if isDone {
                Text("YOU DID IT!")
                    .font(.system(size: 14, weight: .semibold, design: .rounded))
            } else {
                Text("\(days) \(daysLabel(days)) left")
                    .font(.system(size: 14, weight: .semibold, design: .rounded))
            }
            Text(countdown.targetDate, format: .dateTime.month(.abbreviated).day().year())
                .font(.system(size: 12, design: .rounded))
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
                Text("No countdowns yet").font(.system(size: 15, weight: .bold, design: .rounded))
                Text("Add one in HabitPath").font(.system(size: 13, design: .rounded))
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        default:
            VStack(spacing: 6) {
                Image(systemName: "hourglass").font(.system(size: 28))
                Text("No countdowns yet")
                    .font(.system(size: 14, weight: .bold, design: .rounded))
                Text("Add one in HabitPath")
                    .font(.system(size: 12, design: .rounded))
                    .opacity(0.7)
                #if DEBUG
                // TEMP: what the widget actually read from the App Group
                Text(CountdownStore.debugStatus())
                    .font(.system(size: 8, design: .monospaced))
                    .lineLimit(4)
                    .minimumScaleFactor(0.5)
                #endif
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
