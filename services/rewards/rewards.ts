import { supabase } from '@/lib/supabase';
import { Reward } from '@/types/Reward';
import { Habit } from '@/types/Habit';
import {
  getRedeemedPointsFromDb,
  setRedeemedPointsInDb,
  getExchangeRateFromDb,
  setExchangeRateInDb,
  getPointsResetDateFromDb,
  setPointsResetDateInDb,
} from '@/lib/supabase/queries/stats';
import { getHabitDate } from '@/utils/dateUtils';


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
    link: row.link ?? undefined,
    recurring: row.recurring ?? false,
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
    link: reward.link ?? null,
    recurring: reward.recurring ?? false,
    date_added: reward.dateAdded,
    is_claimed: reward.isClaimed,
    date_claimed: reward.dateClaimed ?? null,
  };
}

// ─── rewards CRUD ────────────────────────────────────────────────────────────

export async function getRewards(userId: string): Promise<Reward[]> {
  const { data, error } = await supabase
    .from('rewards')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data ?? []).map(rowToReward);
}

export async function addReward(reward: Reward, userId: string): Promise<void> {
  const { error } = await supabase.from('rewards').insert([rewardToRow(reward, userId)]);
  if (error) throw error;
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

export async function clearWishlist(userId: string): Promise<void> {
  const { error } = await supabase
    .from('rewards')
    .delete()
    .eq('user_id', userId);
  if (error) throw error;
}

export async function resetPointsBalance(resetHour: number = 4, resetMinute: number = 0): Promise<void> {
  // Use the user's habit reset time to determine "today"
  // Set to the START of the current habit-day so completions from
  // this habit-day onward are counted, but nothing before it.
  // We subtract 1 day so today's completions (which equal this date) are INCLUDED.
  const currentHabitDay = getHabitDate(new Date(), resetHour, resetMinute); // e.g. "2025-03-10"
  
  // Store the day BEFORE today so the filter `date > resetDate` includes today's completions
  const resetDate = new Date(currentHabitDay);
  resetDate.setDate(resetDate.getDate() - 1);
  const resetDateStr = resetDate.toISOString().split('T')[0]; // "2025-03-09"

  await setPointsResetDateInDb(resetDateStr);
  await setRedeemedPointsInDb(0);
}

// ─── photo upload ─────────────────────────────────────────────────────────────

/**
 * Uploads a local file:// URI to the `reward-photos` Supabase Storage bucket
 * and returns the public https:// URL. Requires a public bucket named
 * `reward-photos` in the Supabase project.
 */
export async function uploadRewardPhoto(localUri: string, userId: string): Promise<string> {
  const arrayBuffer = await fetch(localUri).then(res => res.arrayBuffer());

  const ext = localUri.split('.').pop()?.toLowerCase() ?? 'jpg';
  const contentType = ext === 'png' ? 'image/png' : 'image/jpeg';
  const path = `${userId}/${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from('reward-photos')
    .upload(path, arrayBuffer, { contentType, upsert: false });

  if (error) {
    console.error('[uploadRewardPhoto] upload error:', error.message ?? error);
    throw error;
  }

  const { data } = supabase.storage.from('reward-photos').getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Best-effort removal of a reward photo from storage. Only acts on URLs that
 * live in the reward-photos bucket; local file:// URIs are ignored.
 */
export async function deleteRewardPhoto(photoUri: string | undefined): Promise<void> {
  if (!photoUri) return;
  const marker = '/reward-photos/';
  const idx = photoUri.indexOf(marker);
  if (idx === -1) return;
  const path = photoUri.slice(idx + marker.length);
  try {
    await supabase.storage.from('reward-photos').remove([path]);
  } catch {}
}

// ─── redeemed points ──────────────────────────────────────────────────────────

export async function getRedeemedPoints(): Promise<number> {
  try {
    return await getRedeemedPointsFromDb();
  } catch {
    return 0;
  }
}

export async function addRedeemedPoints(points: number): Promise<void> {
  try {
    const current = await getRedeemedPoints();
    await setRedeemedPointsInDb(current + points);
  } catch (err) {
    console.error('Error updating redeemed points:', err);
  }
}

// ─── exchange rate ────────────────────────────────────────────────────────────

export async function getExchangeRate(): Promise<number | null> {
  try {
    return await getExchangeRateFromDb();
  } catch {
    return null;
  }
}

export async function saveExchangeRate(rate: number): Promise<void> {
  try {
    await setExchangeRateInDb(rate);
  } catch (err) {
    console.error('Error saving exchange rate:', err);
  }
}

// ─── points reset date ────────────────────────────────────────────────────────

export async function getPointsResetDate(): Promise<string | null> {
  try {
    return await getPointsResetDateFromDb();
  } catch {
    return null;
  }
}

// ─── points computation ──────────────────────────────────────────────────────

// resetDate (YYYY-MM-DD): when set, only completions strictly after this date are counted.
// This ensures pre-reset habit toggles have no effect on the post-reset balance.
export function computeTotalPointsFromHabits(habits: Habit[], resetDate?: string): number {
  return habits.reduce((sum, h) => {
    const history = h.completionHistory ?? [];
    let completions = resetDate
      ? history.filter(date => date > resetDate).length
      : history.length;

    // keepUntil habits file completions on their cycle start, which can predate
    // the reset even when the habit was actually finished after it — credit the
    // latest entry when lastCompletedDate shows it was finished post-reset
    if (
      resetDate &&
      h.keepUntil &&
      h.lastCompletedDate &&
      h.lastCompletedDate > resetDate
    ) {
      const latest = [...history].sort().at(-1);
      if (latest && latest <= resetDate) {
        completions += 1;
      }
    }

    return sum + completions * (h.rewardPoints ?? 0);
  }, 0);
}
