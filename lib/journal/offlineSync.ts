// @/lib/journal/offlineSync.ts
//
// Offline-first journal saves. Entries are always written to the AsyncStorage
// cache first; if the Supabase insert fails (e.g. no connection) the cached row
// keeps `pendingSync: true` and is retried the next time the journal loads with
// a connection. This is what makes "saved locally, will sync later" actually true.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';

export const JOURNAL_CACHE_KEY = '@journal_entries';

// Loosely-typed cache row — journal entries are cached as plain JSON with the
// date stored as a 'YYYY-MM-DD' string (not a Date). Offline-saved rows carry
// pendingSync: true until they reach Supabase.
export type CachedJournalRow = {
  id: string;
  date: string;
  time?: string;
  mood?: string | null;
  location?: string | null;
  entry?: string | null;
  lock?: boolean | string;
  song?: any;
  book?: any;
  show?: any;
  starred?: boolean;
  created_at?: string;
  pendingSync?: boolean;
};

async function readCache(): Promise<CachedJournalRow[]> {
  const raw = await AsyncStorage.getItem(JOURNAL_CACHE_KEY);
  return raw ? JSON.parse(raw) : [];
}

async function writeCache(rows: CachedJournalRow[]): Promise<void> {
  await AsyncStorage.setItem(JOURNAL_CACHE_KEY, JSON.stringify(rows));
}

// Build the Supabase row shape from a cached entry.
function toSupabaseRow(r: CachedJournalRow, userId: string) {
  const row: Record<string, any> = {
    id: r.id,
    user_id: userId,
    date: r.date,
    time: r.time,
    mood: r.mood ?? null,
    location: r.location ?? null,
    entry: r.entry ?? null,
    is_locked: !!r.lock,
    song: r.song ?? null,
    book: r.book ?? null,
    show: r.show ?? null,
  };
  // only send created_at for brand-new entries — for an edited existing entry the
  // cache row has no created_at, and omitting it keeps the original on the server
  if (r.created_at) row.created_at = r.created_at;
  return row;
}

/**
 * Merge a partial row into the cache by id (creating it if missing). Used by
 * offline edits so the change is stored and flagged for retry. Existing fields
 * not included in `row` (e.g. starred, created_at) are preserved.
 */
export async function upsertJournalCacheRow(
  row: Partial<CachedJournalRow> & { id: string },
): Promise<void> {
  const rows = await readCache();
  const idx = rows.findIndex(r => r.id === row.id);
  if (idx >= 0) {
    rows[idx] = { ...rows[idx], ...row };
  } else {
    rows.push(row as CachedJournalRow);
  }
  await writeCache(rows);
}

/** Flip a single cached entry to synced (after a successful online insert). */
export async function markJournalEntrySynced(id: string): Promise<void> {
  const rows = await readCache();
  let changed = false;
  const next = rows.map(r => {
    if (r.id === id && r.pendingSync) {
      changed = true;
      return { ...r, pendingSync: false };
    }
    return r;
  });
  if (changed) await writeCache(next);
}

/**
 * Pushes any offline-saved (pendingSync) journal entries to Supabase and clears
 * their flag on success. Uses upsert so it covers both new entries (offline
 * creates) and edits to existing ones. Returns the count still pending.
 */
export async function syncPendingJournalEntries(userId: string): Promise<number> {
  const rows = await readCache();
  const pending = rows.filter(r => r.pendingSync);
  if (pending.length === 0) return 0;

  let changed = false;
  let stillPending = 0;

  for (const r of pending) {
    const { error } = await supabase.from('journal_entries').upsert([toSupabaseRow(r, userId)]);
    if (!error) {
      r.pendingSync = false; // mutates the object inside `rows`
      changed = true;
    } else {
      stillPending += 1;
    }
  }

  if (changed) await writeCache(rows);
  return stillPending;
}
