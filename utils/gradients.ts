// dynamic background for HabitPage
export const getGradientForTime = (): [string, string, ...string[]] => {
  const hour = new Date().getHours();
  
  if (hour >= 5 && hour < 7)
    return ['#e0c3fc', '#8ec5fc'];

  if (hour >= 7 && hour < 10)
    return ['#fdfbfb', '#fdfbfb', '#ffafbd'];

  if (hour >= 10 && hour < 12)
    return ['#fffafa', '#add8e6'];

  // 12pm - 3pm
  if (hour >= 12 && hour < 15)
    return ['#a1c4fd', '#c2e9fb'];

  // 3pm - 4pm
  if (hour >= 15 && hour < 16)
    return ['#6495ed', '#7c9ec3'];

  // 4pm - 5pm
  if (hour >= 16 && hour < 17)
    return ['#E55D87', '#5FC3E4'];

  // 6pm - 9pm
  if (hour >= 18 && hour < 21)
    return ['#fffbd5', '#b20a2c'];

  // 9pm - 12am
  if (hour >= 21 && hour < 24)
        return ['#a8c0ff', '#3f2b96'];

  // 12am - 5am
  return [
    '#7F5A83', 
    '#0D324D', 
];
};