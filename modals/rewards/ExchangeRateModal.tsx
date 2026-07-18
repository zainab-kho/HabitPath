import { globalStyles, uiStyles } from '@/styles';
import { BUTTON_COLORS, PAGE } from '@/constants/colors';
import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import ShadowBox from '@/ui/ShadowBox';

interface Props {
  visible: boolean;
  onComplete: (rate: number) => void;
  // when set, the modal opens pre-filled with the current rate
  initialRate?: number;
  // when provided, shows a Cancel button (omit for the mandatory first-run prompt)
  onCancel?: () => void;
}

export default function ExchangeRateModal({ visible, onComplete, initialRate, onCancel }: Props) {
  const [rate, setRate] = useState(String(initialRate ?? 15));

  // re-seed when reopened (e.g. from settings) with the freshest saved rate
  React.useEffect(() => {
    if (visible) setRate(String(initialRate ?? 15));
  }, [visible, initialRate]);

  const handleContinue = () => {
    const numRate = parseInt(rate) || initialRate || 15;
    onComplete(Math.min(Math.max(numRate, 1), 50));
  };

  return (
    <Modal visible={visible} transparent animationType="none">
      {/* no dismiss-on-overlay — a rate is required before using rewards */}
      <View style={styles.overlay}>
        <View style={styles.card}>

          <View style={{ marginTop: 20 }}>
            <Text style={[globalStyles.h3, { textAlign: 'center', marginBottom: 20 }]}>
              Set Your Exchange Rate
            </Text>
          </View>

          <View style={{ paddingHorizontal: 20 }}>
            <Text style={[globalStyles.label, { marginBottom: 8 }]}>HOW MANY POINTS EQUALS $1?</Text>
            <View style={[uiStyles.inputField, { marginBottom: 16 }]}>
              <TextInput
                style={globalStyles.body}
                value={rate}
                onChangeText={setRate}
                keyboardType="number-pad"
                placeholder="10"
                placeholderTextColor="rgba(0,0,0,0.4)"
              />
            </View>

            <Text style={[globalStyles.label, { fontSize: 13, marginBottom: 20, opacity: 1, alignSelf: 'center' }]}>
              Recommended: 15 points = $1
            </Text>
          </View>

          <View style={{ flexDirection: 'row', borderTopWidth: 1, padding: 10, gap: 10 }}>
            {onCancel && (
              <Pressable onPress={onCancel} style={{ flex: 1 }}>
                <ShadowBox contentBackgroundColor={BUTTON_COLORS.Quiet} shadowBorderRadius={15}>
                  <View style={{ paddingVertical: 6 }}>
                    <Text style={[globalStyles.body, { textAlign: 'center' }]}>Cancel</Text>
                  </View>
                </ShadowBox>
              </Pressable>
            )}
            <Pressable onPress={handleContinue} style={{ flex: 1 }}>
              <ShadowBox contentBackgroundColor={BUTTON_COLORS.Save} shadowBorderRadius={15}>
                <View style={{ paddingVertical: 6 }}>
                  <Text style={[globalStyles.body, { textAlign: 'center' }]}>Save</Text>
                </View>
              </ShadowBox>
            </Pressable>
          </View>

        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 3,
    borderColor: PAGE.rewards.primary[0],
    width: '90%',
    alignSelf: 'center',
  },
});
