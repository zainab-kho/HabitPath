// @/lib/countdown/countdownMath.ts
// all the date math for countdowns. the widget has its own copy of the days-left
// and progress math in swift (targets/countdown-widget/CountdownData.swift),
// so if one changes, change the other too.
import { CountdownParts } from '@/types/Countdown';

const SECONDS_PER_MINUTE = 60;
const SECONDS_PER_HOUR = 3600;
const SECONDS_PER_DAY = 86400;
const MS_PER_DAY = SECONDS_PER_DAY * 1000;

// adds whole calendar months. if the day doesn't exist in the new month,
// it lands on that month's last day (jan 31 + 1 month = feb 28 or 29)
function addMonths(date: Date, months: number): Date {
    const result = new Date(date);
    const day = result.getDate();

    result.setDate(1);
    result.setMonth(result.getMonth() + months);

    const lastDayOfMonth = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
    result.setDate(Math.min(day, lastDayOfMonth));
    return result;
}

// splits the time between now and the target into months, days, hours, minutes and seconds.
// months are real calendar months, so "1 month" from nov 14 lands on dec 14
export function getCountdownParts(target: Date, now: Date = new Date()): CountdownParts {
    if (target.getTime() <= now.getTime()) {
        return { months: 0, days: 0, hours: 0, minutes: 0, seconds: 0, isDone: true };
    }

    // start with a rough month count, then step back if it overshoots the target
    let months = (target.getFullYear() - now.getFullYear()) * 12 + (target.getMonth() - now.getMonth());
    while (months > 0 && addMonths(now, months).getTime() > target.getTime()) months--;

    // whatever is left after the whole months gets split into the smaller units
    let remaining = Math.floor((target.getTime() - addMonths(now, months).getTime()) / 1000);

    const days = Math.floor(remaining / SECONDS_PER_DAY);
    remaining -= days * SECONDS_PER_DAY;

    const hours = Math.floor(remaining / SECONDS_PER_HOUR);
    remaining -= hours * SECONDS_PER_HOUR;

    const minutes = Math.floor(remaining / SECONDS_PER_MINUTE);
    const seconds = remaining - minutes * SECONDS_PER_MINUTE;

    return { months, days, hours, minutes, seconds, isDone: false };
}

// whole calendar days left. this changes at midnight, not 24 hours from now,
// so the card badge, the notifications and the widget all agree
export function getDaysLeft(target: Date, now: Date = new Date()): number {
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfTargetDay = new Date(target.getFullYear(), target.getMonth(), target.getDate());

    const days = Math.round((startOfTargetDay.getTime() - startOfToday.getTime()) / MS_PER_DAY);
    return Math.max(0, days);
}

// how far along the countdown is (0 to 100), from the day it was created to the target
export function getProgressPct(start: Date, target: Date, now: Date = new Date()): number {
    const total = target.getTime() - start.getTime();
    if (total <= 0) return 100;

    const elapsed = now.getTime() - start.getTime();
    return Math.max(0, Math.min(100, (elapsed / total) * 100));
}
