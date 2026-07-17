// @/lib/crypto/journalVault.ts
//
// The "vault" — the friendly, high-level API the app uses. It hides the crypto,
// the keychain, and Supabase behind a few plain verbs:
//
//   setUpVault          — first-time setup (make keys, store them, return recovery key)
//   unlockWithPassphrase— open the vault on a new device with the passphrase
//   unlockWithRecovery  — open it with the recovery key (forgot passphrase)
//   getMasterKey        — the key for encrypting/decrypting entries (cached in memory)
//   hasVault / isUnlocked — status checks
//   changePassphrase    — swap the passphrase without re-encrypting entries
//   lockThisDevice      — forget the key here
//
// The master key is cached in a module variable during a session so we don't read
// the keychain for every entry.

import * as C from '@/lib/crypto/journalCrypto';
import { saveMasterKey, loadMasterKey, clearMasterKey } from '@/lib/crypto/keyStore';
import {
  fetchVault,
  saveVault,
  updateLockboxPassphrase,
} from '@/lib/supabase/queries/journalCrypto';

// in-memory cache of the unlocked master key for the current session
let cached: { userId: string; key: Uint8Array } | null = null;

/** Does this user have encryption set up (in the cloud)? */
export async function hasVault(userId: string): Promise<boolean> {
  return (await fetchVault(userId)) !== null;
}

/** Is the vault currently unlocked on THIS device (key present in the keychain/memory)? */
export async function isUnlocked(userId: string): Promise<boolean> {
  return (await getMasterKey(userId)) !== null;
}

/**
 * First-time setup. Generates the master key, salt, and recovery key, wraps the
 * master key into both lockboxes, stores the vault in Supabase, and stashes the
 * master key on this device. Returns the recovery key to SHOW ONCE.
 */
export async function setUpVault(
  userId: string,
  passphrase: string,
): Promise<{ recoveryDisplay: string }> {
  const master = C.generateMasterKey();
  const salt = C.generateSalt();
  const passKey = await C.derivePassphraseKey(passphrase, salt, C.ARGON2);
  const recovery = C.generateRecoveryKey();

  await saveVault(userId, {
    salt: C.bytesToBase64(salt),
    lockbox_passphrase: C.wrapKey(master, passKey),
    lockbox_recovery: C.wrapKey(master, recovery.key),
    argon: C.ARGON2,
  });

  await saveMasterKey(userId, C.bytesToBase64(master));
  cached = { userId, key: master };

  return { recoveryDisplay: recovery.display };
}

/** Open the vault on a device using the passphrase. Returns false if it's wrong. */
export async function unlockWithPassphrase(userId: string, passphrase: string): Promise<boolean> {
  const vault = await fetchVault(userId);
  if (!vault) return false;

  const salt = C.base64ToBytes(vault.salt);
  const passKey = await C.derivePassphraseKey(passphrase, salt, {
    t: vault.argon_t,
    m: vault.argon_m,
    p: vault.argon_p,
  });
  const master = C.unwrapKey(vault.lockbox_passphrase, passKey);
  if (!master) return false; // wrong passphrase — the lockbox refused to open

  await saveMasterKey(userId, C.bytesToBase64(master));
  cached = { userId, key: master };
  return true;
}

/** Open the vault with the recovery key (e.g. forgot passphrase). */
export async function unlockWithRecovery(userId: string, recoveryDisplay: string): Promise<boolean> {
  const vault = await fetchVault(userId);
  if (!vault) return false;

  const recKey = C.parseRecoveryKey(recoveryDisplay);
  if (!recKey) return false; // not a valid recovery key format

  const master = C.unwrapKey(vault.lockbox_recovery, recKey);
  if (!master) return false; // wrong recovery key

  await saveMasterKey(userId, C.bytesToBase64(master));
  cached = { userId, key: master };
  return true;
}

/**
 * Set a new passphrase. Requires the vault to already be unlocked on this device
 * (so we have the master key to re-wrap). Only the passphrase lockbox changes —
 * entries are untouched.
 */
export async function changePassphrase(userId: string, newPassphrase: string): Promise<boolean> {
  const master = await getMasterKey(userId);
  if (!master) return false;

  const vault = await fetchVault(userId);
  if (!vault) return false;

  const salt = C.base64ToBytes(vault.salt);
  const passKey = await C.derivePassphraseKey(newPassphrase, salt, {
    t: vault.argon_t,
    m: vault.argon_m,
    p: vault.argon_p,
  });
  await updateLockboxPassphrase(userId, C.wrapKey(master, passKey));
  return true;
}

/** The master key for encrypting/decrypting entries, or null if the vault is locked here. */
export async function getMasterKey(userId: string): Promise<Uint8Array | null> {
  if (cached?.userId === userId) return cached.key;
  const b64 = await loadMasterKey(userId);
  if (!b64) return null;
  const key = C.base64ToBytes(b64);
  cached = { userId, key };
  return key;
}

/** Forget the key on this device (re-locks the journal here). */
export async function lockThisDevice(userId: string): Promise<void> {
  await clearMasterKey(userId);
  if (cached?.userId === userId) cached = null;
}
