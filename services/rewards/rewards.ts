import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '@/storage/keys';
import { Reward } from '@/types/Reward';
import { Habit } from '@/types/Habit';

export async function getRewards(): Promise<Reward[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.REWARDS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function saveRewards(rewards: Reward[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.REWARDS, JSON.stringify(rewards));
  } catch (err) {
    console.error('Error saving rewards:', err);
  }
}

export async function getRedeemedPoints(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.REDEEMED_POINTS);
    return raw ? Number(raw) : 0;
  } catch {
    return 0;
  }
}

export async function addRedeemedPoints(points: number): Promise<void> {
  try {
    const current = await getRedeemedPoints();
    await AsyncStorage.setItem(STORAGE_KEYS.REDEEMED_POINTS, String(current + points));
  } catch (err) {
    console.error('Error updating redeemed points:', err);
  }
}

export async function getExchangeRate(): Promise<number | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.EXCHANGE_RATE);
    return raw ? Number(raw) : null;
  } catch {
    return null;
  }
}

export async function saveExchangeRate(rate: number): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.EXCHANGE_RATE, String(rate));
  } catch (err) {
    console.error('Error saving exchange rate:', err);
  }
}

export function computeTotalPointsFromHabits(habits: Habit[]): number {
  return habits.reduce((sum, h) => {
    const completions = h.completionHistory?.length ?? 0;
    return sum + completions * (h.rewardPoints ?? 0);
  }, 0);
}
