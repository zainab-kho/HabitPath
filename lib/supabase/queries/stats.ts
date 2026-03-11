import { supabase } from '@/lib/supabase';

// ─── redeemed points ──────────────────────────────────────────────────────────

export async function getRedeemedPointsFromDb(): Promise<number> {
  const { data, error } = await supabase
    .from('user_stats')
    .select('redeemed_points')
    .single();
  // **LOG
  console.log('[**LOG stats] getRedeemedPoints → data:', data, '| error:', error)
  return data?.redeemed_points ?? 0;
}

export async function setRedeemedPointsInDb(points: number): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    // **LOG
    console.log('[**LOG stats] setRedeemedPoints → no auth user, aborting')
    return;
  }
  // **LOG
  console.log('[**LOG stats] setRedeemedPoints → upserting', points, 'for user_id:', user.id)
  const { error } = await supabase
    .from('user_stats')
    .upsert({ user_id: user.id, redeemed_points: points }, { onConflict: 'user_id' });
  // **LOG
  console.log('[**LOG stats] setRedeemedPoints → upsert error:', error)
}

// ─── exchange rate ────────────────────────────────────────────────────────────

export async function getExchangeRateFromDb(): Promise<number | null> {
  const { data, error } = await supabase
    .from('user_stats')
    .select('exchange_rate')
    .single();
  // **LOG
  console.log('[**LOG stats] getExchangeRate → data:', data, '| error:', error)
  return data?.exchange_rate ?? null;
}

export async function setExchangeRateInDb(rate: number): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    // **LOG
    console.log('[**LOG stats] setExchangeRate → no auth user, aborting')
    return;
  }
  // **LOG
  console.log('[**LOG stats] setExchangeRate → upserting rate', rate, 'for user_id:', user.id)
  const { error } = await supabase
    .from('user_stats')
    .upsert({ user_id: user.id, exchange_rate: rate }, { onConflict: 'user_id' });
  // **LOG
  console.log('[**LOG stats] setExchangeRate → upsert error:', error)
}

// ─── points reset date ────────────────────────────────────────────────────────

export async function getPointsResetDateFromDb(): Promise<string | null> {
  const { data, error } = await supabase
    .from('user_stats')
    .select('points_reset_date')
    .single();
  // **LOG
  console.log('[**LOG stats] getPointsResetDate → data:', data, '| error:', error)
  return data?.points_reset_date ?? null;
}

export async function setPointsResetDateInDb(date: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    // **LOG
    console.log('[**LOG stats] setPointsResetDate → no auth user, aborting')
    return;
  }
  // **LOG
  console.log('[**LOG stats] setPointsResetDate → upserting reset_date', date, 'for user_id:', user.id)
  const { error } = await supabase
    .from('user_stats')
    .upsert({ user_id: user.id, points_reset_date: date }, { onConflict: 'user_id' });
  // **LOG
  console.log('[**LOG stats] setPointsResetDate → upsert error:', error)
}
