// lib/journal-migration.ts
// One-time migration: encrypts all existing plaintext journal entries in Supabase.
// Runs in the background on first app open after the encryption update.

import AsyncStorage from '@react-native-async-storage/async-storage';

import { STORAGE_KEYS } from '@/storage/keys';
import { supabase } from '@/lib/supabase';
import {
  getOrCreateEncryptionKey,
  isEncrypted,
  encryptEntry,
} from '@/lib/journal-crypto';

const BATCH_SIZE = 10;

/**
 * Encrypt all existing plaintext journal entries in Supabase.
 * Safe to call multiple times — skips already-encrypted entries and sets a flag
 * so it only runs the full scan once.
 */
export async function migrateExistingEntriesToEncrypted(userId: string): Promise<void> {
  try {
    // check if already migrated
    const migrated = await AsyncStorage.getItem(STORAGE_KEYS.ENCRYPTION_MIGRATED);
    if (migrated === '1') return;

    const keyHex = await getOrCreateEncryptionKey(userId);

    // fetch all entries that have a non-null entry field
    const { data, error } = await supabase
      .from('journal_entries')
      .select('id, entry')
      .eq('user_id', userId)
      .not('entry', 'is', null);

    if (error) {
      console.error('Migration: failed to fetch entries:', error);
      return;
    }

    if (!data || data.length === 0) {
      await AsyncStorage.setItem(STORAGE_KEYS.ENCRYPTION_MIGRATED, '1');
      return;
    }

    // filter to only plaintext entries
    const plaintext = data.filter(row => row.entry && !isEncrypted(row.entry));

    if (plaintext.length === 0) {
      await AsyncStorage.setItem(STORAGE_KEYS.ENCRYPTION_MIGRATED, '1');
      return;
    }

    console.log(`Migration: encrypting ${plaintext.length} journal entries...`);

    // process in batches
    for (let i = 0; i < plaintext.length; i += BATCH_SIZE) {
      const batch = plaintext.slice(i, i + BATCH_SIZE);

      await Promise.all(
        batch.map(async (row) => {
          const encrypted = encryptEntry(row.entry!, keyHex);
          const { error: updateError } = await supabase
            .from('journal_entries')
            .update({ entry: encrypted })
            .eq('id', row.id)
            .eq('user_id', userId);

          if (updateError) {
            console.error(`Migration: failed to encrypt entry ${row.id}:`, updateError);
          }
        }),
      );
    }

    await AsyncStorage.setItem(STORAGE_KEYS.ENCRYPTION_MIGRATED, '1');
    console.log('Migration: journal encryption complete');
  } catch (err) {
    console.error('Migration: unexpected error:', err);
    // don't set the flag — retry on next app open
  }
}
