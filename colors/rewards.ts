// @/colors/rewards.ts
// the colors of the points badges. they show up on habits, paths, goals,
// countdowns and the rewards page, so they live here instead of in one page

export const REWARD_COLORS = {
  // the orange of the points sparkle icon
  Points: '#FF7F50',
  // the yellow inside a points badge
  Background: '#E4E986',
  // the green outline around a points badge
  Accent: '#7FD1AE',
  // the "x3" badge in points history, when a habit was completed more than once
  RepeatCount: '#E69F94',
} as const;
