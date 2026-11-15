// @/lib/countdown/widgetSync.ts
import { Platform } from 'react-native';

import { syncCountdownReminders } from '@/lib/notifications';
import { Countdown } from '@/types/Countdown';

// must match app.json (ios.entitlements) and targets/countdown-widget/CountdownData.swift
const APP_GROUP = 'group.com.zainabkho.habitpath';
const WIDGET_KEY = 'countdowns';
const WIDGET_KIND = 'CountdownWidget';

// loaded lazily so a dev client built before the widget existed doesn't crash on launch
let storage: { set: (key: string, value: string) => void } | null = null;
let reloadWidget: ((kind?: string) => void) | null = null;

function getWidgetStorage() {
    if (Platform.OS !== 'ios') return null;
    if (storage) return storage;
    try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { ExtensionStorage } = require('@bacons/apple-targets');
        storage = new ExtensionStorage(APP_GROUP);
        reloadWidget = (kind?: string) => ExtensionStorage.reloadWidget(kind);
        return storage;
    } catch {
        // native module not in this build yet — rebuild the app after adding the widget
        return null;
    }
}

// writes every countdown into the App Group for the widget, then asks iOS to redraw it
function syncWidget(countdowns: Countdown[]) {
    const widgetStorage = getWidgetStorage();
    // the JS package silently no-ops when the native module isn't in the build — log which one ran
    const hasNative = !!(globalThis as any).expo?.modules?.ExtensionStorage;
    if (__DEV__) console.log(`[widget] syncing ${countdowns.length} countdown(s) — native module ${hasNative ? 'found' : 'MISSING'}`);
    if (!widgetStorage) return;

    // shape must match SharedCountdown in CountdownData.swift
    const shared = countdowns.map(c => ({
        id: c.id,
        title: c.title,
        targetMs: new Date(c.targetAt).getTime(),
        createdMs: new Date(c.createdAt).getTime(),
        hasTime: c.hasTime,
        color: c.color,
        showProgress: c.showProgress,
    }));

    widgetStorage.set(WIDGET_KEY, JSON.stringify(shared));
    reloadWidget?.(WIDGET_KIND);
}

/**
 * hands the latest FULL countdown list to everything outside the app screen.
 * called after every load of the countdown page (so after any create / edit / delete),
 * which makes this the one place to keep in step.
 */
export async function syncCountdowns(countdowns: Countdown[], userId: string): Promise<void> {
    try {
        syncWidget(countdowns);
    } catch (err) {
        console.error('Error syncing countdown widget:', err);
    }
    await syncCountdownReminders(countdowns, userId);
}
