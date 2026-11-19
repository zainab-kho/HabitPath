// @/lib/widgetStorage.ts
// the one place the app hands data to its home / lock screen widgets.
// widgets can't read the app's own storage, only the shared app group
import { Platform } from 'react-native';

// has to match app.json and the swift side (targets/countdown-widget)
const APP_GROUP = 'group.com.zainabkho.habitpath';

type WidgetStorage = { set: (key: string, value: string) => void };

let storage: WidgetStorage | null = null;
let reloadWidget: ((kind?: string) => void) | null = null;

// the shared storage, or null when it isn't available (android, web).
// loaded on first use instead of imported at the top, so a build that doesn't
// have the native module yet skips the widgets instead of crashing on launch
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

// saves data under a key for a widget to read, then asks ios to redraw that widget.
// widgetKind is the widget's `kind` in its swift file
export function saveWidgetData(key: string, data: unknown, widgetKind: string): void {
    const widgetStorage = getWidgetStorage();
    if (!widgetStorage) return;

    widgetStorage.set(key, JSON.stringify(data));
    reloadWidget?.(widgetKind);
}
