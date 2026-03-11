// constants/pathColors.ts (or inside constants/colors.ts)
export const PATH_COLORS = {
  green: '#589b72',
  blue: '#40BAFF',
  red: '#FF8B77',
  yellow: '#F9E282',
  orange: '#FFB456',
  pink: '#FF90AB',
  purple: '#AEBEFF',
  gray: '#9DB0A3',
} as const;

export type PathColorKey = keyof typeof PATH_COLORS;

export const PATH_COLOR_OPTIONS = Object.entries(PATH_COLORS).map(([name, hex]) => ({
  name: name as PathColorKey,
  hex,
}));