// @/types/Countdown.ts

export interface Countdown {
    id: string;
    userId: string;
    title: string;

    // when the countdown hits zero (ISO timestamp).
    // with no time picked, that's midnight at the start of the chosen day
    targetAt: string;
    hasTime: boolean;

    // card color from PRESET_COLORS — null falls back to the countdown pink
    color: string | null;
    // progress bar that fills from createdAt to targetAt
    showProgress: boolean;

    // daily "x days left" notification, and when to send it ("HH:MM", 24h)
    remindMe: boolean;
    reminderTime: string | null;

    createdAt: string;
    updatedAt: string;
}

// the time left, split into the boxes the countdown card shows
export interface CountdownParts {
    months: number;
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isDone: boolean;
}
