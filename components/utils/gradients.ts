// dynamic background for HabitPage
export const getGradientForTime = (): [string, string, ...string[]] => {
  const hour = new Date().getHours();
  
  if (hour >= 5 && hour < 7)
    return ['#eeb2b2', '#cc9999', '#e17e7e', '#ba6363', '#ff773e', '#db5858'];

  if (hour >= 7 && hour < 10)
    return ['#fdeceb', '#f7bfbe', '#ef7c7a', '#bedaf7', '#6ca0dc'];

  if (hour >= 10 && hour < 12)
    return ['#d7feff', '#d1eeff', '#b8dcfd', '#aac4fb', '#87aed8'];

  if (hour >= 12 && hour < 15)
    return ['#b0cdef', '#f6fafd', '#d3e4f8', '#25496b', '#5e789d'];

  if (hour >= 15 && hour < 16)
    return ['#5e789d', '#759eb8', '#A58FD2'];

  if (hour >= 16 && hour < 17)
    return ['#4a7c99', '#bdbdca', '#f5bdaa', '#ED6A5A', '#ff773e', '#235a5a'];

  if (hour >= 17 && hour < 21)
    return ['#f06261', '#a958a5', '#613e97'];

  // night (9pm to 5am)
  return [
    '#7F5A83', 
    '#0D324D', 
];
};