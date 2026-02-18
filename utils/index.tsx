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