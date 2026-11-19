// @/targets/countdown-widget/MealPlanWidget.swift
// home screen widget showing today's meal plan, in the same compact layout as week view in the app:
// the section name on the left, its meals as chips on the same line
import SwiftUI
import WidgetKit

// ─── data ────────────────────────────────────────────────────────────────────
// reads what the app writes in lib/mealPlan/mealPlanWidgetSync.ts

let mealPlanKey = "mealPlan"

struct SharedMealPlan: Codable {
    // the sections the user set up for each day, in their order.
    // these can be built-in ones or ones they made themselves
    let sections: [String]
    let entries: [SharedMealEntry]

    // shown in the widget gallery before any real plan exists
    static let sample = SharedMealPlan(
        sections: ["Breakfast", "Lunch", "Dinner"],
        entries: [
            SharedMealEntry(date: mealPlanDateString(Date()), mealType: "Breakfast", name: "Fried eggs"),
            SharedMealEntry(date: mealPlanDateString(Date()), mealType: "Breakfast", name: "Hashbrowns"),
            SharedMealEntry(date: mealPlanDateString(Date()), mealType: "Lunch", name: "Chicken wrap"),
            SharedMealEntry(date: mealPlanDateString(Date()), mealType: "Dinner", name: "Pasta"),
        ]
    )
}

struct SharedMealEntry: Codable {
    let date: String      // "YYYY-MM-DD"
    let mealType: String
    let name: String
}

// one row of the widget: a section and the meals planned for it
struct MealSectionRow: Identifiable {
    let section: String
    let meals: [String]
    var id: String { section }
}

enum MealPlanStore {
    // nil when the app hasn't saved a plan yet, or the shared storage can't be opened
    static func load() -> SharedMealPlan? {
        guard
            let defaults = UserDefaults(suiteName: appGroupId),
            let json = defaults.string(forKey: mealPlanKey),
            let data = json.data(using: .utf8)
        else { return nil }

        return try? JSONDecoder().decode(SharedMealPlan.self, from: data)
    }
}

// a date as "YYYY-MM-DD" in the phone's own time zone, the same way the app saves plan dates
func mealPlanDateString(_ date: Date) -> String {
    let formatter = DateFormatter()
    formatter.calendar = Calendar(identifier: .gregorian)
    formatter.locale = Locale(identifier: "en_US_POSIX")
    formatter.dateFormat = "yyyy-MM-dd"
    return formatter.string(from: date)
}

// the rows for one day: the user's sections in their order,
// then any other section that has a meal planned that day
func mealRows(for plan: SharedMealPlan, on date: Date) -> [MealSectionRow] {
    let day = mealPlanDateString(date)
    let dayEntries = plan.entries.filter { $0.date == day }

    var sections = plan.sections
    for entry in dayEntries where !sections.contains(entry.mealType) {
        sections.append(entry.mealType)
    }

    return sections.map { section in
        MealSectionRow(section: section, meals: dayEntries.filter { $0.mealType == section }.map(\.name))
    }
}

// ─── timeline ────────────────────────────────────────────────────────────────

struct MealPlanEntry: TimelineEntry {
    let date: Date
    let plan: SharedMealPlan?
}

struct MealPlanProvider: TimelineProvider {
    func placeholder(in context: Context) -> MealPlanEntry {
        MealPlanEntry(date: Date(), plan: .sample)
    }

    func getSnapshot(in context: Context, completion: @escaping (MealPlanEntry) -> Void) {
        let plan = MealPlanStore.load() ?? (context.isPreview ? .sample : nil)
        completion(MealPlanEntry(date: Date(), plan: plan))
    }

    // now, then every midnight for the next week, so the widget moves on to the new day by itself.
    // the app also reloads this whenever the meal plan changes
    func getTimeline(in context: Context, completion: @escaping (Timeline<MealPlanEntry>) -> Void) {
        let plan = MealPlanStore.load()
        let calendar = Calendar.current
        let now = Date()

        var dates = [now]
        var midnight = calendar.startOfDay(for: now)
        for _ in 0..<7 {
            guard let next = calendar.date(byAdding: .day, value: 1, to: midnight) else { break }
            midnight = next
            dates.append(midnight)
        }

        let entries = dates.map { MealPlanEntry(date: $0, plan: plan) }
        completion(Timeline(entries: entries, policy: .atEnd))
    }
}

// ─── widget ──────────────────────────────────────────────────────────────────

struct MealPlanWidget: Widget {
    let kind = "MealPlanWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: MealPlanProvider()) { entry in
            MealPlanWidgetView(entry: entry)
                .containerBackground(for: .widget) { MealPlanColors.card }
                // tapping opens the meal plan page
                .widgetURL(URL(string: "habitpath://more/meal-plan"))
        }
        .configurationDisplayName("Meal Plan")
        .description("Today's meals at a glance.")
        .supportedFamilies([.systemMedium, .systemLarge])
    }
}

