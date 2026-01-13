// @/utils/journalSync.ts
// utility for syncing journal entries between AsyncStorage and Supabase
import { JournalEntry } from '@/components/types/JournalEntry';
import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@journal_entries';
const PENDING_SYNC_KEY = '@journal_pending_sync';

/**
 * save entry locally and mark for sync
 */
export async function saveEntryLocally(entry: JournalEntry) {
  try {
    // save to main cache
    const existing = await AsyncStorage.getItem(STORAGE_KEY);
    const allEntries: JournalEntry[] = existing ? JSON.parse(existing) : [];
    allEntries.push(entry);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(allEntries));

    // mark as pending sync
    const pending = await AsyncStorage.getItem(PENDING_SYNC_KEY);
    const pendingEntries: JournalEntry[] = pending ? JSON.parse(pending) : [];
    pendingEntries.push(entry);
    await AsyncStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(pendingEntries));

    console.log('**LOG: Entry saved locally and marked for sync');
    return true;
  } catch (error) {
    console.error('Error: Error saving locally:', error);
    return false;
  }
}

/**
 * sync pending entries to Supabase
 */
export async function syncPendingEntries(userId: string) {
  try {
    const pending = await AsyncStorage.getItem(PENDING_SYNC_KEY);
    if (!pending) {
      console.log('No pending entries to sync');
      return { success: true, synced: 0 };
    }

    const pendingEntries: JournalEntry[] = JSON.parse(pending);
    if (pendingEntries.length === 0) {
      return { success: true, synced: 0 };
    }

    console.log(`syncing ${pendingEntries.length} pending entries...`);

    // prepare entries for Supabase
    const entriesToSync = pendingEntries.map(entry => ({
      id: entry.id,
      user_id: userId,
      date: typeof entry.date === 'string' ? entry.date : entry.date.toISOString(),
      time: entry.time,
      mood: entry.mood || null,
      location: entry.location || null,
      entry: entry.entry || null,
      created_at: typeof entry.date === 'string' ? entry.date : entry.date.toISOString(),
    }));

    // sync to Supabase
    const { data, error } = await supabase
      .from('journal_entries')
      .insert(entriesToSync);

    if (error) {
      console.error('Error: Sync failed:', error);
      return { success: false, synced: 0, error };
    }

    // clear pending entries after successful sync
    await AsyncStorage.setItem(PENDING_SYNC_KEY, JSON.stringify([]));
    console.log(`**LOG: successfully synced ${pendingEntries.length} entries`);

    return { success: true, synced: pendingEntries.length };
  } catch (error) {
    console.error('Error: Sync error:', error);
    return { success: false, synced: 0, error };
  }
}

/**
 * load entries from cache first, then sync with Supabase
 */
export async function loadEntries(userId: string): Promise<JournalEntry[]> {
  try {
    // load from cache immediately (fast)
    const cached = await AsyncStorage.getItem(STORAGE_KEY);
    const cachedEntries: JournalEntry[] = cached ? JSON.parse(cached) : [];

    // fetch from Supabase in background
    const { data, error } = await supabase
      .from('journal_entries')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false });

    if (error) {
      console.error('Error loading from Supabase:', error);
      return cachedEntries; // Return cache on error
    }

    // update cache with fresh data
    const freshEntries: JournalEntry[] = data.map(row => ({
      id: row.id,
      date: new Date(row.date),
      time: row.time,
      mood: row.mood,
      location: row.location,
      entry: row.entry,
    }));

    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(freshEntries));
    console.log('**LOG: Entries loaded and cache updated');

    return freshEntries;
  } catch (error) {
    console.error('Error loading entries:', error);
    return [];
  }
}

/**
 * get count of pending sync entries
 */
export async function getPendingSyncCount(): Promise<number> {
  try {
    const pending = await AsyncStorage.getItem(PENDING_SYNC_KEY);
    if (!pending) return 0;
    const pendingEntries: JournalEntry[] = JSON.parse(pending);
    return pendingEntries.length;
  } catch (error) {
    console.error('Error getting pending count:', error);
    return 0;
  }
}