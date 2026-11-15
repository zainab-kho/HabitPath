// @/lib/countdown/widgetSync.ts
// keeps everything outside the app screen up to date with the countdown list:
// the home / lock screen widget and the daily reminders.
import { Platform } from 'react-native';

import { syncCountdownReminders } from '@/lib/notifications';
import { Countdown } from '@/types/Countdown';

// these three have to match the swift side (targets/countdown-widget/CountdownData.swift
// and CountdownWidget.swift), and the app group also has to match app.json
const APP_GROUP = 'group.com.zainabkho.habitpath';
const WIDGET_KEY = 'countdowns';
const WIDGET_KIND = 'CountdownWidget';

type WidgetStorage = { set: (key: string, value: string) => void };

let storage: WidgetStorage | null = null;
let reloadWidget: ((kind?: string) => void) | null = null;

// the widget's shared storage, or null when it isn't available (android, web).
// loaded on first use instead of imported at the top, so a build that doesn't
// have the native module yet skips the widget instead of crashing on launch
function getWidgetStorage(): WidgetStorage | null {
    if (Platform.OS !== 'ios') return null;
    if (storage) return storage;

    try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { ExtensionStorage } = require('@bacons/apple-targets');
        storage = new ExtensionStorage(APP_GROUP);
        reloadWidget = (kind?: string) => ExtensionStorage.reloadWidget(kind);
        return storage;
    } catch {
        return null;
    }
}

// saves the whole list where the widget can read it, then asks ios to redraw the widget
function syncWidget(countdowns: Countdown[]) {
    const widgetStorage = getWidgetStorage();
    if (!widgetStorage) return;

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

    widgetStorage.set(WIDGET_KEY, JSON.stringify(shared));
    reloadWidget?.(WIDGET_KIND);
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
