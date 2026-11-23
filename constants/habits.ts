// @/constants/habits.ts

// the times of day a habit can be set to, in the order their sections show up
export const TIME_OPTIONS = ['Wake Up', 'Morning', 'Anytime', 'Afternoon', 'Evening', 'Bed Time'] as const;
export type TimeOfDay = typeof TIME_OPTIONS[number];

// one empty list per time of day, ready to sort habits into.
// built from TIME_OPTIONS
export function emptyTimeBuckets<T>(): Record<TimeOfDay, T[]> {
  return Object.fromEntries(TIME_OPTIONS.map(time => [time, []])) as unknown as Record<TimeOfDay, T[]>;
}

export const FREQUENCIES = [
  'None',
  'Daily',
  'Weekly',
  'Monthly',
  'Custom'
] as const;

export const WEEK_DAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

export const CUSTOM_TYPES = ['Daily', 'Weekly', 'Monthly'] as const;

export const REWARD_OPTIONS = [0, 1, 2, 3, 5, 10, 15, 20, 25, 50];