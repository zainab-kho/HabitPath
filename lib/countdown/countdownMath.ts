// @/lib/countdown/countdownMath.ts
import { CountdownParts } from '@/types/Countdown';

// adds whole calendar months, clamping to the end of shorter months (Jan 31 + 1 → Feb 28/29)
function addMonths(date: Date, months: number): Date {
    const d = new Date(date);
    const day = d.getDate();
    d.setDate(1);
    d.setMonth(d.getMonth() + months);
    const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    d.setDate(Math.min(day, lastDay));
    return d;
}

/**
 * splits the time between now and target into months / days / hours / minutes / seconds.
 * months are real calendar months, so "1 month" from Nov 14 lands on Dec 14.
 */
export function getCountdownParts(target: Date, now: Date = new Date()): CountdownParts {
    if (target.getTime() <= now.getTime()) {
        return { months: 0, days: 0, hours: 0, minutes: 0, seconds: 0, isDone: true };
    }

    // count whole months first (rough guess, then step back if it overshot)
    let months = (target.getFullYear() - now.getFullYear()) * 12 + (target.getMonth() - now.getMonth());
    while (months > 0 && addMonths(now, months).getTime() > target.getTime()) months--;

    let remaining = Math.floor((target.getTime() - addMonths(now, months).getTime()) / 1000);

    const days = Math.floor(remaining / 86400);
    remaining -= days * 86400;
    const hours = Math.floor(remaining / 3600);
    remaining -= hours * 3600;
    const minutes = Math.floor(remaining / 60);
    const seconds = remaining - minutes * 60;

    return { months, days, hours, minutes, seconds, isDone: false };
}

// whole days left, counting calendar days (used later by the widget + notifications)
export function getDaysLeft(target: Date, now: Date = new Date()): number {
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfTarget = new Date(target.getFullYear(), target.getMonth(), target.getDate());
    return Math.max(0, Math.round((startOfTarget.getTime() - startOfToday.getTime()) / 86400000));
}

// how far along the countdown is, 0–100, from the day it was created to the target
export function getProgressPct(start: Date, target: Date, now: Date = new Date()): number {
    const total = target.getTime() - start.getTime();
    if (total <= 0) return 100;
    const elapsed = now.getTime() - start.getTime();
    return Math.max(0, Math.min(100, (elapsed / total) * 100));
}
