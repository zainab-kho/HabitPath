// @/lib/countdown/widgetSync.ts
import { syncCountdownReminders } from '@/lib/notifications';
import { Countdown } from '@/types/Countdown';

/**
 * hands the latest FULL countdown list to everything outside the app screen.
 * called after every load of the countdown page (so after any create / edit / delete),
 * which makes this the one place to keep in step.
 *
 * - daily reminders: rescheduled now ✅
 * - **TODO (widget step): write { id, title, targetAt, color } for every countdown into
 *   App Group storage, then ask WidgetKit to reload its timelines.
 */
export async function syncCountdowns(countdowns: Countdown[], userId: string): Promise<void> {
    await syncCountdownReminders(countdowns, userId);
}
