// @/lib/crypto/journalCrypto.ts
//
// ── The cryptographic engine for the encrypted journal ──────────────────────
//
// This file is PURE crypto: it turns text into locked gibberish and back. It has
// no idea about React, Supabase, or storage — it just does the math. That makes
// it easy to reason about and test. Everything here comes from @noble, an audited
// pure-JavaScript crypto library.
//
// Two primitives do all the work:
//   • Argon2id            — slowly turns a passphrase into a strong 32-byte key.
//                           "Slowly" is the point: it makes guessing passphrases
//                           painfully expensive for an attacker.
//   • XChaCha20-Poly1305  — the actual lock. It encrypts data AND stamps it with an
//                           "authentication tag". If you try to open it with the
//                           wrong key (or the data was tampered with), it refuses.
//                           That refusal is also how we detect a wrong passphrase.
//
// NOTE: `react-native-get-random-values` must be imported once at app startup so
// that secure randomness exists on the device (see app/_layout.tsx).

import { argon2idAsync } from '@noble/hashes/argon2.js';
import { xchacha20poly1305 } from '@noble/ciphers/chacha.js';
import { randomBytes } from '@noble/hashes/utils.js';
import { utf8ToBytes, bytesToUtf8, concatBytes } from '@noble/ciphers/utils.js';
import { WORDLIST } from './wordlist';

// dedupe the wordlist once (source list may have accidental repeats)
const WORDS = Array.from(new Set(WORDLIST));

// ── sizes (in bytes) ────────────────────────────────────────────────────────
const KEY_BYTES = 32;    // 256-bit keys — the master key and any derived key
const SALT_BYTES = 16;   // per-user random salt for Argon2id (public, not secret)
const NONCE_BYTES = 24;  // XChaCha20 nonce; 24 bytes is big enough to pick at random safely

// ── How hard Argon2id works ─────────────────────────────────────────────────
// This runs rarely (first setup, and once when adding a new device), never on
// every entry. t = passes, m = memory in KiB. Because it runs in pure JS on the
// phone's engine, we keep memory modest (8 MiB / 2 passes ≈ 1–2s on device) —
// still a strong Argon2id, and the passphrase's own entropy does the heavy work.
// Each vault stores the params it was made with, so this is safe to tune.
export const ARGON2 = { t: 2, m: 8192, p: 1 } as const;

// ════════════════════════════════════════════════════════════════════════════
// Random material
// ════════════════════════════════════════════════════════════════════════════

/** A brand-new random 256-bit master key. This is what actually locks entries. */
export function generateMasterKey(): Uint8Array {
  return randomBytes(KEY_BYTES);
}

/** A per-user random salt. Public — it's fine for this to live in Supabase. */
export function generateSalt(): Uint8Array {
  return randomBytes(SALT_BYTES);
}

// ════════════════════════════════════════════════════════════════════════════
// Passphrase → key (the slow, salted step)
// ════════════════════════════════════════════════════════════════════════════

/**
 * Turn a passphrase + salt into a 32-byte key using Argon2id.
 * `normalize('NFKC')` makes sure the same passphrase produces identical bytes on
 * every device/OS (unicode can represent the same characters more than one way).
 * Async so the UI can show a spinner instead of freezing during the ~1s of work.
 */
export type ArgonParams = { t: number; m: number; p: number };

export async function derivePassphraseKey(
  passphrase: string,
  salt: Uint8Array,
  params: ArgonParams = ARGON2,
): Promise<Uint8Array> {
  return argon2idAsync(utf8ToBytes(passphrase.normalize('NFKC')), salt, {
    t: params.t,
    m: params.m,
    p: params.p,
    dkLen: KEY_BYTES,
  });
}

// ════════════════════════════════════════════════════════════════════════════
// The core lock / unlock (shared by everything below)
// ════════════════════════════════════════════════════════════════════════════
//
// Sealed layout:  [ 24-byte random nonce | ciphertext + auth tag ]  →  base64 text
// A fresh random nonce each time means encrypting the same text twice still yields
// different-looking output (no leaking that two entries are identical).

