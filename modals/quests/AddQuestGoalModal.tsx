import { BUTTON_COLORS, PAGE } from '@/constants/colors';
import { globalStyles, uiStyles } from '@/styles';
import ShadowBox from '@/ui/ShadowBox';
import React, { useState } from 'react';
import { Image, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { getIconFile } from '@/components/habits/iconUtils';
import IconPickerModal from '@/modals/IconPickerModal';

interface AddQuestGoalModalProps {
    visible: boolean;
    onClose: () => void;
    onSave: (goal: { name: string; icon: string; subtasks: string[] }) => void;
}

export default function AddQuestGoalModal({ visible, onClose, onSave }: AddQuestGoalModalProps) {
    const [goalName, setGoalName] = useState('');
    const [selectedIcon, setSelectedIcon] = useState('goal');
    const [showIconPicker, setShowIconPicker] = useState(false);
    const [subtasks, setSubtasks] = useState<string[]>([]);
    const [newSubtask, setNewSubtask] = useState('');

    const handleAddSubtask = () => {
        if (!newSubtask.trim()) return;
        setSubtasks(prev => [...prev, newSubtask.trim()]);
        setNewSubtask('');
    };

    const handleRemoveSubtask = (index: number) => {
        setSubtasks(prev => prev.filter((_, i) => i !== index));
    };

    const handleSave = () => {
        if (!goalName.trim()) return;
        onSave({ name: goalName.trim(), icon: selectedIcon, subtasks });
        reset();
        onClose();
    };

    const reset = () => {
        setGoalName('');
        setSelectedIcon('goal');
        setSubtasks([]);
        setNewSubtask('');
    };

    const handleCancel = () => {
        reset();
        onClose();
    };

    return (
        <>
            <Modal visible={visible && !showIconPicker} transparent animationType="none" onRequestClose={handleCancel}>
                <Pressable
                    style={{
                        flex: 1,
                        backgroundColor: 'rgba(0,0,0,0.45)',
                        justifyContent: 'center',
                        alignItems: 'center',
                    }}
                    onPress={handleCancel}
                >
                    <Pressable
                        style={{
                            width: '90%',
                            maxHeight: '75%',
                            backgroundColor: '#fff',
                            borderRadius: 20,
                            borderWidth: 3,
                            borderColor: PAGE.quest.primary[0],
                        }}
                        onPress={(e) => e.stopPropagation()}
                    >
                        <View style={{ padding: 20 }}>
                            <Text style={[globalStyles.h3, { textAlign: 'center', marginBottom: 15 }]}>
                                Add Goal
                            </Text>

                            <ScrollView showsVerticalScrollIndicator={false}>
                                {/* icon + goal name */}
                                <Text style={[globalStyles.label, { marginBottom: 5 }]}>GOAL</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 15 }}>
                                    <Pressable
                                        onPress={() => setShowIconPicker(true)}
                                        style={{
                                            width: 44,
                                            height: 44,
                                            borderRadius: 22,
                                            borderWidth: 1,
                                            borderColor: PAGE.quest.primary[0],
                                            justifyContent: 'center',
                                            alignItems: 'center',
                                            backgroundColor: '#fff',
                                        }}
                                    >
                                        <Image
                                            source={getIconFile(selectedIcon)}
                                            style={{ width: 24, height: 24 }}
                                        />
                                    </Pressable>

                                    <TextInput
                                        style={[uiStyles.inputField, {
                                            flex: 1,
                                            borderColor: PAGE.quest.primary[0],
                                        }]}
                                        placeholder="e.g. Work on Quests page"
                                        value={goalName}
                                        onChangeText={setGoalName}
                                        cursorColor={PAGE.quest.primary[0]}
                                        selectionColor={PAGE.quest.primary[0]}
                                    />
                                </View>

                                <Text style={[globalStyles.label, { marginBottom: 5 }]}>SUBTASKS</Text>

                                {subtasks.map((task, i) => (
                                    <View
                                        key={i}
                                        style={{
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            marginBottom: 8,
                                            gap: 8,
                                        }}
                                    >
                                        <View style={{ flex: 1 }}>
                                            <ShadowBox>
                                                <View style={{ paddingVertical: 6, paddingHorizontal: 12 }}>
                                                    <Text style={globalStyles.body2}>{task}</Text>
                                                </View>
                                            </ShadowBox>
                                        </View>
                                        <Pressable onPress={() => handleRemoveSubtask(i)}>
                                            <ShadowBox shadowColor={PAGE.quest.primary[0]}>
                                                <View style={{ paddingVertical: 4, paddingHorizontal: 8 }}>
                                                    <Text style={globalStyles.body2}>x</Text>
                                                </View>
                                            </ShadowBox>
                                        </Pressable>
                                    </View>
                                ))}

                                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
                                    <TextInput
                                        style={[uiStyles.inputField, {
                                            flex: 1,
                                            borderColor: PAGE.quest.primary[0],
                                        }]}
                                        placeholder="Add a subtask..."
                                        value={newSubtask}
                                        onChangeText={setNewSubtask}
                                        onSubmitEditing={handleAddSubtask}
                                        returnKeyType="done"
                                        cursorColor={PAGE.quest.primary[0]}
                                        selectionColor={PAGE.quest.primary[0]}
                                    />
                                    <Pressable onPress={handleAddSubtask}>
                                        <ShadowBox shadowColor={PAGE.quest.primary[0]}>
                                            <View style={{ paddingVertical: 8, paddingHorizontal: 12 }}>
                                                <Text style={globalStyles.body}>+</Text>
                                            </View>
                                        </ShadowBox>
                                    </Pressable>
                                </View>
                            </ScrollView>
                        </View>

                        <View style={{ flexDirection: 'row', borderTopWidth: 1, padding: 10, gap: 10 }}>
                            <Pressable onPress={handleCancel} style={{ flex: 1 }}>
                                <ShadowBox contentBackgroundColor={PAGE.assignments.background[1]} shadowBorderRadius={15}>
                                    <View style={{ paddingVertical: 6 }}>
                                        <Text style={[globalStyles.body, { textAlign: 'center' }]}>Cancel</Text>
                                    </View>
                                </ShadowBox>
                            </Pressable>

                            <Pressable
                                onPress={handleSave}
                                style={{ flex: 1 }}
                                disabled={!goalName.trim()}
                            >
                                <ShadowBox
                                    contentBackgroundColor={goalName.trim() ? BUTTON_COLORS.Save : '#ccc'}
                                    shadowBorderRadius={15}
                                >
                                    <View style={{ paddingVertical: 6 }}>
                                        <Text style={[globalStyles.body, { textAlign: 'center' }]}>Add Goal</Text>
                                    </View>
                                </ShadowBox>
                            </Pressable>
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>

            <IconPickerModal
                visible={showIconPicker}
                selectedIcon={selectedIcon}
                onClose={() => setShowIconPicker(false)}
                onSelectIcon={(iconName) => setSelectedIcon(iconName)}
            />
        </>
    );
}
