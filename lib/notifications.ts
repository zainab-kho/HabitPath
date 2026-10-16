// @/lib/notifications.ts
// Local habit reminders. Rather than trying to express every frequency (custom
// intervals, nth-weekday monthly, week goals, snoozes...) as a repeating trigger,
// we schedule one-shot notifications for the next few days using the same
// isHabitActiveToday logic the habit list uses, and re-sync whenever habits change
// (load, complete, skip, snooze...). Completing a habit therefore cancels its
// reminder for that day.
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { getResetTime } from '@/lib/supabase/queries';
import { loadHabitsFromSupabase } from '@/lib/supabase/queries/habit';
import { Habit } from '@/types/Habit';
import { getHabitDate, getWeekDatesForDate } from '@/utils/dateUtils';
import { isHabitActiveToday } from '@/utils/habitUtils';

const ID_PREFIX = 'habit-reminder:';
const NUDGE_PREFIX = 'daily-nudge:';
const ANDROID_CHANNEL_ID = 'habit-reminders';
// how far ahead to schedule; the app re-syncs on every habit load
const DAYS_AHEAD = 7;
// iOS keeps at most 64 pending local notifications per app
const MAX_SCHEDULED = 60;

export const REMINDER_PRESETS = [
    { label: 'Morning', time: '08:00' },
    { label: 'Afternoon', time: '13:00' },
    { label: 'Evening', time: '19:00' },
] as const;

export const DEFAULT_REMINDER_TIME = '08:00';

// app-wide nudges: start the day, a midday progress check, and an evening tick-off.
// each has a default time the user can change; midday is opt-in, the others are on.
export const NUDGE_SLOTS = ['morning', 'midday', 'evening'] as const;

export type NudgeSlot = typeof NUDGE_SLOTS[number];

export type NudgePref = { enabled: boolean; time: string }; // time is "HH:MM" 24h

export type NudgePrefs = Record<NudgeSlot, NudgePref>;

export const DEFAULT_NUDGE_PREFS: NudgePrefs = {
    morning: { enabled: true, time: '08:00' },
    midday: { enabled: false, time: '12:00' },
    evening: { enabled: true, time: '20:00' },
};

const NUDGE_PREFS_KEY = '@nudge_prefs';

export async function getNudgePrefs(): Promise<NudgePrefs> {
    try {
        const stored = await AsyncStorage.getItem(NUDGE_PREFS_KEY);
        if (!stored) return DEFAULT_NUDGE_PREFS;

        const parsed = JSON.parse(stored) as Partial<Record<NudgeSlot, NudgePref | boolean>>;
        const prefs = { ...DEFAULT_NUDGE_PREFS };
        for (const slot of NUDGE_SLOTS) {
            const value = parsed[slot];
            // an earlier version stored just an on/off flag, with the time fixed
            if (typeof value === 'boolean') prefs[slot] = { ...DEFAULT_NUDGE_PREFS[slot], enabled: value };
            else if (value) prefs[slot] = { ...DEFAULT_NUDGE_PREFS[slot], ...value };
        }
        return prefs;
    } catch {
        return DEFAULT_NUDGE_PREFS;
    }
}

export async function saveNudgePrefs(prefs: NudgePrefs): Promise<void> {
    await AsyncStorage.setItem(NUDGE_PREFS_KEY, JSON.stringify(prefs));
}

const isSupported = Platform.OS === 'ios' || Platform.OS === 'android';

// show reminders as banners even while the app is open
if (isSupported) {
    Notifications.setNotificationHandler({
        handleNotification: async () => ({
            shouldShowBanner: true,
            shouldShowList: true,
            shouldPlaySound: true,
            shouldSetBadge: false,
        }),
    });
}

// "HH:MM" (24h) -> "8:00 AM"
export function formatReminderTime(time: string): string {
    const [h, m] = time.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}

// Android delivers notifications through a channel; creating it again is a no-op
async function ensureAndroidChannel() {
    if (Platform.OS !== 'android') return;
    await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
        name: 'Habit reminders',
        importance: Notifications.AndroidImportance.HIGH,
    });
}

// asks for permission if it hasn't been decided yet; returns whether reminders can fire
export async function ensureNotificationPermission(): Promise<boolean> {
    if (!isSupported) return false;

    await ensureAndroidChannel();

    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    if (!current.canAskAgain) return false;

    const requested = await Notifications.requestPermissionsAsync();
    return requested.granted;
}

function isDoneForDay(habit: Habit, dateStr: string): boolean {
    if (habit.skippedDates?.includes(dateStr)) return true;
    if (habit.frequency === 'Weekly Goal') {
        return getWeekDatesForDate(dateStr).some(d => habit.completionHistory?.includes(d));
    }
    return habit.completionHistory?.includes(dateStr) ?? false;
}

type PendingNotification = {
    id: string;
    fireDate: Date;
    title: string;
    body: string;
    data?: Record<string, unknown>;
};

// every habit scheduled on the day the given moment falls in
function dueOn(habits: Habit[], fireDate: Date, resetHour: number, resetMinute: number): Habit[] {
    return habits.filter(h =>
        !h.archivedAt && isHabitActiveToday(h, fireDate, resetHour, resetMinute)
    );
}

