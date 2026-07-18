// @/lib/supabase/queries/feedback.ts
// Feedback reports land in the `feedback` table (see supabase/feedback.sql);
// read them in the Supabase dashboard. Insert-only via RLS.
import { supabase } from '@/lib/supabase';

export async function submitFeedback(
  userId: string,
  message: string,
  page: string | null,
): Promise<void> {
  const { error } = await supabase.from('feedback').insert([
    { user_id: userId, message: message.trim(), page },
  ]);
  if (error) throw error;
}