// ─── views ───────────────────────────────────────────────────────────────────

enum MealPlanColors {
    static let card = Color(hex: "#B2D1FF")        // PAGE.mealPlan.background[0]
    static let row = Color(hex: "#F5FAFF")         // PAGE.mealPlan.background[1]
    static let chip = Color(hex: "#FCFCD4")        // PAGE.mealPlan.mealItem[0]
    static let chipBorder = Color(hex: "#F494B2")  // PAGE.mealPlan.primary[1]
}

struct MealPlanWidgetView: View {
    @Environment(\.widgetFamily) private var family
    let entry: MealPlanEntry

    private var isLarge: Bool { family == .systemLarge }

    var body: some View {
        VStack(alignment: .leading, spacing: isLarge ? 8 : 5) {
            Text(entry.date, format: .dateTime.weekday(.abbreviated).month(.abbreviated).day())
                .font(.app(isLarge ? 15 : 13))

            if let plan = entry.plan {
                ForEach(mealRows(for: plan, on: entry.date)) { row in
                    MealRowView(row: row, isLarge: isLarge)
                }
            } else {
                Text("Open HabitPath to plan your meals")
                    .font(.app(12))
                    .opacity(0.7)
            }

            Spacer(minLength: 0)
        }
        .foregroundStyle(.black)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }
}

// one section: its name on the left, its meals as chips on the same line
private struct MealRowView: View {
    let row: MealSectionRow
    let isLarge: Bool

    var body: some View {
        HStack(alignment: .top, spacing: 6) {
            Text(row.section)
                .font(.app(isLarge ? 13 : 11))
                .lineLimit(1)
                // a fixed width so the meals line up from one section to the next
                .frame(width: isLarge ? 68 : 58, alignment: .leading)
                .padding(.vertical, 2)

            if row.meals.isEmpty {
                Text("nothing planned")
                    .font(.app(isLarge ? 12 : 10))
                    .opacity(0.4)
                    .padding(.vertical, 2)
            } else {
                // chips wrap onto another line when they run out of room
                ChipFlowLayout(spacing: 4) {
                    ForEach(Array(row.meals.enumerated()), id: \.offset) { _, meal in
                        MealChip(name: meal, isLarge: isLarge)
                    }
                }
            }
        }
        .padding(.horizontal, 6)
        .padding(.vertical, isLarge ? 5 : 3)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(RoundedRectangle(cornerRadius: 9).fill(MealPlanColors.row))
    }
}

private struct MealChip: View {
    let name: String
    let isLarge: Bool

    var body: some View {
        Text(name)
            .font(.app(isLarge ? 12 : 10))
            .lineLimit(1)
            .padding(.horizontal, 6)
            .padding(.vertical, 2)
            .background(Capsule().fill(MealPlanColors.chip))
            .overlay(Capsule().stroke(MealPlanColors.chipBorder, lineWidth: 1))
    }
}

// lays its children out left to right, starting a new line when the current one is full.
// (swiftui's own stacks can't wrap)
private struct ChipFlowLayout: Layout {
    var spacing: CGFloat = 4

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let maxWidth = proposal.width ?? .infinity
        let result = arrange(subviews, maxWidth: maxWidth)
        return CGSize(width: maxWidth.isFinite ? maxWidth : result.width, height: result.height)
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        let result = arrange(subviews, maxWidth: bounds.width)
        for (index, origin) in result.origins.enumerated() {
            subviews[index].place(
                at: CGPoint(x: bounds.minX + origin.x, y: bounds.minY + origin.y),
                // a chip is never allowed to be wider than the row, so a very long name gets cut off with "..."
                proposal: ProposedViewSize(width: bounds.width, height: nil)
            )
        }
    }

    // works out where each child goes, and how much room they take up in total
    private func arrange(_ subviews: Subviews, maxWidth: CGFloat) -> (origins: [CGPoint], width: CGFloat, height: CGFloat) {
        var origins: [CGPoint] = []
        var x: CGFloat = 0
        var y: CGFloat = 0
        var lineHeight: CGFloat = 0
        var widest: CGFloat = 0

        for subview in subviews {
            let size = subview.sizeThatFits(ProposedViewSize(width: maxWidth, height: nil))

            // doesn't fit on this line (and isn't the first thing on it): move down to a new line
            if x > 0, x + size.width > maxWidth {
                x = 0
                y += lineHeight + spacing
                lineHeight = 0
            }

            origins.append(CGPoint(x: x, y: y))
            x += size.width + spacing
            lineHeight = max(lineHeight, size.height)
            widest = max(widest, x - spacing)
        }

        return (origins, widest, y + lineHeight)
    }
}
