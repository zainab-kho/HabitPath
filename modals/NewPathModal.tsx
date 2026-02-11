// @/modals/NewPathModal.tsx
import { PATH_COLOR_OPTIONS, PathColorKey } from '@/colors/pathColors';
import { BUTTON_COLORS, PAGE } from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { globalStyles, uiStyles } from '@/styles';
import ShadowBox from '@/ui/ShadowBox';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';

const PATH_COLORS = [
    '#FFD6E0', // rose
    '#FFE8C8', // peach
    '#FFF3B0', // lemon
    '#C8F0D8', // mint
    '#C8E8FF', // sky
    '#E0D0FF', // lavender
    '#FFD0F0', // pink
    '#D0F0F0', // aqua
    '#F5C6A0', // terracotta
    '#D8FFD0', // lime
    '#F0D0D0', // dusty rose
    '#C8D8FF', // periwinkle
];

interface NewPathModalProps {
    visible: boolean;
    onClose: () => void;
    onCreated: (pathId: string) => void;
}

export default function NewPathModal({ visible, onClose, onCreated }: NewPathModalProps) {
    const { user } = useAuth();
    const [name, setName] = useState('');
    const [selectedColor, setSelectedColor] = useState<PathColorKey>('green'); const [isSaving, setIsSaving] = useState(false);

    const handleClose = () => {
        setName('');
        setSelectedColor('green');
        onClose();
    };

    const handleSave = async () => {
        if (!name.trim() || !user) return;

        setIsSaving(true);
        try {
            const { error } = await supabase.from('paths').insert({
                user_id: user.id,
                name: name.trim(),
                color: selectedColor,
                created_date: new Date().toISOString(),
            });

            if (error) throw error;

            handleClose();
            // **TODO: re-render paths list and navigate to new path's detail page**

        } catch (err) {
            console.error('Error creating path:', err);
        } finally {
            setIsSaving(false);
        }
    };

    const canSave = name.trim().length > 0 && !isSaving;

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
            <Pressable style={styles.overlay} onPress={handleClose}>
                <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>


                    {/* title */}
                    <View style={{ marginTop: 20 }}>
                        <Text style={[globalStyles.h3, { textAlign: 'center', marginBottom: 20 }]}>
                            New Path
                        </Text>
                    </View>

                    <View style={{ paddingHorizontal: 3 }}>
                        <View style={{ paddingHorizontal: 20 }}>
                            {/* name input */}
                            <Text style={[globalStyles.label, { marginBottom: 8 }]}>NAME</Text>
                            <View style={[uiStyles.inputField, { marginBottom: 24 }]}>
                                <TextInput
                                    style={globalStyles.body}
                                    placeholder="e.g. Health & Fitness"
                                    placeholderTextColor="#aaa"
                                    value={name}
                                    onChangeText={setName}
                                    returnKeyType="done"
                                />
                            </View>

                            {/* color picker */}
                            <Text style={[globalStyles.label, { marginBottom: 12 }]}>COLOR</Text>
                            <View style={styles.colorGrid}>
                                <View style={styles.colorGrid}>
                                    {PATH_COLOR_OPTIONS.map(({ name, hex }) => (
                                        <ShadowBox
                                            key={name}
                                            contentBackgroundColor={selectedColor === name ? hex : '#fff'}
                                            shadowColor={selectedColor === name ? '#000' : hex}
                                        >
                                            <Pressable
                                                onPress={() => setSelectedColor(name)}
                                                style={styles.colorSwatch}
                                            />
                                        </ShadowBox>
                                    ))}
                                </View>
                            </View>
                        </View>
                    </View>

                    <View style={{ flexDirection: 'row', borderTopWidth: 1, padding: 10, gap: 10 }}>
                        <Pressable onPress={handleClose} style={{ flex: 1 }}>
                            <ShadowBox contentBackgroundColor={BUTTON_COLORS.Cancel} shadowBorderRadius={15}>
                                <View style={{ paddingVertical: 6 }}>
                                    <Text style={[globalStyles.body, { textAlign: 'center' }]}>Cancel</Text>
                                </View>
                            </ShadowBox>
                        </Pressable>

                        <Pressable onPress={handleSave} style={{ flex: 1 }}>
                            <ShadowBox
                                contentBackgroundColor={BUTTON_COLORS.Done}
                                shadowBorderRadius={15}
                            >
                                <View style={{ paddingVertical: 6 }}>
                                    <Text style={[globalStyles.body, { textAlign: 'center' }]}>
                                        Save
                                    </Text>
                                </View>
                            </ShadowBox>
                        </Pressable>
                    </View>

                </Pressable>
            </Pressable>
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
        borderColor: PAGE.path.primary[0],
        maxHeight: '75%',
        width: '90%',
        alignSelf: 'center',
    },
    colorGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginBottom: 20,
    },
    colorSwatch: {
        width: 30,
        height: 30,
    },
    colorSwatchSelected: {
        borderColor: '#000',
        borderWidth: 2.5,
        shadowColor: '#000',
        shadowOffset: { width: 1, height: 1 },
        shadowOpacity: 1,
        shadowRadius: 0,
        elevation: 3,
    },
    previewChip: {
        alignSelf: 'flex-start',
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.15)',
        marginBottom: 24,
    },
    previewText: {
        fontFamily: 'p2',
        fontSize: 13,
        color: '#333',
    },
    actions: {
        flexDirection: 'row',
        gap: 10,
    },
    btn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.12)',
        alignItems: 'center',
        justifyContent: 'center',
    },
});