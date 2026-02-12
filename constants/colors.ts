// @/components/colors.ts

/**
 * core brand and UI colors used throughout the app
 */
export const COLORS = {
  Primary: '#99c8e8',
  PrimaryLight: '#f49cbb',
  Secondary: '#dd2d4a',
  Completed: '#E9E4F0',
  ProgressColor: '#dcc4ff',
  Rewards: '#FF7F50',
  RewardsBackground: '#E4E986',
  RewardsAccent: '#7FD1AE',
  StreakAccent: '#F55858',
  XPAccent: '#FFB5A0',
  Star: '#ea3434ff',
  Time: '#FFE6FF',
  ReadMore: '#0000EE',
  Frequency: '#92C5FF',
  TimeOfDay: '#AB98F8'
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
  habits: {
    background: ['#89F7FE', '#66A6FF'],
    habitCard: ['#FFFFFF', '#F0F0F0'],
    border: ['#4caff6'],
    primary: ['#FFDDC1', '#FFABAB'],
    button: ['#FFF5DF']
  },
  newHabit: {
    background: ['#FDDAC5', '#FEF9E7']
  },
  path: {
    background: ['#A1C4FD', '#C2E9FB'],
    primary: ['#EC9064', '#899FFF'],
  },
  quest: {
    background: ['#FE9494', '#FFE4E2', '#ABB967'],
    primary: ['#FF6E83']
  },
  profile: {
    background: ['#CF8BF3', '#A770EF', '#FDB99B'],
    primary: ['#FF769C']
  },
  journal: {
    background: ['#8f94fb', '#bec1ffff'],
    foreground: ['#F9F8FF'],
    border: ['#55d7b0ff'],
    primary: ['#ED8BE7'],
  },
  focus: {
    backgroundMain: ['#EDE574', '#E1F5C4'],
    backgroundBreak: ['#f8997d', '#ad336d'],
    primary: ['#2ca994', '#C3FCF1'],
    break: ['#FFACE1', '#FFBCD4'],
    background: ['#f7ffe7', '#FFF6F2']
  },
  assignments: {
    background: ['#FFEFBA', '#FFFFFF'],
    backgroundAssignment: ['#D3CCE3', '#E9E4F0'],
    border: ['#4CE0F6'],
    primary: ['#F5924F', '#EEA2DA', '#4A98E6', '#AF9BE9'],
  },
  settings: {
    background: ['#fdfbfb', '#ebedee'],
    pin: ['#55d7b0ff']
  },
} as const;

/**
 * button action colors
 */
export const BUTTON_COLORS = {
  Done: '#70A9FF',
  Close: '#ffc8c8ff',
  Delete: '#ff5656',
  Edit: '#d8c8ffff',
  Cancel: '#f0f0f0',
  Disabled: '#ccc'
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
  // 🌈 very positive
  great: '#FF6AF0',        // playful pink
  excited: '#B76CFF',     // vibrant purple
  energetic: '#C7DE6A',   // fresh lime
  joyful: '#FFD166',      // sunny yellow

  // 🙂 positive / content
  happy: '#00AC8F',       // teal-green
  relaxed: '#6DDDFF',     // soft sky blue
  peaceful: '#8ED1C6',    // muted aqua
  grateful: '#F4B6C2',    // warm blush

  // 😐 neutral
  okay: '#FF9752',        // soft orange
  tired: '#C2B8A3',       // warm beige
  numb: '#9AA3A8',        // cool gray
  bored: '#B0B0B0',       // neutral gray

  // 😣 stressed / uneasy
  stressed: '#A81BA8',    // sharp purple
  anxious: '#548D8B',     // muted teal
  overwhelmed: '#7B6D8D', // dusty violet
  frustrated: '#ACACAC',  // flat gray

  // 😞 low / heavy
  sad: '#4075E6',         // soft blue
  lonely: '#6B7C9E',      // desaturated blue
  depressed: '#4B5563',   // dark slate
  hopeless: '#374151',    // deeper slate

  // 😡 anger
  angry: '#FF3B3B',       // strong red
  irritated: '#E85D5D',   // muted red

  // 🤒 physical state
  sick: '#EEE8A9',        // pale yellow
  exhausted: '#8B8B8B',   // dull gray
} as const;

// type helpers for TypeScript autocomplete
export type MoodColor = keyof typeof MOOD_COLORS;
export type MainMoodColor = keyof typeof MAIN_MOOD_COLORS;
export type ButtonColor = keyof typeof BUTTON_COLORS;