// @/app/(tabs)/more/journal/SetUpEncryption.tsx
//
// Key-management screen for the encrypted journal. Three states:
//   • create  — no vault yet: choose a strong passphrase → shown a recovery key once
//   • unlock  — vault exists but this device is locked: enter passphrase (or recovery key)
//   • ready   — encryption is on and this device is unlocked
//
// This screen only manages KEYS. Actual entry encryption comes in Phase 2.

import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { useAuth } from '@/contexts/AuthContext';
import { BUTTON_COLORS } from '@/constants/colors';
import { passphraseStrength, generateRandomPassword } from '@/lib/crypto/journalCrypto';
import * as Vault from '@/lib/crypto/journalVault';
import { migrateJournalEntries } from '@/lib/journal/migrateJournal';
import { globalStyles } from '@/styles';
import { AppLinearGradient } from '@/ui/AppLinearGradient';
import PageContainer from '@/ui/PageContainer';
import PageHeader from '@/ui/PageHeader';
import ShadowBox from '@/ui/ShadowBox';

type Screen = 'loading' | 'create' | 'recovery' | 'unlock' | 'unlockRecovery' | 'ready';

// Match the Settings page palette: blue "Save" accent, neutral borders.
const ACCENT = BUTTON_COLORS.Save;
const DANGER = BUTTON_COLORS.Delete;
const BORDER = '#e0e0e0';

