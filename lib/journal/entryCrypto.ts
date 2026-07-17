// @/lib/journal/entryCrypto.ts
//
// Bridges the journal to the crypto vault. It encrypts/decrypts just the two
// sensitive fields — `entry` and `mood` — right at the Supabase boundary.
//
// A small marker prefix distinguishes an ENCRYPTED value from a legacy PLAINTEXT
// one, so entries written before encryption keep working next to new locked ones
// (nothing is lost, and Phase 3's migration can convert the old ones later).
// The marker starts with a control character that never appears in real text.

import * as Vault from '@/lib/crypto/journalVault';
import { encryptText, decryptText } from '@/lib/crypto/journalCrypto';

const ENC = 'enc1:';

type Fields = { entry?: string | null; mood?: string | null };

/** True if a stored value is one of our encrypted blobs. */
export function isEncrypted(v: string | null | undefined): boolean {
  return typeof v === 'string' && v.startsWith(ENC);
}

/**
 * Encrypt `entry` + `mood` for storage. With no key (encryption off) the values
 * pass through unchanged, so users who haven't turned on encryption are unaffected.
 */
export function encryptEntryFields(fields: Fields, key: Uint8Array | null): { entry: string | null; mood: string | null } {
  const enc = (v?: string | null) =>
    !key || v == null || v === '' ? (v ?? null) : ENC + encryptText(v, key);
  return { entry: enc(fields.entry), mood: enc(fields.mood) };
}

/**
 * Decrypt `entry` + `mood` coming from storage. Legacy plaintext passes through.
 * An encrypted value with no key (this device is locked) comes back as null.
 */
export function decryptEntryFields(fields: Fields, key: Uint8Array | null): { entry: string | null; mood: string | null } {
  const dec = (v?: string | null) => {
    if (v == null) return null;
    if (!v.startsWith(ENC)) return v;          // legacy plaintext
    if (!key) return null;                     // encrypted, but locked here
    return decryptText(v.slice(ENC.length), key);
  };
  return { entry: dec(fields.entry), mood: dec(fields.mood) };
}

/**
 * Encrypt a single field ONLY if it's still plaintext. Already-encrypted values
 * pass through untouched — this is what makes the migration safe to re-run and
 * guarantees we never double-encrypt.
 */
export function encryptFieldIfPlaintext(v: string | null | undefined, key: Uint8Array): string | null {
  if (v == null || v === '' || v.startsWith(ENC)) return v ?? null;
  return ENC + encryptText(v, key);
}

/** The master key for this user, or null if encryption is off / this device is locked. */
export async function getJournalKey(userId: string): Promise<Uint8Array | null> {
  return Vault.getMasterKey(userId);
}

// status helpers for gating the journal behind "unlock this device"
export const hasVault = Vault.hasVault;
export const isUnlocked = Vault.isUnlocked;