const NUDGE_TEXT: Record<NudgeSlot, (done: number, total: number) => { title: string; body: string }> = {
    morning: () => ({
        title: 'Good morning!',
        body: 'Start your day with a habit.',
    }),
    midday: (done, total) => {
        const left = total - done;
        return {
            title: `${Math.round((done / total) * 100)}% of your day done`,
            body: `${left} ${left === 1 ? 'habit' : 'habits'} left to go.`,
        };
    },
    evening: () => ({
        title: 'Evening check-in',
        body: 'Check off anything you did today.',
    }),
};

// the daily nudges, skipped on days with nothing left to do
function buildDailyNudges(
    habits: Habit[],
    resetHour: number,
    resetMinute: number,
    prefs: NudgePrefs,
): PendingNotification[] {
    const now = new Date();
    const nudges: PendingNotification[] = [];

    for (let offset = 0; offset < DAYS_AHEAD; offset++) {
        for (const slot of NUDGE_SLOTS) {
            if (!prefs[slot].enabled) continue;

            const [hour, minute] = prefs[slot].time.split(':').map(Number);
            const fireDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset, hour, minute);
            if (fireDate <= now) continue;

            const due = dueOn(habits, fireDate, resetHour, resetMinute);
            const outstanding = due.filter(h => !isDoneForDay(h, getHabitDate(fireDate, resetHour, resetMinute)));
            if (outstanding.length === 0) continue;

            const habitDay = getHabitDate(fireDate, resetHour, resetMinute);
            nudges.push({
                id: `${NUDGE_PREFIX}${slot}:${habitDay}`,
                fireDate,
                ...NUDGE_TEXT[slot](due.length - outstanding.length, due.length),
            });
        }
    }

    return nudges;
}

function buildReminders(habits: Habit[], resetHour: number, resetMinute: number): PendingNotification[] {
    const now = new Date();
    const reminders: PendingNotification[] = [];

    for (const habit of habits) {
        if (!habit.remindMe || !habit.reminderTime || habit.archivedAt) continue;
        const [hour, minute] = habit.reminderTime.split(':').map(Number);

        for (let offset = 0; offset < DAYS_AHEAD; offset++) {
            const fireDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset, hour, minute);
            if (fireDate <= now) continue;

            // a reminder before the day-reset time belongs to the previous habit day
            const habitDay = getHabitDate(fireDate, resetHour, resetMinute);
            if (!isHabitActiveToday(habit, fireDate, resetHour, resetMinute)) continue;
            if (isDoneForDay(habit, habitDay)) continue;

            reminders.push({
                id: `${ID_PREFIX}${habit.id}:${habitDay}`,
                fireDate,
                title: habit.name,
                body: 'Time for your habit!',
                data: { habitId: habit.id },
            });
        }
    }

    return reminders;
}

async function doSync(habits: Habit[], resetHour: number, resetMinute: number) {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(
        scheduled
            .filter(n => n.identifier.startsWith(ID_PREFIX) || n.identifier.startsWith(NUDGE_PREFIX))
            .map(n => Notifications.cancelScheduledNotificationAsync(n.identifier))
    );

    const pending = [
        ...buildReminders(habits, resetHour, resetMinute),
        ...buildDailyNudges(habits, resetHour, resetMinute, await getNudgePrefs()),
    ]
        .sort((a, b) => a.fireDate.getTime() - b.fireDate.getTime())
        .slice(0, MAX_SCHEDULED);
    if (pending.length === 0) return;

    // never prompt from a background sync — permission is asked when a reminder is turned on
    const { granted } = await Notifications.getPermissionsAsync();
    if (!granted) return;

    await Promise.all(pending.map(({ id, fireDate, title, body, data }) =>
        Notifications.scheduleNotificationAsync({
            identifier: id,
            content: { title, body, data },
            trigger: {
                type: Notifications.SchedulableTriggerInputTypes.DATE,
                date: fireDate,
                channelId: ANDROID_CHANNEL_ID,
            },
        })
    ));
}

// re-schedules from the server's habits — for callers that don't hold the habit list
// (e.g. the settings page toggling a nudge on or off)
export async function resyncRemindersForUser(userId: string): Promise<void> {
    if (!isSupported) return;
    try {
        const [habits, reset] = await Promise.all([loadHabitsFromSupabase(userId), getResetTime()]);
        await syncHabitReminders(habits, reset.hour, reset.minute);
    } catch (err) {
        console.error('Error resyncing habit reminders:', err);
    }
}

// syncs run one at a time so overlapping calls can't double-schedule
let syncQueue: Promise<void> = Promise.resolve();

export function syncHabitReminders(habits: Habit[], resetHour: number, resetMinute: number): Promise<void> {
    if (!isSupported) return Promise.resolve();
    syncQueue = syncQueue
        .then(() => doSync(habits, resetHour, resetMinute))
        .catch(err => console.error('Error syncing habit reminders:', err));
    return syncQueue;
}
