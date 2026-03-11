export function lightenColor(hex: string, percent: number) {
  const num = parseInt(hex.replace('#', ''), 16);

  let r = (num >> 16) + Math.round(255 * percent);
  let g = ((num >> 8) & 0x00FF) + Math.round(255 * percent);
  let b = (num & 0x0000FF) + Math.round(255 * percent);

  r = Math.min(255, r);
  g = Math.min(255, g);
  b = Math.min(255, b);

  return `rgb(${r}, ${g}, ${b})`;
}

export const darkenColor = (hex: string, amount: number = 0.15): string => {
  const normalized = hex.replace('#', '');

  const r = parseInt(normalized.substring(0, 2), 16);
  const g = parseInt(normalized.substring(2, 4), 16);
  const b = parseInt(normalized.substring(4, 6), 16);

  const darken = (channel: number) =>
    Math.max(0, Math.floor(channel * (1 - amount)));

  const newR = darken(r).toString(16).padStart(2, '0');
  const newG = darken(g).toString(16).padStart(2, '0');
  const newB = darken(b).toString(16).padStart(2, '0');

  return `#${newR}${newG}${newB}`;
};