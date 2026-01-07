// @/components/colors.ts

/**
 * core brand and UI colors used throughout the app
 */
export const COLORS = {
  Primary: '#6255B3',
  PrimaryLight: '#AB98F8',
  Secondary: '#FF5F57',
  ProgressColor: '#FFD581',
  RewardsAccent: '#7FD1AE',
  StreakAccent: '#F55858',
  XPAccent: '#FFB5A0',
  Star: '#ea3434ff',
  Time: '#FFE6FF'
} as const;

/**
 * page-specific color schemes (backgrounds, borders, etc.)
 */
export const PAGE = {
  auth: {
    background: ['#C9FFBF', '#FFAFBD'],
    border: ['#55d7b0ff'],
    primary: ['#FED0FF'],
  },
  journal: {
    background: ['#8f94fb', '#bec1ffff'],
    foreground: ['#F9F8FF'],
    border: ['#55d7b0ff']
  },
  settings: {
    background: ['#fdfbfb', '#ebedee'],
  },
} as const;

/**
 * button action colors
 */
export const BUTTON_COLORS = {
  Done: '#70A9FF',
  Close: '#ffc8c8ff',
  Delete: '#FA839F',
  Edit: '#d8c8ffff',
} as const;

/**
 * main mood categories (simplified set)
 */
export const MAIN_MOOD_COLORS = {
  stressed: '#a81ba8ff',
  sad: '#4075e6ff',
  okay: '#ff9752',
  relaxed: '#6dddffff',
  happy: '#00AC8F',
} as const;

/**
 * full mood palette for detailed mood tracking
 */
export const MOOD_COLORS = {
  great: '#ff68f5ff',
  happy: '#00AC8F',
  excited: '#b66dffff',
  energetic: '#c6de69', // converted from rgba for consistency
  relaxed: '#6dddffff',
  okay: '#ff9752',
  sad: '#4075e6ff',
  stressed: '#a81ba8ff',
  anxious: '#548D8B',
  angry: '#ff3b3bff',
  frustrated: '#acacacff',
  sick: '#EEE8A9',
} as const;

// type helpers for TypeScript autocomplete
export type MoodColor = keyof typeof MOOD_COLORS;
export type MainMoodColor = keyof typeof MAIN_MOOD_COLORS;
export type ButtonColor = keyof typeof BUTTON_COLORS;