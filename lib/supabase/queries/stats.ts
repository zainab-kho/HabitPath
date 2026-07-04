import { supabase } from '@/lib/supabase';

// ─── redeemed points ──────────────────────────────────────────────────────────

export async function getRedeemedPointsFromDb(): Promise<number> {
  const { data, error } = await supabase
    .from('user_stats')
    .select('redeemed_points')
    .single();
  return data?.redeemed_points ?? 0;
}

export async function setRedeemedPointsInDb(points: number): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return;
  }
  const { error } = await supabase
    .from('user_stats')
    .upsert({ user_id: user.id, redeemed_points: points }, { onConflict: 'user_id' });
}

// ─── exchange rate ────────────────────────────────────────────────────────────

export async function getExchangeRateFromDb(): Promise<number | null> {
  const { data, error } = await supabase
    .from('user_stats')
    .select('exchange_rate')
    .single();
  return data?.exchange_rate ?? null;
}

export async function setExchangeRateInDb(rate: number): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return;
  }
  const { error } = await supabase
    .from('user_stats')
    .upsert({ user_id: user.id, exchange_rate: rate }, { onConflict: 'user_id' });
}

// ─── points reset date ────────────────────────────────────────────────────────

export async function getPointsResetDateFromDb(): Promise<string | null> {
  const { data, error } = await supabase
    .from('user_stats')
    .select('points_reset_date')
    .single();
  return data?.points_reset_date ?? null;
}

export async function setPointsResetDateInDb(date: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return;
  }
  const { error } = await supabase
    .from('user_stats')
    .upsert({ user_id: user.id, points_reset_date: date }, { onConflict: 'user_id' });
}
