// @/components/colors.ts

/**
 * core brand and UI colors used throughout the app
 */
export const COLORS = {
  Primary: '#9BDEAC',
  PrimaryLight: '#F682A4',
  Secondary: '#dd2d4a',
  Completed: '#F0ABFF',
  ProgressColor: '#9BDEAC',
  Rewards: '#FF7F50',
  RewardsBackground: '#E4E986',
  RewardsAccent: '#7FD1AE',
  StreakAccent: '#F55858',
  XPAccent: '#E69F94',
  Star: '#ea3434ff',
  Time: '#FFE6FF',
  ReadMore: '#0000EE',
  Frequency: '#92C5FF',
  TimeOfDay: '#AB98F8',
  PlaceHolder: 'rgba(0,0,0,0.4)',
} as const;

/**
 * **TODO: centralize and standardize rewards, paths, courses
 * preset color palettes for user-generated tags (rewards, paths, courses)
 */
export const PRESET_COLORS = [
  '#FFD581', // golden butter (already good)
  '#FFB5A0', // coral peach (XPAccent vibe)
  '#F4B6C2', // bold blush pink
  '#99C8E8', // your Primary (strong sky blue)
  '#DCC4FF', // vibrant lavender
  '#A3F7BB', // fresh mint
  '#7FD1AE', // RewardsAccent tone
  '#FFE066', // brighter yellow pop
  '#FF8FAB', // richer pink
  '#B8B5FF', // deeper periwinkle
  '#6DDDDD', // bright aqua
  '#FFC6FF', // electric pastel magenta
] as const;

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
    primary: ['#FF6E83', '#C0FCF7']
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
  notes: {
    background: ['#FFDBF7', '#FFD3FF', '#FFE7FF'],
    primary: ['#75A9FF', '#FFA4D8']
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
  rewards: {
    background: ['#f9ffa6', '#ffe8b1', '#FF7F50'],
    primary: ['#B9C042', COLORS.Rewards],
  },
  stats: {
    background: ['#f89999', '#f6c0ba', '#99aceb']
  }
} as const;

/**
 * tag colors for focus session tags
 */
export const TAG_COLORS: Record<string, string> = {
  Study:    '#DCC4FF', // lavender
  Work:     '#99C8E8', // sky blue
  Reading:  '#A3F7BB', // mint
  Writing:  '#FFB5A0', // coral peach
  Coding:   '#6DDDDD', // aqua
  Research: '#FFE066', // yellow
  Planning: '#F4B6C2', // blush pink
  Review:   '#B8B5FF', // periwinkle
};

/**
 * button action colors
 */
export const BUTTON_COLORS = {
  Save: '#70A9FF',
  Done: '#FFD581',
  Close: '#ffc8c8ff',
  Delete: '#ff5656',
  Edit: '#d8c8ffff',
  Quiet: '#F2F2F2',
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
  // 🌈 very positive — vivid, saturated (the happiest colors pop hardest)
  great: '#FF6AF0',        // playful pink
  excited: '#B76CFF',     // vibrant purple
  energetic: '#C7DE6A',   // fresh lime
  joyful: '#FFD166',      // sunny yellow
  motivated: '#FF8A3D',   // vivid tangerine
  proud: '#FF5E9C',       // bold rose

  // 🙂 positive / content — medium saturation, softer glow
  happy: '#00AC8F',       // teal-green
  relaxed: '#6DDDFF',     // soft sky blue
  peaceful: '#8ED1C6',    // muted aqua
  grateful: '#F4B6C2',    // warm blush
  good: '#3DC97C',        // clear green
  hopeful: '#5EB8FF',     // open blue
  content: '#98D7A5',     // soft meadow green

  // 😐 neutral
  okay: '#FF9752',        // soft orange
  tired: '#C2B8A3',       // warm beige
  numb: '#9AA3A8',        // cool gray
  bored: '#B0B0B0',       // neutral gray
  none: '#D8D3C8',        // quiet warm gray
  sleepy: '#B0A8D9',      // dusty periwinkle

  // 😣 stressed / uneasy
  stressed: '#A81BA8',    // sharp purple
  anxious: '#548D8B',     // muted teal
  overwhelmed: '#7B6D8D', // dusty violet
  frustrated: '#ACACAC',  // flat gray
  nervous: '#BCA84F',     // uneasy olive
  worried: '#7A8BA8',     // grayed steel blue

  // 😞 low / heavy
  sad: '#4075E6',         // soft blue
  lonely: '#6B7C9E',      // desaturated blue
  depressed: '#4B5563',   // dark slate
  hopeless: '#374151',    // deeper slate
  disappointed: '#7E8D95',// washed slate teal
  guilty: '#9B7B8D',      // muted plum
  unmotivated: '#9E9689', // faded clay

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