function seal(plaintext: Uint8Array, key: Uint8Array): string {
  const nonce = randomBytes(NONCE_BYTES);
  const ciphertext = xchacha20poly1305(key, nonce).encrypt(plaintext);
  return toBase64(concatBytes(nonce, ciphertext));
}

/** Returns the original bytes, or `null` if the key is wrong / data was tampered. */
function open(sealedB64: string, key: Uint8Array): Uint8Array | null {
  try {
    const buf = fromBase64(sealedB64);
    const nonce = buf.slice(0, NONCE_BYTES);
    const ciphertext = buf.slice(NONCE_BYTES);
    return xchacha20poly1305(key, nonce).decrypt(ciphertext); // throws on wrong key
  } catch {
    return null;
  }
}

// ════════════════════════════════════════════════════════════════════════════
// Public API — entries
// ════════════════════════════════════════════════════════════════════════════

/** Lock a piece of journal text (or mood) with the master key. */
export function encryptText(plaintext: string, masterKey: Uint8Array): string {
  return seal(utf8ToBytes(plaintext), masterKey);
}

/** Unlock previously-encrypted text. Returns null if the key is wrong. */
export function decryptText(sealedB64: string, masterKey: Uint8Array): string | null {
  const out = open(sealedB64, masterKey);
  return out ? bytesToUtf8(out) : null;
}

// ════════════════════════════════════════════════════════════════════════════
// Public API — wrapping the master key ("the two lockboxes")
// ════════════════════════════════════════════════════════════════════════════
//
// We never store the master key in the open. Instead we lock it inside a box that
// the passphrase-key can open (Lockbox A) and another the recovery-key can open
// (Lockbox B). Both boxes hold the SAME master key.

/** Put the master key in a lockbox that `wrappingKey` can open. Returns base64. */
export function wrapKey(masterKey: Uint8Array, wrappingKey: Uint8Array): string {
  return seal(masterKey, wrappingKey);
}

/** Open a lockbox to get the master key back. `null` = wrong passphrase/recovery key. */
export function unwrapKey(sealedB64: string, wrappingKey: Uint8Array): Uint8Array | null {
  return open(sealedB64, wrappingKey);
}

// ════════════════════════════════════════════════════════════════════════════
// Public API — the recovery key (human-readable backup)
// ════════════════════════════════════════════════════════════════════════════
//
// The recovery key is just a random 32-byte key we SHOW the user once. It's
// displayed in Crockford base32 (uppercase, no confusable I/L/O/U) in dash-grouped
// chunks so it's readable and typo-resistant.

/** Make a recovery key: the raw bytes (to wrap the master key) + a display string. */
export function generateRecoveryKey(): { key: Uint8Array; display: string } {
  const key = randomBytes(KEY_BYTES);
  return { key, display: toCrockford(key) };
}

/** Turn a user-typed recovery string back into key bytes, or null if it's malformed. */
export function parseRecoveryKey(display: string): Uint8Array | null {
  try {
    const bytes = fromCrockford(display);
    return bytes.length === KEY_BYTES ? bytes : null;
  } catch {
    return null;
  }
}

// ════════════════════════════════════════════════════════════════════════════
// Public API — serializing raw keys/salt for storage
// ════════════════════════════════════════════════════════════════════════════

/** Encode raw bytes (e.g. the salt, or the master key for the Keychain) as base64 text. */
export function bytesToBase64(bytes: Uint8Array): string {
  return toBase64(bytes);
}

/** Decode base64 text back to bytes. */
export function base64ToBytes(str: string): Uint8Array {
  return fromBase64(str);
}

// ════════════════════════════════════════════════════════════════════════════
// Passphrase strength — the whole system rests on this, so we won't allow weak ones
// ════════════════════════════════════════════════════════════════════════════

export type Strength = { ok: boolean; label: 'Too short' | 'Weak' | 'Strong'; hint: string };

/**
 * Suggest a strong, memorable passphrase: N random words from the wordlist,
 * chosen with secure randomness. 6 words is very strong once Argon2id is applied.
 */
