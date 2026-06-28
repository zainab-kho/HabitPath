import React from 'react';
import {
    Alert,
    Modal,
    Pressable,
    Text,
    View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { BUTTON_COLORS, COLORS, PAGE } from '@/constants/colors';
import { globalStyles } from '@/styles';
import ShadowBox from '@/ui/ShadowBox';
import { HabitWithStatus } from '@/hooks/useHabits';

interface HabitDetailModalProps {
    visible: boolean;
    habit: HabitWithStatus | null;
    onClose: () => void;
    onUpdate: () => void;
    onUndoIncrement?: (habitId: string) => void;
}

export default function HabitDetailModal({ visible, habit, onClose, onUpdate, onUndoIncrement }: HabitDetailModalProps) {
    const { user } = useAuth();
    const router = useRouter();

    if (!habit) return null;

    const habitColor = habit.pathColor || COLORS.Primary;

    const frequencyLabel = habit.frequency === 'Weekly Goal'
        ? 'Weekly Goal'
        : habit.frequency === 'Custom'
            ? `Every ${habit.customInterval ?? 1} ${habit.customType ?? 'days'}`
            : habit.frequency || 'One-time';

    const handleEdit = () => {
        onClose();
        router.push({ pathname: '/(tabs)/habits/NewHabitPage', params: { editId: habit.id, editData: JSON.stringify(habit) } });
    };

    const handleDuplicate = () => {
        onClose();
        const { id, completionHistory, completionEntries, incrementHistory, incrementAmount, streak, bestStreak, lastCompletedDate, snoozedFrom, snoozedUntil, skippedDates, archivedAt, ...rest } = habit;
        router.push({ pathname: '/(tabs)/habits/NewHabitPage', params: { editData: JSON.stringify(rest) } });
    };

    const handleArchive = () => {
        Alert.alert(
            'Archive Habit',
            'This habit will be hidden. You can restore it later.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Archive',
                    onPress: async () => {
                        try {
                            await supabase
                                .from('habits')
                                .update({ archived_at: new Date().toISOString() })
                                .eq('id', habit.id)
                                .eq('user_id', user?.id);

                            await AsyncStorage.setItem('@habits_dirty', '1');
                            onUpdate();
                            onClose();
                        } catch (err) {
                            console.error('Error archiving habit:', err);
                            Alert.alert('Error', 'Failed to archive habit');
                        }
                    },
                },
            ]
        );
    };

    const handleDelete = () => {
        Alert.alert(
            'Delete Habit',
            'Are you sure? This cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await supabase
                                .from('habits')
                                .delete()
                                .eq('id', habit.id)
                                .eq('user_id', user?.id);

                            await AsyncStorage.setItem('@habits_dirty', '1');
                            onUpdate();
                            onClose();
                        } catch (err) {
                            console.error('Error deleting habit:', err);
                            Alert.alert('Error', 'Failed to delete habit');
                        }
                    },
                },
            ]
        );
    };

    return (
        <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
            <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center' }} onPress={onClose}>
                <Pressable
                    style={{
                        backgroundColor: '#fff',
                        borderRadius: 20,
                        borderWidth: 3,
                        borderColor: PAGE.habits.primary[1],
                        maxHeight: '75%',
                        width: '90%',
                        alignSelf: 'center',
                    }}
                    onPress={(e) => e.stopPropagation()}
                >
                    {/* header */}
                    <View style={{ marginTop: 20, marginBottom: 15 }}>
                        <Text style={[globalStyles.h2, { textAlign: 'center', marginBottom: 5 }]}>
                            {habit.name}
                        </Text>
                        <Text style={[globalStyles.label, { textAlign: 'center', opacity: 0.6 }]}>
                            {frequencyLabel.toUpperCase()}
                        </Text>
                    </View>

                    {/* stats row */}
                    <View style={{
                        flexDirection: 'row',
                        justifyContent: 'space-around',
                        paddingVertical: 12,
                        marginHorizontal: 20,
                        marginBottom: 15,
                        backgroundColor: habitColor + '12',
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: habitColor + '30',
                    }}>
                        <View style={{ alignItems: 'center' }}>
                            <Text style={[globalStyles.h3, { fontSize: 18 }]}>
                                {habit.streak ?? 0}
                            </Text>
                            <Text style={[globalStyles.label, { fontSize: 10 }]}>Streak</Text>
                        </View>
                        <View style={{ alignItems: 'center' }}>
                            <Text style={[globalStyles.h3, { fontSize: 18 }]}>
                                {habit.bestStreak ?? 0}
                            </Text>
                            <Text style={[globalStyles.label, { fontSize: 10 }]}>Best</Text>
                        </View>
                        <View style={{ alignItems: 'center' }}>
                            <Text style={[globalStyles.h3, { fontSize: 18 }]}>
                                {habit.rewardPoints ?? 0}
                            </Text>
                            <Text style={[globalStyles.label, { fontSize: 10 }]}>Points</Text>
                        </View>
                        <View style={{ alignItems: 'center' }}>
                            <Text style={[globalStyles.h3, { fontSize: 18 }]}>
                                {habit.completionHistory?.length ?? 0}
                            </Text>
                            <Text style={[globalStyles.label, { fontSize: 10 }]}>Done</Text>
                        </View>
                    </View>

                    {/* action buttons */}
                    <View style={{ paddingHorizontal: 20, gap: 8, marginBottom: 15 }}>
                        {habit.increment && onUndoIncrement && (
                            <Pressable onPress={() => { onUndoIncrement(habit.id); onClose(); }}>
                                <ShadowBox
                                    contentBackgroundColor={COLORS.ProgressColor + '30'}
                                    contentBorderColor={COLORS.ProgressColor}
                                    shadowColor={COLORS.ProgressColor}
                                    shadowBorderRadius={15}
                                >
                                    <View style={{ paddingVertical: 6, alignItems: 'center' }}>
                                        <Text style={globalStyles.body}>Undo Increment</Text>
                                    </View>
                                </ShadowBox>
                            </Pressable>
                        )}

                        <Pressable onPress={handleEdit}>
                            <ShadowBox
                                contentBackgroundColor={habitColor + '20'}
                                contentBorderColor={habitColor}
                                shadowColor={habitColor}
                                shadowBorderRadius={15}
                            >
                                <View style={{ paddingVertical: 6, alignItems: 'center' }}>
                                    <Text style={globalStyles.body}>Edit Habit</Text>
                                </View>
                            </ShadowBox>
                        </Pressable>

                        <Pressable onPress={handleDuplicate}>
                            <ShadowBox
                                contentBackgroundColor={habitColor + '20'}
                                contentBorderColor={habitColor}
                                shadowColor={habitColor}
                                shadowBorderRadius={15}
                            >
                                <View style={{ paddingVertical: 6, alignItems: 'center' }}>
                                    <Text style={globalStyles.body}>Duplicate Habit</Text>
                                </View>
                            </ShadowBox>
                        </Pressable>
                    </View>

                    {/* bottom row */}
                    <View style={{ flexDirection: 'row', borderTopWidth: 1, padding: 10, gap: 10 }}>
                        <Pressable onPress={onClose} style={{ flex: 1 }}>
                            <ShadowBox
                                contentBackgroundColor={BUTTON_COLORS.Cancel}
                                shadowBorderRadius={15}
                            >
                                <View style={{ paddingVertical: 6 }}>
                                    <Text style={[globalStyles.body, { textAlign: 'center' }]}>
                                        Cancel
                                    </Text>
                                </View>
                            </ShadowBox>
                        </Pressable>

                        <Pressable onPress={handleArchive} style={{ flex: 1 }}>
                            <ShadowBox
                                contentBackgroundColor={BUTTON_COLORS.Cancel}
                                shadowBorderRadius={15}
                            >
                                <View style={{ paddingVertical: 6 }}>
                                    <Text style={[globalStyles.body, { textAlign: 'center' }]}>
                                        Archive
                                    </Text>
                                </View>
                            </ShadowBox>
                        </Pressable>

                        <Pressable onPress={handleDelete} style={{ flex: 1 }}>
                            <ShadowBox
                                contentBackgroundColor="#FFE0E0"
                                contentBorderColor="#E57373"
                                shadowColor="#E57373"
                                shadowBorderRadius={15}
                            >
                                <View style={{ paddingVertical: 6 }}>
                                    <Text style={[globalStyles.body, { textAlign: 'center', color: '#C62828' }]}>
                                        Delete
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
