import React, { useState } from 'react';
import { Modal, Pressable, Text, TextInput, View } from 'react-native';
import { BUTTON_COLORS, PAGE } from '@/constants/colors';
import { globalStyles } from '@/styles';
import ShadowBox from '@/ui/ShadowBox';

interface TagPickerModalProps {
    visible: boolean;
    selectedTag: string;
    onClose: () => void;
    onSelect: (tag: string) => void;
}

const COMMON_TAGS = [
    'Study',
    'Work',
    'Reading',
    'Writing',
    'Coding',
    'Research',
    'Planning',
    'Review',
];

export default function TagPickerModal({ visible, selectedTag, onClose, onSelect }: TagPickerModalProps) {
    const [customTag, setCustomTag] = useState('');

    const handleSelect = (tag: string) => {
        onSelect(tag);
        setCustomTag('');
    };

    const handleCustomSubmit = () => {
        if (customTag.trim()) {
            onSelect(customTag.trim());
            setCustomTag('');
        }
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <Pressable
                style={{
                    flex: 1,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    justifyContent: 'center',
                    alignItems: 'center',
                }}
                onPress={onClose}
            >
                <Pressable
                    style={{
                        width: '85%',
                        backgroundColor: '#fff',
                        borderRadius: 20,
                        padding: 20,
                        borderWidth: 1.5,
                        borderColor: PAGE.focus.primary[0],
                    }}
                    onPress={(e) => e.stopPropagation()}
                >
                    <Text style={[globalStyles.h3, { marginBottom: 20, textAlign: 'center' }]}>
                        Select Tag
                    </Text>

                    {/* Common Tags */}
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
                        {COMMON_TAGS.map((tag) => (
                            <Pressable
                                key={tag}
                                onPress={() => handleSelect(tag)}
                            >
                                <ShadowBox
                                    contentBackgroundColor={selectedTag === tag ? PAGE.focus.primary[0] : '#fff'}
                                >
                                    <Text style={[globalStyles.body2, { paddingHorizontal: 12, paddingVertical: 6 }]}>
                                        {tag}
                                    </Text>
                                </ShadowBox>
                            </Pressable>
                        ))}
                    </View>

                    {/* Custom Tag Input */}
                    <Text style={[globalStyles.label, { marginBottom: 8 }]}>
                        OR ENTER CUSTOM TAG
                    </Text>
                    <ShadowBox style={{ marginBottom: 20 }}>
                        <TextInput
                            style={[globalStyles.body, { padding: 12 }]}
                            value={customTag}
                            onChangeText={setCustomTag}
                            placeholder="Enter tag..."
                            onSubmitEditing={handleCustomSubmit}
                        />
                    </ShadowBox>

                    {/* Buttons */}
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                        <Pressable 
                            onPress={() => {
                                onSelect('');
                                onClose();
                            }} 
                            style={{ flex: 1 }}
                        >
                            <ShadowBox
                                contentBackgroundColor={BUTTON_COLORS.Cancel}
                                shadowBorderRadius={15}
                            >
                                <Text style={[globalStyles.body, { textAlign: 'center', padding: 8 }]}>
                                    Clear
                                </Text>
                            </ShadowBox>
                        </Pressable>

                        <Pressable 
                            onPress={customTag.trim() ? handleCustomSubmit : onClose} 
                            style={{ flex: 1 }}
                        >
                            <ShadowBox
                                contentBackgroundColor={BUTTON_COLORS.Done}
                                shadowBorderRadius={15}
                            >
                                <Text style={[globalStyles.body, { textAlign: 'center', padding: 8 }]}>
                                    {customTag.trim() ? 'Add' : 'Close'}
                                </Text>
                            </ShadowBox>
                        </Pressable>
                    </View>
                </Pressable>
            </Pressable>
        </Modal>
    );
}