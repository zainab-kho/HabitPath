// @/lib/supabase/queries/journalCrypto.ts
//
// Reads/writes the `journal_vault` row — the user's salt + two lockboxes. This is
// the ONLY encryption material stored in the cloud, and none of it is readable
// without the passphrase or recovery key.

import { supabase } from '@/lib/supabase';
import type { ArgonParams } from '@/lib/crypto/journalCrypto';

export type VaultRow = {
  salt: string;
  lockbox_passphrase: string;
  lockbox_recovery: string;
  argon_t: number;
  argon_m: number;
  argon_p: number;
};

/** Fetch the user's vault, or null if they haven't set up encryption yet. */
export async function fetchVault(userId: string): Promise<VaultRow | null> {
  const { data, error } = await supabase
    .from('journal_vault')
    .select('salt, lockbox_passphrase, lockbox_recovery, argon_t, argon_m, argon_p')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return (data as VaultRow) ?? null;
}

/** Create (or replace) the user's vault. Used once, at setup. */
export async function saveVault(
  userId: string,
  vault: { salt: string; lockbox_passphrase: string; lockbox_recovery: string; argon: ArgonParams },
): Promise<void> {
  const { error } = await supabase.from('journal_vault').upsert({
    user_id: userId,
    salt: vault.salt,
    lockbox_passphrase: vault.lockbox_passphrase,
    lockbox_recovery: vault.lockbox_recovery,
    argon_t: vault.argon.t,
    argon_m: vault.argon.m,
    argon_p: vault.argon.p,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

/** Re-wrap the master key under a new passphrase (leaves the recovery lockbox alone). */
export async function updateLockboxPassphrase(userId: string, lockbox: string): Promise<void> {
  const { error } = await supabase
    .from('journal_vault')
    .update({ lockbox_passphrase: lockbox, updated_at: new Date().toISOString() })
    .eq('user_id', userId);
  if (error) throw error;
}

/** Re-wrap the master key under a new recovery key (leaves the passphrase lockbox alone). */
export async function updateLockboxRecovery(userId: string, lockbox: string): Promise<void> {
  const { error } = await supabase
    .from('journal_vault')
    .update({ lockbox_recovery: lockbox, updated_at: new Date().toISOString() })
    .eq('user_id', userId);
  if (error) throw error;
}
