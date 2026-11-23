// @/colors/pages.ts
// each page's own color scheme: its background gradient, borders and accent colors.
// the background arrays are also read by name through AppLinearGradient (variant="journal.background")
import { COLORS } from './core';

export const PAGE = {
  auth: {
    background: ['#C9FFBF', '#FFAFBD'],
    border: ['#55d7b0ff'],
    primary: ['#FED0FF'],
  },
  habits: {
    border: ['#4caff6'],
    primary: ['#FFDDC1', '#FFABAB'],
    button: ['#FFF5DF']
  },
  newHabit: {
    background: ['#FDDAC5', '#FEF9E7']
  },
  path: {
    background: ['#faf3dd', '#c8d5b9', '#8fc0a9'],
    primary: ['#EC9064', '#8fc0a9'],
  },
  quest: {
    background: ['#FE9494', '#FFE4E2', '#ABB967'],
    primary: ['#FF6E83', '#9EA42E']
  },
  journal: {
    background: ['#8f94fb', '#bec1ffff'],
    foreground: ['#F9F8FF'],
    border: ['#55d7b0ff'],
    primary: ['#ED8BE7'],
  },
  notes: {
    background: ['#FFDBF7', '#FFD3FF', '#FFE7FF'],
    primary: ['#75A9FF', '#FFA4D8']
  },
  assignments: {
    background: ['#FFEFBA', '#FFFFFF'],
    backgroundAssignment: ['#D3CCE3', '#E9E4F0'],
    border: ['#4CE0F6'],
    primary: ['#F5924F', '#EEA2DA', '#4A98E6', '#AF9BE9'],
  },
  mealPlan: {
    background: ['#B2D1FF', '#F5FAFF'],
    primary: ['#A2A5F0', '#F494B2', '#A2ACBD'],
    mealItem: ['#FCFCD4', '#FCFCD4']
  },
  countdown: {
    background: ['#DBD9DC', '#DBD9DC'],
    primary: ['#ff6868', '#947591']
  },
  settings: {
    background: ['#fdfbfb', '#ebedee'],
    pin: ['#55d7b0ff']
  },
  rewards: {
    background: ['#f9ffa6', '#ffe8b1', '#FF7F50'],
    primary: ['#B9C042', COLORS.Rewards],
  },
} as const;
