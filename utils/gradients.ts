import { useEffect, useState } from 'react';

// dynamic background for HabitPage
export const getGradientForTime = (): [string, string, ...string[]] => {
  const hour = new Date().getHours();
  
  if (hour >= 5 && hour < 7)
    return ['#e0c3fc', '#8ec5fc'];

  if (hour >= 7 && hour < 9)
    return ['#fdfbfb', '#fcc6c6', '#fba3b1'];

  if (hour >= 9 && hour < 12)
    return ['#fffafa', '#add8e6'];

  // 12pm - 3pm
  if (hour >= 12 && hour < 15)
    return ['#a1c4fd', '#c2e9fb'];

  // 3pm - 5pm
  if (hour >= 15 && hour < 18)
    return ['#c2e9fb', '#6495ed'];

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

// reactive version — re-checks the hour every minute so the background
// updates on its own instead of only when something forces a re-render
export function useGradientForTime(): [string, string, ...string[]] {
  const [gradient, setGradient] = useState<[string, string, ...string[]]>(getGradientForTime);

  useEffect(() => {
    const id = setInterval(() => {
      setGradient(prev => {
        const next = getGradientForTime();
        // keep the same array reference if unchanged to avoid pointless re-renders
        return prev.join() === next.join() ? prev : next;
      });
    }, 60_000);
    return () => clearInterval(id);
  }, []);

  return gradient;
}