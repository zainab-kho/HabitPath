import { globalStyles, buttonStyles } from '@/styles';
import React, { useState } from 'react';
import { Modal, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface Props {
  visible: boolean;
  onComplete: (rate: number) => void;
}

export default function ExchangeRateModal({ visible, onComplete }: Props) {
  const [rate, setRate] = useState('10');

  const handleContinue = () => {
    const numRate = parseInt(rate) || 10;
    onComplete(Math.min(Math.max(numRate, 1), 50));
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={{
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: 20,
      }}>
        <View style={{
          backgroundColor: '#fff',
          borderRadius: 20,
          borderWidth: 1,
          borderColor: '#000',
          padding: 30,
          shadowColor: '#000',
          shadowOffset: { width: 4, height: 4 },
          shadowOpacity: 1,
          shadowRadius: 0,
          elevation: 6,
        }}>
          <Text style={[globalStyles.h2, { marginBottom: 15 }]}>
            Set Your Exchange Rate
          </Text>

          <Text style={[globalStyles.label, { marginBottom: 20, opacity: 1, fontSize: 14 }]}>
            How many points equals $1?
          </Text>

          <TextInput
            value={rate}
            onChangeText={setRate}
            keyboardType="number-pad"
            placeholder="10"
            style={{
              borderWidth: 1,
              borderColor: '#000',
              borderRadius: 10,
              padding: 15,
              fontFamily: 'p2',
              fontSize: 18,
              marginBottom: 20,
            }}
          />

          <Text style={[globalStyles.label, { fontSize: 13, marginBottom: 25, opacity: 1 }]}>
            Recommended: 10 points = $1{'\n\n'}
            You can always change this in settings!
          </Text>

          <TouchableOpacity
            onPress={handleContinue}
            style={[buttonStyles.button, { alignSelf: 'stretch', borderRadius: 10 }]}
          >
            <Text style={globalStyles.body}>Continue</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
