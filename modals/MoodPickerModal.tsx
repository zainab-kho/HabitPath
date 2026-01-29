import React from 'react';

import { MOOD_COLORS, PAGE } from '@/constants/colors';
import { journalStyle } from '@/styles';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';

interface MoodPickerModalProps {
  visible: boolean;
  selectedMood: keyof typeof MOOD_COLORS | null;
  onClose: () => void;
  onSelect: (mood: keyof typeof MOOD_COLORS) => void;
}

export default function MoodPickerModal({ visible, selectedMood, onClose, onSelect }: MoodPickerModalProps) {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
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
                    <Pressable
                      onPress={() => onSelect(key)}
                      style={{
                        height: 30,
                        width: 30,
                        borderRadius: 10,
                        borderWidth: 1,
                        backgroundColor: isSelected ? color : PAGE.journal.foreground[0],
                        borderColor: isSelected ? '#000' : color,
                        justifyContent: 'center',
                        alignItems: 'center',
                        shadowColor: isSelected ? '#000' : color,
                        shadowOffset: { width: 2, height: 2 },
                        shadowOpacity: 1,
                        shadowRadius: 0,
                        elevation: 3,
                      }}
                    />
                    <Text style={[journalStyle.moodLabel, { marginTop: 6, textAlign: 'center' }]}>{key}</Text>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}