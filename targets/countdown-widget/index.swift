// @/targets/countdown-widget/index.swift
// entry point for the widget extension — lists every widget HabitPath offers
import SwiftUI
import WidgetKit

@main
struct HabitPathWidgets: WidgetBundle {
    var body: some Widget {
        CountdownWidget()
    }
}