export function generatePassphrase(wordCount = 6): string {
  const n = WORDS.length;
  const out: string[] = [];
  for (let i = 0; i < wordCount; i++) {
    const b = randomBytes(4);
    const r = ((b[0] << 24) | (b[1] << 16) | (b[2] << 8) | b[3]) >>> 0;
    out.push(WORDS[r % n]);
  }
  return out.join(' ');
}

// character set for the "random password" style (Instagram/Facebook-like)
const PW_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*-_=+';

/**
 * Suggest a random-character password, e.g. "K7#mP9$xL2@qRv4!nB8w".
 * Uses rejection sampling so every character is equally likely (no bias). At the
 * default length this is even stronger than the 6-word phrase.
 */
export function generateRandomPassword(length = 20): string {
  const n = PW_CHARS.length;
  const max = 256 - (256 % n); // drop byte values that would skew the distribution
  let out = '';
  while (out.length < length) {
    const batch = randomBytes(length);
    for (const b of batch) {
      if (b >= max) continue; // reject to stay uniform
      out += PW_CHARS[b % n];
      if (out.length === length) break;
    }
  }
  return out;
}

/**
 * A strict gate — weak keys are NOT allowed. Accepted only if it's a proper
 * random-style password (12+ chars with a real mix of character types) or a
 * genuine multi-word passphrase (4+ words). Anything softer is rejected.
 */
export function passphraseStrength(passphrase: string): Strength {
  const p = passphrase.trim();
  const len = p.length;
  const words = p.split(/\s+/).filter(Boolean).length;
  const classes =
    (/[a-z]/.test(p) ? 1 : 0) +
    (/[A-Z]/.test(p) ? 1 : 0) +
    (/[0-9]/.test(p) ? 1 : 0) +
    (/[^a-zA-Z0-9\s]/.test(p) ? 1 : 0);

  if (len < 12) {
    return { ok: false, label: 'Too short', hint: 'Use at least 12 characters.' };
  }
  if ((len >= 12 && classes >= 3) || words >= 4) {
    return { ok: true, label: 'Strong', hint: 'Great — keep this safe. It can’t be reset.' };
  }
  return { ok: false, label: 'Weak', hint: 'Add a real mix of letters, numbers, and symbols.' };
}

// ════════════════════════════════════════════════════════════════════════════
// Small encoders (kept local so this file has no platform assumptions)
// ════════════════════════════════════════════════════════════════════════════

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function toBase64(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i];
    const b1 = bytes[i + 1];
    const b2 = bytes[i + 2];
    out += B64[b0 >> 2];
    out += B64[((b0 & 3) << 4) | ((b1 ?? 0) >> 4)];
    out += i + 1 < bytes.length ? B64[((b1 & 15) << 2) | ((b2 ?? 0) >> 6)] : '=';
    out += i + 2 < bytes.length ? B64[b2 & 63] : '=';
  }
  return out;
}

function fromBase64(str: string): Uint8Array {
  const out: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (const ch of str) {
    if (ch === '=') break;
    const val = B64.indexOf(ch);
    if (val === -1) continue;
    buffer = (buffer << 6) | val;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out.push((buffer >> bits) & 0xff);
    }
  }
  return new Uint8Array(out);
}

// Crockford base32 — friendly for humans to read/type back.
const CROCK = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

function toCrockford(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let out = '';
  for (const b of bytes) {
    value = (value << 8) | b;
    bits += 8;
    while (bits >= 5) {
      out += CROCK[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += CROCK[(value << (5 - bits)) & 31];
  // dash-group every 4 chars: "A1B2-C3D4-…"
  return out.replace(/(.{4})/g, '$1-').replace(/-$/, '');
}

function fromCrockford(str: string): Uint8Array {
  // uppercase, fold the confusable letters, drop anything that isn't in the alphabet
  const clean = str
    .toUpperCase()
    .replace(/O/g, '0')
    .replace(/[IL]/g, '1')
    .replace(/U/g, 'V')
    .replace(/[^0-9A-Z]/g, '');
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    const idx = CROCK.indexOf(ch);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      out.push((value >>> bits) & 0xff);
    }
  }
  return new Uint8Array(out);
}
