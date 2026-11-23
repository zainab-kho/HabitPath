// @/colors/buttons.ts
// one color per kind of button, so save is always blue, delete is always red, and so on

export const BUTTON_COLORS = {
  Save: '#70A9FF',
  Done: '#FFD581',
  Delete: '#ff5656',
  Edit: '#d8c8ffff',
  Quiet: '#F2F2F2',
  Cancel: '#f0f0f0',
  Disabled: '#ccc',
} as const;

export type ButtonColor = keyof typeof BUTTON_COLORS;
