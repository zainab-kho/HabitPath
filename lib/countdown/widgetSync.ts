// @/lib/countdown/widgetSync.ts
// keeps everything outside the app screen up to date with the countdown list:
// the home / lock screen widget and the daily reminders.
import { syncCountdownReminders } from '@/lib/notifications';
import { saveWidgetData } from '@/lib/widgetStorage';
import { Countdown } from '@/types/Countdown';

// these two have to match the swift side (CountdownData.swift and CountdownWidget.swift)
const WIDGET_KEY = 'countdowns';
const WIDGET_KIND = 'CountdownWidget';

// saves the whole list where the widget can read it
function syncWidget(countdowns: Countdown[]) {
    // only what the widget needs. the shape has to match SharedCountdown in CountdownData.swift
    const shared = countdowns.map(countdown => ({
        id: countdown.id,
        title: countdown.title,
        targetMs: new Date(countdown.targetAt).getTime(),
        createdMs: new Date(countdown.createdAt).getTime(),
        hasTime: countdown.hasTime,
        color: countdown.color,
        showProgress: countdown.showProgress,
    }));

    saveWidgetData(WIDGET_KEY, shared, WIDGET_KIND);
}

// call this with the full list whenever countdowns load or change.
// a widget problem should never stop the reminders from syncing, so it's caught on its own
export async function syncCountdowns(countdowns: Countdown[], userId: string): Promise<void> {
    try {
        syncWidget(countdowns);
    } catch (err) {
        console.error('Error syncing countdown widget:', err);
    }

    await syncCountdownReminders(countdowns, userId);
}
