// @/lib/crypto/keyStore.ts
//
// Where the master key lives on THIS device. Uses expo-secure-store, which is the
// iOS Keychain / Android Keystore — hardware-backed storage only your app can read.
//
// Two deliberate security choices:
//   • WHEN_UNLOCKED  — the key is only readable while the phone is unlocked.
//   • THIS_DEVICE_ONLY — it never syncs to iCloud or another device. Moving to a
//                        new phone goes through the passphrase, not a synced key.

import * as SecureStore from 'expo-secure-store';

const PREFIX = 'journal_master_key_';

// SecureStore keys allow only [A-Za-z0-9._-]; user ids are UUIDs (hyphens ok),
// but we sanitize just in case.
function slot(userId: string): string {
  return PREFIX + userId.replace(/[^A-Za-z0-9._-]/g, '_');
}

/** Save the master key (base64) into the device keychain. */
export async function saveMasterKey(userId: string, keyB64: string): Promise<void> {
  await SecureStore.setItemAsync(slot(userId), keyB64, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

/** Read the master key back (base64), or null if this device isn't unlocked yet. */
export async function loadMasterKey(userId: string): Promise<string | null> {
  return SecureStore.getItemAsync(slot(userId));
}

/** Forget the master key on this device (re-locks the journal here). */
export async function clearMasterKey(userId: string): Promise<void> {
  await SecureStore.deleteItemAsync(slot(userId));
}
