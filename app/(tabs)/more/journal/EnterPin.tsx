import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Keyboard, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { PAGE } from '@/constants/colors';
import { supabase } from '@/lib/supabase';
import { globalStyles } from '@/styles';
import { AppLinearGradient } from '@/ui/AppLinearGradient';
import PageContainer from '@/ui/PageContainer';
import PageHeader from '@/ui/PageHeader';

const PIN_LENGTH = 4;
const JOURNAL_UNLOCK_KEY = '@journal_pin_unlocked';

export default function EnterPinPage() {
  const router = useRouter();
  const inputRef = useRef<TextInput>(null);

  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 150);
    return () => clearTimeout(t);
  }, []);

  const handleChange = async (text: string) => {
    const cleaned = text.replace(/\D/g, '').slice(0, PIN_LENGTH);
    setError(null);
    setPin(cleaned);

    if (cleaned.length === PIN_LENGTH) {
      Keyboard.dismiss();

      try {
        const { data, error } = await supabase.rpc('verify_user_pin', {
          pin_input: cleaned
        });

        if (error || !data?.valid) {
          setError('Incorrect pin. Try again.');
          setPin('');
          return;
        }

        // success
        router.back();
      } catch (err) {
        console.error('Error verifying pin:', err);
        setError('Could not verify pin. Try again.');
        setPin('');
      }
    }
  };

  return (
    <AppLinearGradient variant="journal.background">
      <PageContainer showBottomNav={false}>
        <PageHeader title="Unlock Journal" showBackButton />

        <Pressable style={styles.wrapper} onPress={() => inputRef.current?.focus()}>
          <Text style={[globalStyles.h3, { textAlign: 'center' }]}>Enter PIN</Text>
          <Text style={[globalStyles.body, { opacity: 0.7, textAlign: 'center' }]}>
            {checking ? 'Checking…' : 'Type your 4-digit PIN'}
          </Text>

          <View style={styles.dotsRow}>
            {Array.from({ length: PIN_LENGTH }).map((_, i) => {
              const filled = i < pin.length;
              return <View key={i} style={[styles.dot, filled && styles.dotFilled]} />;
            })}
          </View>

          {!!error && (
            <Text style={[globalStyles.body, { color: PAGE.journal.primary[0], textAlign: 'center' }]}>
              {error}
            </Text>
          )}

          <TextInput
            ref={inputRef}
            value={pin}
            onChangeText={handleChange}
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            autoFocus
            caretHidden
            style={styles.hiddenInput}
            maxLength={PIN_LENGTH}
            returnKeyType="done"
            blurOnSubmit={false}
          />
        </Pressable>
      </PageContainer>
    </AppLinearGradient>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 30,
    paddingTop: 30,
    gap: 14,
    alignItems: 'center',
    flex: 1,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
    marginBottom: 10,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#000',
    backgroundColor: 'transparent',
  },
  dotFilled: {
    backgroundColor: '#000',
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    height: 1,
    width: 1,
  },
});