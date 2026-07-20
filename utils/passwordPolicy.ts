// @/utils/passwordPolicy.ts
// Account password rules, shared by sign-up and password reset.
// (Distinct from the journal encryption passphrase, which has its own stricter
// check in lib/crypto/journalCrypto.ts.)

/** Returns an error message if the password is too weak, or null if it's fine. */
export function passwordPolicyError(password: string): string | null {
  if (password.length < 8) return 'Password must be at least 8 characters.';
  if (!/[a-zA-Z]/.test(password)) return 'Password must include at least one letter.';
  if (!/[0-9]/.test(password)) return 'Password must include at least one number.';
  return null;
}
