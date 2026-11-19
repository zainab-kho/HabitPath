// @/components/mealPlan/MealPickerModal.tsx
import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { PAGE } from '@/constants/colors';
import { globalStyles } from '@/styles';
import { Meal, MealType } from '@/types/Meal';
import ShadowBox from '@/ui/ShadowBox';

interface MealPickerModalProps {
    visible: boolean;
    // the section being added to. null while the modal is closed
    mealType: MealType | null;
    meals: Meal[];
    onPick: (meal: Meal) => void;
    onCreateNew: () => void;
    onClose: () => void;
}

// opens when + is tapped in a section: pick one of the saved meals for that section, or make a new one
export default function MealPickerModal({ visible, mealType, meals, onPick, onCreateNew, onClose }: MealPickerModalProps) {
    const matchingMeals = mealType ? meals.filter(meal => meal.mealTypes.includes(mealType)) : [];

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={styles.overlay}>
                {/* the backdrop sits behind the card. tapping it closes the modal */}
                <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

                <View style={styles.card}>
                    <Text style={[globalStyles.h2, { textAlign: 'center', marginBottom: 15 }]}>
                        Add to {mealType}
                    </Text>

                    {matchingMeals.length === 0 ? (
                        <Text style={[globalStyles.body2, { textAlign: 'center', opacity: 0.6, marginBottom: 15 }]}>
                            No saved meals for {mealType?.toLowerCase()} yet.
                        </Text>
                    ) : (
                        <ScrollView style={{ maxHeight: 300, marginBottom: 15 }} showsVerticalScrollIndicator={false}>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                                {matchingMeals.map(meal => (
                                    <Pressable key={meal.id} style={styles.mealChip} onPress={() => onPick(meal)}>
                                        <Text style={[globalStyles.body2, { fontSize: 14 }]}>{meal.name}</Text>
                                    </Pressable>
                                ))}
                            </View>
                        </ScrollView>
                    )}

                    <Pressable onPress={onCreateNew}>
                        <ShadowBox contentBackgroundColor={PAGE.mealPlan.primary[0]} shadowBorderRadius={15}>
                            <View style={{ paddingVertical: 6 }}>
                                <Text style={[globalStyles.body, { textAlign: 'center' }]}>New Meal</Text>
                            </View>
                        </ShadowBox>
                    </Pressable>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.45)',
    },
    card: {
        width: '90%',
        alignSelf: 'center',
        padding: 20,
        borderWidth: 3,
        borderRadius: 20,
        borderColor: PAGE.mealPlan.primary[0],
        backgroundColor: '#fff',
    },
    mealChip: {
        paddingHorizontal: 8,
        paddingVertical: 6,
        borderWidth: 1.5,
        borderRadius: 15,
        borderColor: PAGE.mealPlan.primary[1],
        backgroundColor: PAGE.mealPlan.mealItem[0],
    },
});
