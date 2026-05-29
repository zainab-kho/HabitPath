// lib/journal-crypto.ts
// Client-side AES-256-GCM encryption for journal entries.
// The encryption key lives in the device keychain (expo-secure-store) and never
// leaves the device. A PIN-encrypted backup of the key is stored in Supabase so
// users can recover on a new device.

import * as SecureStore from 'expo-secure-store';
import crypto from 'react-native-quick-crypto';
import { Buffer } from 'react-native-quick-crypto';

import { STORAGE_KEYS } from '@/storage/keys';
import { supabase } from '@/lib/supabase';

// ─── constants ──────────────────────────────────────────────────────────────

const CIPHER_PREFIX = 'ENC:v1:';
const AES_KEY_BYTES = 32;  // 256-bit
const IV_BYTES = 12;       // standard GCM nonce
const TAG_BYTES = 16;      // GCM auth tag
const PBKDF2_ITERATIONS = 100_000;
const PBKDF2_SALT_BYTES = 16;

// ─── key management ─────────────────────────────────────────────────────────

function secureStoreKey(userId: string): string {
  return `${STORAGE_KEYS.ENCRYPTION_KEY_PREFIX}${userId}`;
}

/** Check if the encryption key exists locally for this user. */
export async function hasEncryptionKey(userId: string): Promise<boolean> {
  const stored = await SecureStore.getItemAsync(secureStoreKey(userId));
  return !!stored;
}

/**
 * Get the AES-256 key from SecureStore, or generate one on first use.
 * Returns the key as a hex string.
 */
export async function getOrCreateEncryptionKey(userId: string): Promise<string> {
  const storeKey = secureStoreKey(userId);
  const existing = await SecureStore.getItemAsync(storeKey);

  if (existing) return existing;

  // generate a fresh 256-bit key
  const keyBytes = crypto.randomBytes(AES_KEY_BYTES);
  const keyHex = Buffer.from(keyBytes).toString('hex');

  await SecureStore.setItemAsync(storeKey, keyHex, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });

  return keyHex;
}

// ─── PIN-encrypted key backup ───────────────────────────────────────────────

/**
 * Derive a 256-bit key from the user's PIN + a random salt using PBKDF2.
 */
function derivePinKey(pin: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(pin, salt, PBKDF2_ITERATIONS, AES_KEY_BYTES, 'sha256');
}

/**
 * Encrypt the AES key with the user's PIN and store the backup in Supabase.
 * Call this after successful PIN verification.
 */
export async function createPinEncryptedKeyBackup(
  userId: string,
  pin: string,
): Promise<void> {
  const keyHex = await getOrCreateEncryptionKey(userId);
  const keyBuf = Buffer.from(keyHex, 'hex');

  // derive a wrapping key from the PIN
  const salt = crypto.randomBytes(PBKDF2_SALT_BYTES);
  const derivedKey = derivePinKey(pin, salt);

  // encrypt the AES key with the derived key
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv('aes-256-gcm', derivedKey, iv);

  const encrypted = Buffer.concat([
    cipher.update(keyBuf) as Buffer,
    cipher.final() as Buffer,
  ]);
  const tag = cipher.getAuthTag();

  // pack: salt(16) + iv(12) + tag(16) + encrypted(32) = 76 bytes
  const packed = Buffer.concat([salt, iv, tag, encrypted]);
  const backupString = packed.toString('base64');

  // upsert into Supabase
  const { error } = await supabase
    .from('encryption_key_backups')
    .upsert(
      { user_id: userId, encrypted_key: backupString },
      { onConflict: 'user_id' },
    );

  if (error) {
    console.error('Failed to save key backup:', error);
    throw new Error('Could not save encryption key backup');
  }
}

/**
 * Restore the encryption key from the PIN-encrypted backup in Supabase.
 * Call this on a new device after PIN verification.
 * Returns true if the key was successfully restored.
 */
export async function restoreKeyFromPinBackup(
  userId: string,
  pin: string,
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('encryption_key_backups')
      .select('encrypted_key')
      .eq('user_id', userId)
      .single();

    if (error || !data?.encrypted_key) return false;

    const packed = Buffer.from(data.encrypted_key, 'base64');

    // unpack: salt(16) + iv(12) + tag(16) + encrypted(32)
    const salt = packed.subarray(0, PBKDF2_SALT_BYTES);
    const iv = packed.subarray(PBKDF2_SALT_BYTES, PBKDF2_SALT_BYTES + IV_BYTES);
    const tag = packed.subarray(
      PBKDF2_SALT_BYTES + IV_BYTES,
      PBKDF2_SALT_BYTES + IV_BYTES + TAG_BYTES,
    );
    const encrypted = packed.subarray(PBKDF2_SALT_BYTES + IV_BYTES + TAG_BYTES);

    // derive the same wrapping key
    const derivedKey = derivePinKey(pin, salt);

    // decrypt the AES key
    const decipher = crypto.createDecipheriv('aes-256-gcm', derivedKey, iv);
    decipher.setAuthTag(tag);

    const decrypted = Buffer.concat([
      decipher.update(encrypted) as Buffer,
      decipher.final() as Buffer,
    ]);

    const keyHex = decrypted.toString('hex');

    // store in SecureStore
    await SecureStore.setItemAsync(secureStoreKey(userId), keyHex, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });

    return true;
  } catch (err) {
    console.error('Key restoration failed:', err);
    return false;
  }
}

// ─── entry encryption / decryption ──────────────────────────────────────────

/**
 * Check if a value is already encrypted (has our prefix).
 */
export function isEncrypted(value: string): boolean {
  return value.startsWith(CIPHER_PREFIX);
}

/**
 * Encrypt a plaintext journal entry.
 * Returns a string like "ENC:v1:<base64(iv + tag + ciphertext)>"
 */
export function encryptEntry(plaintext: string, keyHex: string): string {
  const key = Buffer.from(keyHex, 'hex');
  const iv = crypto.randomBytes(IV_BYTES);

  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const textBuf = Buffer.from(plaintext, 'utf8');

  const encrypted = Buffer.concat([
    cipher.update(textBuf) as Buffer,
    cipher.final() as Buffer,
  ]);
  const tag = cipher.getAuthTag();

  // pack: iv(12) + tag(16) + ciphertext(variable)
  const packed = Buffer.concat([iv, tag, encrypted]);
  return CIPHER_PREFIX + packed.toString('base64');
}

/**
 * Decrypt an encrypted journal entry.
 * Returns the plaintext string, or throws on failure.
 */
export function decryptEntry(ciphertext: string, keyHex: string): string {
  if (!ciphertext.startsWith(CIPHER_PREFIX)) {
    throw new Error('Not an encrypted entry');
  }

  const packed = Buffer.from(ciphertext.slice(CIPHER_PREFIX.length), 'base64');

  const iv = packed.subarray(0, IV_BYTES);
  const tag = packed.subarray(IV_BYTES, IV_BYTES + TAG_BYTES);
  const encrypted = packed.subarray(IV_BYTES + TAG_BYTES);

  const key = Buffer.from(keyHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted) as Buffer,
    decipher.final() as Buffer,
  ]);

  return decrypted.toString('utf8');
}

/**
 * Safely decrypt an entry — returns the plaintext, the original value if not
 * encrypted, or a fallback message if decryption fails.
 */
export function safeDecryptEntry(
  value: string | null | undefined,
  keyHex: string,
): string | undefined {
  if (!value) return undefined;
  if (!isEncrypted(value)) return value;

  try {
    return decryptEntry(value, keyHex);
  } catch {
    return '[Entry could not be decrypted]';
  }
}
