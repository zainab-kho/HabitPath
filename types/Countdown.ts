// @/types/Countdown.ts

export interface Countdown {
    id: string;
    userId: string;
    title: string;
    targetAt: string;   // ISO timestamp — when the countdown hits zero
    hasTime: boolean;   // false = counts down to midnight of the picked day
    color: string | null; // card color from PRESET_COLORS (null = default countdown pink)
    showProgress: boolean; // progress bar filling from createdAt → targetAt
    remindMe: boolean;     // daily "X days left" notification
    reminderTime: string | null; // "HH:MM" 24h
    createdAt: string;
    updatedAt: string;
}

// what the countdown card displays
export interface CountdownParts {
    months: number;
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isDone: boolean;
}
