// @/lib/journal/migrateJournal.ts
//
// One-time (idempotent) migration: encrypts any journal entries that are still
// stored as plaintext in Supabase. Safe to run repeatedly — it only touches rows
// that aren't already encrypted, so an interrupted run just resumes next time.
//
// Runs only when encryption is on AND this device is unlocked (we have the key).

import { supabase } from '@/lib/supabase';
import { getJournalKey, isEncrypted, encryptFieldIfPlaintext } from '@/lib/journal/entryCrypto';

/**
 * Encrypt every not-yet-encrypted entry for this user. Returns how many rows were
 * converted. A return of 0 means "nothing to do" (already migrated, or key missing).
 */
export async function migrateJournalEntries(userId: string): Promise<number> {
  const key = await getJournalKey(userId);
  if (!key) return 0; // encryption off, or this device is locked — don't touch anything

  const { data, error } = await supabase
    .from('journal_entries')
    .select('id, entry, mood')
    .eq('user_id', userId);

  if (error || !data) return 0;

  let converted = 0;
  for (const row of data) {
    const needsEntry = row.entry != null && row.entry !== '' && !isEncrypted(row.entry);
    const needsMood = row.mood != null && row.mood !== '' && !isEncrypted(row.mood);
    if (!needsEntry && !needsMood) continue; // already encrypted (or empty) — skip

    const update: { entry?: string | null; mood?: string | null } = {};
    if (needsEntry) update.entry = encryptFieldIfPlaintext(row.entry, key);
    if (needsMood) update.mood = encryptFieldIfPlaintext(row.mood, key);

    const { error: updateError } = await supabase
      .from('journal_entries')
      .update(update)
      .eq('id', row.id)
      .eq('user_id', userId);

    if (!updateError) converted += 1;
  }

  return converted;
}
