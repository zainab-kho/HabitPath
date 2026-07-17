// @/lib/journal/journalCacheStore.ts
//
// The on-device journal cache (AsyncStorage). Everything in memory stays plain
// objects; this layer just encrypts the WHOLE blob on the way to disk and
// decrypts it on the way back — so the stored copy has no readable text.
//
// A marker prefix distinguishes an encrypted blob from a legacy plaintext one,
// so an existing plaintext cache is read fine and re-saved encrypted (auto-migrates).

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getJournalKey } from '@/lib/journal/entryCrypto';
import { encryptText, decryptText } from '@/lib/crypto/journalCrypto';

export const JOURNAL_CACHE_KEY = '@journal_entries';
const ENC = 'encblob1:';

/** Read the cached rows (decrypting the blob if needed). */
export async function getCache(userId: string): Promise<any[]> {
  const raw = await AsyncStorage.getItem(JOURNAL_CACHE_KEY);
  if (!raw) return [];

  if (raw.startsWith(ENC)) {
    const key = await getJournalKey(userId);
    if (!key) return []; // encrypted, but this device is locked — nothing readable
    const json = decryptText(raw.slice(ENC.length), key);
    return json ? JSON.parse(json) : [];
  }

  // legacy plaintext blob (pre-encryption) — read as-is; the next save encrypts it
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

/** Write the rows (encrypting the blob when encryption is on). */
export async function setCache(userId: string, rows: any[]): Promise<void> {
  const json = JSON.stringify(rows);
  const key = await getJournalKey(userId);
  // no key = encryption off → keep the plaintext behavior we had before
  const payload = key ? ENC + encryptText(json, key) : json;
  await AsyncStorage.setItem(JOURNAL_CACHE_KEY, payload);
}
