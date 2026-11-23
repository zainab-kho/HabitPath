// type helpers for TypeScript autocomplete
export type MainMoodColor = keyof typeof MAIN_MOOD_COLORS;
export type MoodColor = keyof typeof MOOD_COLORS;

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
  // very positive — vivid, saturated (the happiest colors pop hardest)
  great: '#FF6AF0',        // playful pink
  excited: '#B76CFF',     // vibrant purple
  energetic: '#C7DE6A',   // fresh lime
  joyful: '#FFD166',      // sunny yellow
  motivated: '#FF8A3D',   // vivid tangerine
  proud: '#FF5E9C',       // bold rose

  // positive / content — medium saturation, softer glow
  happy: '#00AC8F',       // teal-green
  relaxed: '#6DDDFF',     // soft sky blue
  peaceful: '#8ED1C6',    // muted aqua
  grateful: '#F4B6C2',    // warm blush
  good: '#3DC97C',        // clear green
  hopeful: '#5EB8FF',     // open blue
  content: '#98D7A5',     // soft meadow green

  // neutral
  okay: '#FF9752',        // soft orange
  tired: '#C2B8A3',       // warm beige
  numb: '#9AA3A8',        // cool gray
  bored: '#B0B0B0',       // neutral gray
  sleepy: '#B0A8D9',      // dusty periwinkle

  // stressed / uneasy
  stressed: '#A81BA8',    // sharp purple
  anxious: '#548D8B',     // muted teal
  overwhelmed: '#7B6D8D', // dusty violet
  frustrated: '#ACACAC',  // flat gray
  nervous: '#BCA84F',     // uneasy olive
  worried: '#7A8BA8',     // grayed steel blue

  // low / heavy
  sad: '#4075E6',         // soft blue
  lonely: '#6B7C9E',      // desaturated blue
  depressed: '#4B5563',   // dark slate
  hopeless: '#374151',    // deeper slate
  disappointed: '#7E8D95',// washed slate teal
  guilty: '#9B7B8D',      // muted plum
  unmotivated: '#9E9689', // faded clay

  // anger
  angry: '#FF3B3B',       // strong red
  irritated: '#E85D5D',   // muted red

  // physical state
  sick: '#EEE8A9',        // pale yellow
  exhausted: '#8B8B8B',   // dull gray

  none: '#fff',
} as const;