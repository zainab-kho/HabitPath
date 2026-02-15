import { supabase } from '@/lib/supabase';
import { Habit } from '@/types/Habit';

export const fetchHabitsForDate = async (
  userId: string,
  viewingDate: Date,
  dateString: string
): Promise<Habit[]> => {
  const { data, error } = await supabase
    .from('habits')
    .select('*')
    .eq('user_id', userId)
    .lte('start_date', dateString)
    .or(`archived_at.is.null,archived_at.gt.${viewingDate.toISOString()}`);

  if (error) throw error;
  return data ?? [];
};

export const archiveStaleHabits = async (
  userId: string,
  daysThreshold = 14
): Promise<void> => {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysThreshold);
  const cutoffStr = cutoff.toISOString().split('T')[0];

  const { error } = await supabase
    .from('habits')
    .update({ archived_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('frequency', 'None')
    .is('archived_at', null)
    .lt('start_date', cutoffStr);

  if (error) throw error;
};