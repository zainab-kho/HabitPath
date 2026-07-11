export const STORAGE_KEYS = {
  RESET_TIME: '@reset_time',
  TOTAL_POINTS: '@total_points',

  HABITS_CACHE: '@habits_cache',
  HABITS_DIRTY: '@habits_dirty',

  TOGGLE_STATE: '@habits_toggle',
  WEEKLY_COLLAPSED: '@habits_weekly_collapsed',

  JOURNAL_CACHE: '@journal_cache',
  JOURNAL_DIRTY: '@journal_dirty',

  USER_SETTINGS: '@user_settings',
  USER_DAY_OF_WEEK_CHOICE: '@user_day_of_week_choice',
  ONBOARDING_COMPLETE: '@onboarding_complete',

  REWARDS: '@rewards',
  REDEEMED_POINTS: '@redeemed_points',
  EXCHANGE_RATE: '@exchange_rate',

  // bumped when a breaking cache change is made — triggers a one-time wipe on next launch
  CACHE_VERSION: '@cache_version',
} as const;

// increment this whenever old cached data needs to be force-wiped across all devices
export const CURRENT_CACHE_VERSION = '2';