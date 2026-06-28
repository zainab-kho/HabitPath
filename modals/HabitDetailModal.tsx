import React from 'react';
import {
    Alert,
    Image,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { BUTTON_COLORS, COLORS, PAGE } from '@/constants/colors';
import { HABIT_ICONS } from '@/constants/icons';
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
    const iconFile = habit.icon ? HABIT_ICONS[habit.icon] : null;

    const handleEdit = () => {
        onClose();
        router.push({ pathname: '/(tabs)/habits/NewHabitPage', params: { editId: habit.id, editData: JSON.stringify(habit) } });
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

    const frequencyLabel = habit.frequency === 'Weekly Goal'
        ? 'Weekly Goal'
        : habit.frequency === 'Custom'
            ? `Every ${habit.customInterval ?? 1} ${habit.customType ?? 'days'}`
            : habit.frequency || 'One-time';

    return (
        <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
            <Pressable style={styles.overlay} onPress={onClose}>
                <Pressable style={[styles.card, { borderColor: habitColor }]} onPress={(e) => e.stopPropagation()}>

                    {/* habit icon + name */}
                    <View style={{ alignItems: 'center', marginTop: 24, marginBottom: 16, paddingHorizontal: 20 }}>
                        <View style={{
                            width: 52,
                            height: 52,
                            borderRadius: 14,
                            backgroundColor: habitColor + '25',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: 10,
                        }}>
                            {iconFile
                                ? <Image source={iconFile} style={{ width: 28, height: 28 }} />
                                : <Text style={{ fontSize: 20 }}>✦</Text>
                            }
                        </View>
                        <Text style={[globalStyles.h3, { textAlign: 'center' }]} numberOfLines={2}>
                            {habit.name}
                        </Text>
                        <Text style={[globalStyles.body2, { opacity: 0.5, marginTop: 2 }]}>
                            {frequencyLabel}
                        </Text>
                    </View>

                    {/* stats row */}
                    <View style={{
                        flexDirection: 'row',
                        justifyContent: 'space-around',
                        paddingHorizontal: 10,
                        paddingVertical: 12,
                        marginHorizontal: 16,
                        marginBottom: 16,
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
                    <View style={{ paddingHorizontal: 16, gap: 8, marginBottom: 16 }}>
                        {habit.increment && onUndoIncrement && (
                            <Pressable onPress={() => {
                                onUndoIncrement(habit.id);
                                onClose();
                            }}>
                                <ShadowBox
                                    contentBackgroundColor={COLORS.ProgressColor + '30'}
                                    contentBorderColor={COLORS.ProgressColor}
                                    shadowColor={COLORS.ProgressColor}
                                    shadowBorderRadius={12}
                                >
                                    <View style={{ paddingVertical: 10, alignItems: 'center' }}>
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
                                shadowBorderRadius={12}
                            >
                                <View style={{ paddingVertical: 10, alignItems: 'center' }}>
                                    <Text style={globalStyles.body}>Edit Habit</Text>
                                </View>
                            </ShadowBox>
                        </Pressable>

                        <Pressable onPress={handleArchive}>
                            <ShadowBox
                                contentBackgroundColor={BUTTON_COLORS.Cancel}
                                shadowBorderRadius={12}
                            >
                                <View style={{ paddingVertical: 10, alignItems: 'center' }}>
                                    <Text style={globalStyles.body}>Archive Habit</Text>
                                </View>
                            </ShadowBox>
                        </Pressable>

                        <Pressable onPress={handleDelete}>
                            <ShadowBox
                                contentBackgroundColor="#FFE0E0"
                                contentBorderColor="#E57373"
                                shadowColor="#E57373"
                                shadowBorderRadius={12}
                            >
                                <View style={{ paddingVertical: 10, alignItems: 'center' }}>
                                    <Text style={[globalStyles.body, { color: '#C62828' }]}>Delete Habit</Text>
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
        width: '85%',
        alignSelf: 'center',
    },
});
