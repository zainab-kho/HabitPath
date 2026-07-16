import React from 'react';

import { MOOD_COLORS, PAGE } from '@/constants/colors';
import { journalStyle } from '@/styles';
import ShadowBox from '@/ui/ShadowBox';
import { Modal, Pressable, Text, View } from 'react-native';
// RN's ScrollView doesn't scroll reliably inside these modals — use gesture-handler's,
// which needs its own root view inside the Modal's native hierarchy
import { GestureHandlerRootView, ScrollView } from 'react-native-gesture-handler';

// box (30) + label w/ margin (~19) per row, plus the 12px row gap —
// sized so exactly 6 rows show before scrolling
const PICKER_HEIGHT = 6 * 49 + 5 * 12;

interface MoodPickerModalProps {
  visible: boolean;
  selectedMood: keyof typeof MOOD_COLORS | null;
  onClose: () => void;
  onSelect: (mood: keyof typeof MOOD_COLORS) => void;
}

export default function MoodPickerModal({ visible, selectedMood, onClose, onSelect }: MoodPickerModalProps) {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <GestureHandlerRootView style={{ flex: 1 }}>
      {/* overlay with flex centering*/}
      <Pressable
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'center',
          alignItems: 'center',
        }}
        onPress={onClose}
      >
        {/* card */}
        <Pressable
          style={{
            backgroundColor: '#fff',
            borderRadius: 16,
            padding: 20,
            width: '90%',
            borderColor: '#000',
            borderWidth: 1,
          }}
          onPress={() => { }}
        >
          <Text style={{ fontFamily: 'p2', fontSize: 18, marginBottom: 15, textAlign: 'center' }}>
            How are you feeling?
          </Text>

          <View style={{ paddingVertical: 10 }}>
            <ScrollView
              style={{ height: PICKER_HEIGHT }}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                justifyContent: 'center',
                paddingHorizontal: 10,
                rowGap: 12, // vertical spacing between rows
                columnGap: 12, // horizontal spacing between items
              }}
            >
              {Object.entries(MOOD_COLORS).map(([mood, color]) => {
                const key = mood as keyof typeof MOOD_COLORS;
                const isSelected = selectedMood === key;

                return (
                  <View
                    key={key}
                    style={{
                      width: 60,
                      alignItems: 'center',
                    }}
                  >
                    <Pressable onPress={() => onSelect(key)}>
                      <ShadowBox
                        contentBackgroundColor={isSelected ? color : PAGE.journal.foreground[0]}
                        contentBorderColor={isSelected ? '#000' : color}
                        contentBorderRadius={10}
                        shadowColor={isSelected ? '#000' : color}
                        shadowBorderColor={isSelected ? '#000' : color}
                        shadowBorderRadius={10}
                        shadowOffset={{ x: 2, y: 2 }}
                      >
                        <View style={{ width: 30, height: 30 }} />
                      </ShadowBox>
                    </Pressable>
                    <Text style={[journalStyle.moodLabel, { marginTop: 6, textAlign: 'center' }]}>{key}</Text>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </Pressable>
      </Pressable>
      </GestureHandlerRootView>
    </Modal>
  );
}