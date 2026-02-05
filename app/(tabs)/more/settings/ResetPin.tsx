import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Keyboard, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { BUTTON_COLORS } from '@/constants/colors';
import { supabase } from '@/lib/supabase';
import { globalStyles } from '@/styles';
import { AppLinearGradient } from '@/ui/AppLinearGradient';
import PageContainer from '@/ui/PageContainer';
import PageHeader from '@/ui/PageHeader';

const PIN_LENGTH = 4;
type Step = 'create' | 'confirm';

export default function ResetPinPage() {
  const router = useRouter();
  const inputRef = useRef<TextInput>(null);

  const [step, setStep] = useState<Step>('create');
  const [pin, setPin] = useState('');
  const [firstPin, setFirstPin] = useState('');
  const [error, setError] = useState<string | null>(null);

  const title = useMemo(() => (step === 'create' ? 'Create a new PIN' : 'Confirm your PIN'), [step]);
  const subtitle = useMemo(() => (step === 'create' ? 'Enter a 4-digit PIN' : 'Re-enter the same PIN'), [step]);

  // Focus keyboard on mount and when step changes
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 150);
    return () => clearTimeout(t);
  }, [step]);

  const handleChange = async (text: string) => {
    const cleaned = text.replace(/\D/g, '').slice(0, PIN_LENGTH);
    setError(null);
    setPin(cleaned);

    if (cleaned.length === PIN_LENGTH) {
      if (step === 'create') {
        setFirstPin(cleaned);
        setPin('');
        setStep('confirm');
        return;
      }

      if (cleaned !== firstPin) {
        setError("pins don't match. try again.");
        setPin('');
        return;
      }

      // pin confirmed - save it
      Keyboard.dismiss();

      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

        if (!token) {
          setError('not logged in. please try again.');
          setPin('');
          return;
        }

        const { data, error } = await supabase.functions.invoke('set-pin', {
          body: { pin: cleaned },
          headers: { Authorization: `Bearer ${token}` },
        });

        console.log('set-pin result:', { data, error });

        if (error) {
          setError('could not save pin. try again.');
          setPin('');
          return;
        }

        // success - navigate back
        router.back();
      } catch (err) {
        console.error('error saving pin:', err);
        setError('could not save pin. try again.');
        setPin('');
      }
    }
  };

  const resetAll = () => {
    setError(null);
    setPin('');
    setFirstPin('');
    setStep('create');
    inputRef.current?.focus();
  };

  return (
    <AppLinearGradient variant="settings.background">
      <PageContainer showBottomNav={false}>
        <PageHeader title="Set PIN" showBackButton />

        <Pressable style={styles.wrapper} onPress={() => inputRef.current?.focus()}>
          <Text style={[globalStyles.h3, { textAlign: 'center' }]}>{title}</Text>
          <Text style={[globalStyles.body, { opacity: 0.7, textAlign: 'center' }]}>{subtitle}</Text>

          {/* PIN dots */}
          <View style={styles.dotsRow}>
            {Array.from({ length: PIN_LENGTH }).map((_, i) => {
              const filled = i < pin.length;
              return <View key={i} style={[styles.dot, filled && styles.dotFilled]} />;
            })}
          </View>

          {!!error && (
            <Text style={[globalStyles.body, { color: BUTTON_COLORS.Delete, textAlign: 'center' }]}>
              {error}
            </Text>
          )}

          {step === 'confirm' && (
            <Pressable onPress={resetAll} style={{ alignSelf: 'center', marginTop: 6 }}>
              <Text style={[globalStyles.label, { textDecorationLine: 'underline', opacity: 0.8 }]}>
                Start over
              </Text>
            </Pressable>
          )}

          {/* Hidden input drives the iOS keypad */}
          <TextInput
            ref={inputRef}
            value={pin}
            onChangeText={handleChange}
            keyboardType="number-pad"   // iOS numeric keypad
            textContentType="oneTimeCode" // helps iOS show OTP-style keypad + autofill sometimes
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