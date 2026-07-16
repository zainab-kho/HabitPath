// @/modals/quests/AddPhaseModal.tsx
// Create a phase and (optionally) sort existing loose goals into it. Modeled on
// AddHabitsToPathModal: a checklist of the quest's unassigned goals.
import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { ScrollView as GHScrollView } from 'react-native-gesture-handler';

import { BUTTON_COLORS, COLORS, PAGE } from '@/constants/colors';
import { globalStyles } from '@/styles';
import { Habit } from '@/types/Habit';
import ShadowBox from '@/ui/ShadowBox';

interface Props {
    visible: boolean;
    looseGoals: Habit[];
    defaultName: string;
    onClose: () => void;
    onCreate: (name: string, goalIds: string[]) => void;
}

export default function AddPhaseModal({ visible, looseGoals, defaultName, onClose, onCreate }: Props) {
    const [name, setName] = useState(defaultName);
    // default: include all loose goals in the new phase
    const [selected, setSelected] = useState<Set<string>>(new Set(looseGoals.map(g => g.id)));

    useEffect(() => {
        if (visible) {
            setName(defaultName);
            setSelected(new Set(looseGoals.map(g => g.id)));
        }
    }, [visible, defaultName, looseGoals]);

    const toggle = (id: string) =>
        setSelected(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });

    const create = () => onCreate(name.trim() || defaultName, Array.from(selected));

    return (
        <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
            <Pressable style={styles.overlay} onPress={onClose}>
                <Pressable style={styles.card} onPress={e => e.stopPropagation()}>
                    <View style={{ marginTop: 20, marginBottom: 10, paddingHorizontal: 20 }}>
                        <Text style={[globalStyles.h2, { textAlign: 'center', marginBottom: 12 }]}>New Phase</Text>
                        <TextInput
                            style={styles.input}
                            value={name}
                            onChangeText={setName}
                            placeholder="Phase name"
                            placeholderTextColor="rgba(0,0,0,0.35)"
                            cursorColor={PAGE.quest.primary[0]}
                        />
                    </View>

                    {looseGoals.length > 0 && (
                        <>
                            <Text style={[globalStyles.body2, { textAlign: 'center', opacity: 0.6, marginBottom: 8 }]}>
                                Which goals go in this phase?
                            </Text>
                            <GHScrollView style={{ paddingHorizontal: 20, maxHeight: 300 }}>
                                {looseGoals.map(g => {
                                    const on = selected.has(g.id);
                                    return (
                                        <Pressable key={g.id} onPress={() => toggle(g.id)} style={{ marginBottom: 10 }}>
                                            <ShadowBox contentBackgroundColor="#fff" contentBorderColor="#000" contentBorderWidth={1} shadowBorderRadius={14}>
                                                <View style={styles.goalRow}>
                                                    <View style={[styles.check, on && styles.checkOn]}>
                                                        {on && <Text style={styles.checkMark}>✓</Text>}
                                                    </View>
                                                    <Text style={{ fontSize: 18 }}>{g.icon || '✦'}</Text>
                                                    <Text style={[globalStyles.body, { flex: 1 }]} numberOfLines={1}>{g.name}</Text>
                                                    <Text style={[globalStyles.label, { opacity: 0.5 }]}>
                                                        {!g.frequency || g.frequency === 'None' ? 'Task' : g.frequency}
                                                    </Text>
                                                </View>
                                            </ShadowBox>
                                        </Pressable>
                                    );
                                })}
                            </GHScrollView>
                        </>
                    )}

                    <View style={styles.footer}>
                        <Pressable onPress={onClose} style={{ flex: 1 }}>
                            <ShadowBox contentBackgroundColor={BUTTON_COLORS.Cancel} shadowBorderRadius={15}>
                                <View style={{ paddingVertical: 6 }}>
                                    <Text style={[globalStyles.body, { textAlign: 'center' }]}>Cancel</Text>
                                </View>
                            </ShadowBox>
                        </Pressable>
                        <Pressable onPress={create} style={{ flex: 1 }}>
                            <ShadowBox contentBackgroundColor={BUTTON_COLORS.Save} shadowBorderRadius={15}>
                                <View style={{ paddingVertical: 6 }}>
                                    <Text style={[globalStyles.body, { textAlign: 'center' }]}>Create phase</Text>
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
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center' },
    card: { backgroundColor: '#fff', borderRadius: 20, borderWidth: 3, borderColor: PAGE.quest.primary[0], maxHeight: '80%', width: '90%', alignSelf: 'center', paddingBottom: 4 },
    input: { fontFamily: 'p2', fontSize: 16, borderWidth: 1.5, borderColor: '#eee', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 },
    goalRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
    check: { width: 22, height: 22, borderRadius: 7, borderWidth: 2, borderColor: PAGE.quest.primary[0], alignItems: 'center', justifyContent: 'center' },
    checkOn: { backgroundColor: PAGE.quest.primary[0] },
    checkMark: { color: '#fff', fontSize: 13, fontFamily: 'p1' },
    footer: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#eee', padding: 12, gap: 10, marginTop: 6 },
});
