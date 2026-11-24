// @/colors/core.ts
// the colors used all over the app. anything that only belongs to one feature
// has its own file instead (rewards.ts, habits.ts) or lives in pages.ts

export const COLORS = {
  // the app's main green: selected tabs, checkboxes, buttons
  Primary: '#9BDEAC',
  // the pink that goes with it: today's date, highlights, finished progress bars
  Accent: '#F682A4',
  // a strong red for things that need to stand out, like a date that isn't today
  Secondary: '#dd2d4a',
  // starred / favorite icons
  Star: '#ea3434ff',
  // faded text, like a placeholder in an empty input
  Placeholder: 'rgba(0,0,0,0.4)',
  // the soft pink behind times, like on the time wheel and in settings
  TimeLabel: '#FFE6FF',
  // the dark see-through layer behind every popup
  Backdrop: 'rgba(0,0,0,0.5)',
} as const;
