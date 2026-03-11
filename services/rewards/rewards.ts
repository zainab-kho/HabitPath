import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { STORAGE_KEYS } from '@/storage/keys';
import { Reward } from '@/types/Reward';
import { Habit } from '@/types/Habit';

// ─── helpers ────────────────────────────────────────────────────────────────

function rowToReward(row: any): Reward {
  return {
    id: row.id,
    name: row.name,
    costPoints: row.cost_points,
    costDollars: row.cost_dollars,
    backgroundColor: row.background_color ?? undefined,
    photoUri: row.photo_uri ?? undefined,
    tags: row.tags ?? [],
    notes: row.notes ?? undefined,
    dateAdded: row.date_added,
    isClaimed: row.is_claimed,
    dateClaimed: row.date_claimed ?? undefined,
  };
}

function rewardToRow(reward: Reward, userId: string) {
  return {
    user_id: userId,
    name: reward.name,
    cost_points: reward.costPoints,
    cost_dollars: reward.costDollars,
    background_color: reward.backgroundColor ?? null,
    photo_uri: reward.photoUri ?? null,
    tags: reward.tags ?? [],
    notes: reward.notes ?? null,
    date_added: reward.dateAdded,
    is_claimed: reward.isClaimed,
    date_claimed: reward.dateClaimed ?? null,
  };
}

// ─── rewards CRUD ────────────────────────────────────────────────────────────

export async function getRewards(userId: string): Promise<Reward[]> {
  try {
    const { data, error } = await supabase
      .from('rewards')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    const rewards = (data ?? []).map(rowToReward);
    // keep local cache in sync
    await AsyncStorage.setItem(STORAGE_KEYS.REWARDS, JSON.stringify(rewards));
    return rewards;
  } catch (err) {
    console.error('getRewards failed, falling back to cache:', err);
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.REWARDS);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }
}

export async function addReward(reward: Reward, userId: string): Promise<void> {
  const row = rewardToRow(reward, userId);
  console.log('addReward userId:', userId);
  console.log('addReward row.user_id:', row.user_id);

  const { data: authData } = await supabase.auth.getUser();
  console.log('auth uid:', authData?.user?.id);

  const { error } = await supabase.from('rewards').insert([row]);

  if (error) {
    console.log('addReward failed:', error);
    throw error;
  }
}

export async function updateReward(reward: Reward, userId: string): Promise<void> {
  const { error } = await supabase
    .from('rewards')
    .update(rewardToRow(reward, userId))
    .eq('id', reward.id)
    .eq('user_id', userId);

  if (error) throw error;
}

export async function deleteReward(rewardId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('rewards')
    .delete()
    .eq('id', rewardId)
    .eq('user_id', userId);

  if (error) throw error;
}

// ─── photo upload ─────────────────────────────────────────────────────────────

/**
 * Uploads a local file:// URI to the `reward-photos` Supabase Storage bucket
 * and returns the public https:// URL.
 *
 * Requires a public bucket named `reward-photos` in your Supabase project.
 */
// export async function uploadRewardPhoto(localUri: string, userId: string): Promise<string> {
//   const response = await fetch(localUri);
//   const blob = await response.blob();

//   const ext = localUri.split('.').pop()?.toLowerCase() ?? 'jpg';
//   const path = `${userId}/${Date.now()}.${ext}`;

//   const { error } = await supabase.storage
//     .from('reward-photos')
//     .upload(path, blob, { contentType: `image/${ext}`, upsert: false });

//   if (error) throw error;

//   const { data } = supabase.storage.from('reward-photos').getPublicUrl(path);
//   return data.publicUrl;
// }

// ─── redeemed points (still local — no table for this) ───────────────────────

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

// ─── exchange rate (local) ───────────────────────────────────────────────────

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

// ─── points computation ──────────────────────────────────────────────────────

export function computeTotalPointsFromHabits(habits: Habit[]): number {
  return habits.reduce((sum, h) => {
    const completions = h.completionHistory?.length ?? 0;
    return sum + completions * (h.rewardPoints ?? 0);
  }, 0);
}
