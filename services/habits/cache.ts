import AsyncStorage from '@react-native-async-storage/async-storage';

import { STORAGE_KEYS } from '@/storage/keys';
import { Habit } from '@/types/Habit';
import { daysBetween, getHabitDate } from '@/utils/dateUtils';

// ─── types ────────────────────────────────────────────────────────────────────

export interface HabitsCache {
  habits: Habit[];
  cachedAt: string;
  cachedForDates: string[];
}

// ─── constants ────────────────────────────────────────────────────────────────

const CACHE_WINDOW_DAYS = 3;

// ─── helpers ──────────────────────────────────────────────────────────────────

export function isInCacheWindow(date: Date): boolean {
  return Math.abs(daysBetween(date, new Date())) <= CACHE_WINDOW_DAYS;
}

export function getCacheWindowDates(reset: { hour: number; minute: number }): string[] {
  return Array.from({ length: CACHE_WINDOW_DAYS * 2 + 1 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i - CACHE_WINDOW_DAYS);
    return getHabitDate(d, reset.hour, reset.minute);
  });
}

// ─── load / save ──────────────────────────────────────────────────────────────

export async function loadFromCache(): Promise<Habit[] | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.HABITS_CACHE);
    if (!raw) return null;

    const parsed = JSON.parse(raw);

    // current cache shape
    if (Array.isArray(parsed?.habits)) {
      return parsed.habits;
    }

    // legacy: cache was a plain array
    if (Array.isArray(parsed)) {
      return parsed;
    }

    console.warn('Invalid habits cache shape');
    return null;
  } catch (err) {
    console.error('Error loading from cache:', err);
    return null;
  }
}

export async function saveToCache(
  habitsData: Habit[],
  reset: { hour: number; minute: number }
): Promise<void> {
  try {
    const cacheData: HabitsCache = {
      habits: habitsData,
      cachedAt: new Date().toISOString(),
      cachedForDates: getCacheWindowDates(reset),
    };
    await AsyncStorage.setItem(STORAGE_KEYS.HABITS_CACHE, JSON.stringify(cacheData));
  } catch (err) {
    console.error('Error saving to cache:', err);
  }
}

// ─── points ───────────────────────────────────────────────────────────────────

export async function getTotalPoints(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.TOTAL_POINTS);
    return raw ? Number(raw) : 0;
  } catch {
    return 0;
  }
}
