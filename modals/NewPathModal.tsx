// @/modals/NewPathModal.tsx
import { PATH_COLOR_OPTIONS, PathColorKey } from '@/colors/pathColors';
import { BUTTON_COLORS, PAGE } from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { globalStyles, uiStyles } from '@/styles';
import ShadowBox from '@/ui/ShadowBox';
import React, { useState } from 'react';
import {
    Modal,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';

interface NewPathModalProps {
    visible: boolean;
    onClose: () => void;
    onCreated: (pathId: string) => void;
}

export default function NewPathModal({ visible, onClose, onCreated }: NewPathModalProps) {
    const { user } = useAuth();
    const [name, setName] = useState('');
    const [selectedColor, setSelectedColor] = useState<PathColorKey>('green');
    const [isSaving, setIsSaving] = useState(false);

    const handleClose = () => {
        setName('');
        setSelectedColor('green');
        onClose();
    };

    const handleSave = async () => {
        if (!name.trim() || !user) return;

        setIsSaving(true);
        try {
            const { data, error } = await supabase.from('paths').insert({
                user_id: user.id,
                name: name.trim(),
                color: selectedColor,
                created_date: new Date().toISOString(),
            }).select();

            if (error) throw error;

            handleClose();
            if (data?.[0]?.id) {
                onCreated(data[0].id);
            }
        } catch (err) {
            console.error('Error creating path:', err);
        } finally {
            setIsSaving(false);
        }
    };

    const canSave = name.trim().length > 0 && !isSaving;

    return (
        <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
            <Pressable style={styles.overlay} onPress={handleClose}>
                <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>

                    <View style={{ marginTop: 20 }}>
                        <Text style={[globalStyles.h3, { textAlign: 'center', marginBottom: 20 }]}>
                            New Path
                        </Text>
                    </View>

                    <View style={{ paddingHorizontal: 3 }}>
                        <View style={{ paddingHorizontal: 20 }}>
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

                            <Text style={[globalStyles.label, { marginBottom: 12 }]}>COLOR</Text>
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

                    <View style={{ flexDirection: 'row', borderTopWidth: 1, padding: 10, gap: 10 }}>
                        <Pressable onPress={handleClose} style={{ flex: 1 }}>
                            <ShadowBox contentBackgroundColor={BUTTON_COLORS.Cancel} shadowBorderRadius={15}>
                                <View style={{ paddingVertical: 6 }}>
                                    <Text style={[globalStyles.body, { textAlign: 'center' }]}>Cancel</Text>
                                </View>
                            </ShadowBox>
                        </Pressable>

                        <Pressable onPress={canSave ? handleSave : undefined} style={{ flex: 1, opacity: canSave ? 1 : 0.5 }}>
                            <ShadowBox
                                contentBackgroundColor={BUTTON_COLORS.Save}
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
});