export default function SetUpEncryption() {
  const router = useRouter();
  const { user } = useAuth();
  const userId = user?.id ?? '';

  const [screen, setScreen] = useState<Screen>('loading');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // create — passphrase starts as a strong generated password (editable)
  const [passphrase, setPassphrase] = useState('');
  const [showPass, setShowPass] = useState(true);
  const [recoveryDisplay, setRecoveryDisplay] = useState('');
  const [savedChecked, setSavedChecked] = useState(false);

  const regen = () => setPassphrase(generateRandomPassword());

  // unlock
  const [unlockPass, setUnlockPass] = useState('');
  const [recoveryInput, setRecoveryInput] = useState('');

  const safeBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/more/journal');
  };

  useEffect(() => {
    (async () => {
      if (!userId) return;
      try {
        if (!(await Vault.hasVault(userId))) {
          setPassphrase(generateRandomPassword());
          return setScreen('create');
        }
        setScreen((await Vault.isUnlocked(userId)) ? 'ready' : 'unlock');
      } catch {
        setError('Could not reach the server. Check your connection and try again.');
        setScreen('unlock');
      }
    })();
  }, [userId]);

  const strength = passphraseStrength(passphrase);
  const canCreate = strength.ok && passphrase.trim().length > 0 && !busy;

  const handleCreate = async () => {
    setBusy(true);
    setError(null);
    try {
      const { recoveryDisplay } = await Vault.setUpVault(userId, passphrase.trim());
      // start converting existing plaintext entries in the background
      migrateJournalEntries(userId).catch(() => {});
      setRecoveryDisplay(recoveryDisplay);
      setPassphrase('');
      setScreen('recovery');
    } catch {
      setError('Something went wrong setting up encryption. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const handleUnlock = async () => {
    setBusy(true);
    setError(null);
    try {
      const ok = await Vault.unlockWithPassphrase(userId, unlockPass);
      if (ok) { setUnlockPass(''); setScreen('ready'); }
      else setError('That passphrase didn’t work. Try again, or use your recovery key.');
    } catch {
      setError('Could not reach the server. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const handleUnlockRecovery = async () => {
    setBusy(true);
    setError(null);
    try {
      const ok = await Vault.unlockWithRecovery(userId, recoveryInput);
      if (ok) { setRecoveryInput(''); setScreen('ready'); }
      else setError('That recovery key didn’t match. Check it and try again.');
    } catch {
      setError('Could not reach the server. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppLinearGradient variant="settings.background">
      <PageContainer showBottomNav={false}>
        <PageHeader title="Journal Encryption" showBackButton />
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          {screen === 'loading' && (
            <View style={{ paddingTop: 60, alignItems: 'center' }}>
              <ActivityIndicator size="small" color={ACCENT} />
            </View>
          )}

          {/* ── CREATE ─────────────────────────────────────────────── */}
          {screen === 'create' && (
            <>
              <Text style={[globalStyles.h4, styles.heading]}>Lock your journal</Text>
              <Text style={styles.body}>
                Here&apos;s a strong passphrase we made for you — it&apos;s the only thing that can
                open your entries. Keep it, shuffle for a new one, or type your own strong one.
                You&apos;ll enter it once per device; day to day the journal just opens normally.
              </Text>

              <View style={styles.field}>
                <View style={styles.fieldHead}>
                  <Text style={globalStyles.label}>YOUR PASSPHRASE</Text>
                  <View style={{ flexDirection: 'row', gap: 16 }}>
                    <Pressable onPress={() => setShowPass(v => !v)}>
                      <Text style={styles.link}>{showPass ? 'Hide' : 'Show'}</Text>
                    </Pressable>
                    <Pressable onPress={regen}>
                      <Text style={styles.link}>Shuffle</Text>
                    </Pressable>
                  </View>
                </View>

                <TextInput
                  style={[styles.input, { minHeight: 58 }]}
                  value={passphrase}
                  onChangeText={setPassphrase}
                  placeholder="your passphrase"
                  placeholderTextColor="rgba(0,0,0,0.35)"
                  secureTextEntry={!showPass}
                  autoCapitalize="none"
                  autoCorrect={false}
                  multiline={showPass}
                />
                {passphrase.length > 0 && (
                  <Text style={[styles.hint, { color: strength.ok ? ACCENT : DANGER }]}>
                    {strength.label} — {strength.hint}
                  </Text>
                )}
              </View>

              <View style={styles.note}>
                <Text style={styles.noteText}>
                  There&apos;s no reset. If you forget this passphrase, your recovery key (next
                  screen) is the only way back in.
                </Text>
              </View>

              {error && <Text style={styles.errorText}>{error}</Text>}

              <Button label={busy ? 'Setting up…' : 'Turn on encryption'} disabled={!canCreate} onPress={handleCreate} />
            </>
          )}

          {/* ── RECOVERY KEY ───────────────────────────────────────── */}
          {screen === 'recovery' && (
            <>
              <Text style={[globalStyles.h4, styles.heading]}>Save your recovery key</Text>
              <Text style={styles.body}>
                This is your only backup if you forget your passphrase. Write it down or save it in
                a password manager. We can&apos;t show it again.
              </Text>

              <ShadowBox contentBackgroundColor="#fff" contentBorderColor={BORDER} shadowColor={ACCENT} shadowBorderRadius={20}>
                <Text selectable style={styles.recovery}>{recoveryDisplay}</Text>
              </ShadowBox>

              <Pressable onPress={() => setSavedChecked(v => !v)} style={styles.checkRow}>
                <View style={[styles.checkbox, savedChecked && styles.checkboxOn]}>
                  {savedChecked && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.body}>I&apos;ve saved my recovery key somewhere safe.</Text>
              </Pressable>

              <Button label="Done" disabled={!savedChecked} onPress={() => setScreen('ready')} />
            </>
          )}

          {/* ── UNLOCK (passphrase) ────────────────────────────────── */}
          {screen === 'unlock' && (
            <>
              <Text style={[globalStyles.h4, styles.heading]}>Unlock on this device</Text>
              <Text style={styles.body}>
                Your journal is encrypted. Enter your passphrase once to unlock it here — after that
                it opens normally on this device.
              </Text>

              <View style={styles.field}>
                <Text style={globalStyles.label}>PASSPHRASE</Text>
                <TextInput
                  style={styles.input}
                  value={unlockPass}
                  onChangeText={setUnlockPass}
                  placeholder="your passphrase"
                  placeholderTextColor="rgba(0,0,0,0.35)"
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  onSubmitEditing={handleUnlock}
                />
              </View>

              {error && <Text style={styles.errorText}>{error}</Text>}

              <Button label={busy ? 'Unlocking…' : 'Unlock'} disabled={!unlockPass || busy} onPress={handleUnlock} />

              <Pressable onPress={() => { setError(null); setScreen('unlockRecovery'); }} style={styles.centerLink}>
                <Text style={styles.link}>Forgot passphrase? Use recovery key</Text>
              </Pressable>
            </>
          )}

          {/* ── UNLOCK (recovery key) ──────────────────────────────── */}
          {screen === 'unlockRecovery' && (
            <>
              <Text style={[globalStyles.h4, styles.heading]}>Use your recovery key</Text>
              <Text style={styles.body}>Paste or type the recovery key you saved at setup.</Text>

              <View style={styles.field}>
                <Text style={globalStyles.label}>RECOVERY KEY</Text>
                <TextInput
                  style={[styles.input, styles.mono, { minHeight: 80 }]}
                  value={recoveryInput}
                  onChangeText={setRecoveryInput}
                  placeholder="XXXX-XXXX-XXXX-…"
                  placeholderTextColor="rgba(0,0,0,0.35)"
                  autoCapitalize="characters"
                  autoCorrect={false}
                  multiline
                />
              </View>

              {error && <Text style={styles.errorText}>{error}</Text>}

              <Button label={busy ? 'Checking…' : 'Unlock with recovery key'} disabled={!recoveryInput || busy} onPress={handleUnlockRecovery} />

              <Pressable onPress={() => { setError(null); setScreen('unlock'); }} style={styles.centerLink}>
                <Text style={styles.link}>Back to passphrase</Text>
              </Pressable>
            </>
          )}

          {/* ── READY ──────────────────────────────────────────────── */}
          {screen === 'ready' && (
            <>
              <View style={{ paddingTop: 24, gap: 8, alignItems: 'center' }}>
                <Text style={[globalStyles.h4, styles.heading]}>Encryption is on</Text>
                <Text style={styles.body}>
                  Your journal is unlocked on this device and opens normally. Entries are protected
                  everywhere else.
                </Text>
              </View>

              <Button label="Done" onPress={safeBack} />

              <Pressable
                onPress={async () => { await Vault.lockThisDevice(userId); setScreen('unlock'); }}
                style={styles.centerLink}
              >
                <Text style={[styles.link, { color: DANGER }]}>Lock this device (for testing)</Text>
              </Pressable>
            </>
          )}

        </ScrollView>
      </PageContainer>
    </AppLinearGradient>
  );
}

// A button styled exactly like the Settings page rows: ShadowBox + Pressable + body1.
function Button({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <ShadowBox
      contentBorderRadius={20}
      shadowBorderRadius={20}
      contentBackgroundColor={disabled ? BUTTON_COLORS.Quiet : ACCENT}
      style={{ opacity: disabled ? 0.6 : 1 }}
    >
      <Pressable
        onPress={disabled ? undefined : onPress}
        disabled={disabled}
        style={{ paddingVertical: 5, paddingHorizontal: 15, flex: 1, alignItems: 'center' }}
      >
        <Text style={globalStyles.body1}>{label}</Text>
      </Pressable>
    </ShadowBox>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 30, paddingBottom: 60, gap: 20 },
  heading: { textAlign: 'center' },
  body: { fontFamily: 'p3', fontSize: 15, lineHeight: 22, color: '#333' },
  field: { gap: 8 },
  fieldHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  input: {
    fontFamily: 'p3',
    fontSize: 15,
    color: '#000',
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: BORDER,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  mono: { fontFamily: 'monospace', letterSpacing: 1 },
  hint: { fontFamily: 'label', fontSize: 12 },
  note: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: BORDER,
    borderRadius: 20,
    padding: 14,
  },
  noteText: { fontFamily: 'p3', fontSize: 13.5, lineHeight: 20, color: '#6b6678' },
  errorText: { fontFamily: 'p3', fontSize: 14, color: DANGER, textAlign: 'center' },
  recovery: { fontFamily: 'monospace', fontSize: 16, lineHeight: 26, letterSpacing: 1, textAlign: 'center', padding: 18, color: '#000' },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 1.5, borderColor: ACCENT, alignItems: 'center', justifyContent: 'center' },
  checkboxOn: { backgroundColor: ACCENT },
  checkmark: { color: '#fff', fontFamily: 'p2', fontSize: 14 },
  link: { fontFamily: 'label', fontSize: 13, color: ACCENT },
  centerLink: { alignSelf: 'center', paddingVertical: 8 },
});
