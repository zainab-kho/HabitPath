// @/targets/countdown-widget/index.swift
// entry point for the widget extension. every widget habitpath offers is listed here
import SwiftUI
import WidgetKit

@main
struct HabitPathWidgets: WidgetBundle {
    var body: some Widget {
        CountdownWidget()
        MealPlanWidget()
    }
}
