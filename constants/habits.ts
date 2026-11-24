// @/constants/habits.ts
// the choices on the new habit page, plus a few lists the habit pages share

/* ============================================================================
   TIME OF DAY
============================================================================ */

// the times of day a habit can be set to, in the order their sections show up
export const TIME_OPTIONS = ['Wake Up', 'Morning', 'Anytime', 'Afternoon', 'Evening', 'Bed Time'] as const;
export type TimeOfDay = typeof TIME_OPTIONS[number];

// one empty list per time of day, ready to sort habits into.
// built from TIME_OPTIONS, so adding or renaming a time only happens up there
export function emptyTimeBuckets<T>(): Record<TimeOfDay, T[]> {
  return Object.fromEntries(TIME_OPTIONS.map(time => [time, []])) as unknown as Record<TimeOfDay, T[]>;
}

/* ============================================================================
   HOW OFTEN
============================================================================ */

// how often a habit repeats. 'None' is a one-time habit
export const FREQUENCIES = ['None', 'Daily', 'Weekly', 'Monthly', 'Custom'] as const;

// the units a custom frequency can count in, like "every 3 weeks"
export const CUSTOM_TYPES = ['Daily', 'Weekly', 'Monthly'] as const;

// every day of the week, sunday first, the way js Date.getDay() counts them
export const WEEK_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;

/* ============================================================================
   REWARDS
============================================================================ */

// the point values a habit can be worth when it's completed
export const REWARD_OPTIONS = [0, 1, 2, 3, 5, 10, 15, 20, 25, 50];
