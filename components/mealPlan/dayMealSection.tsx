// @/components/mealPlan/dayMealSection.tsx
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { PAGE } from '@/colors';
import { globalStyles } from '@/styles';
import { MealPlanEntry, MealType } from '@/types/Meal';

interface DayMealPlanProps {
    section: MealType;
    // the meals planned for this section on this day
    entries: MealPlanEntry[];
    onAddMeal: () => void;
    onPressMeal: (entry: MealPlanEntry) => void;
    // week view: the section name sits on the same line as its meals, to save space
    compact?: boolean;
}

// one section of a day (breakfast, lunch...): its meals as chips, plus a + chip to add another
export function DayMealPlan({ section, entries, onAddMeal, onPressMeal, compact = false }: DayMealPlanProps) {
    const mealChips = (
        <View style={{ flex: compact ? 1 : undefined, flexDirection: 'row', flexWrap: 'wrap', gap: compact ? 6 : 10 }}>
            {entries.map(entry => (
                <Pressable
                    key={entry.id}
                    style={[styles.mealItem, compact && styles.compactChip]}
                    onPress={() => onPressMeal(entry)}
                >
                    <Text style={[globalStyles.bodyRegular, { fontSize: compact ? 13 : 14 }]}>{entry.meal.name}</Text>
                </Pressable>
            ))}

            <Pressable style={[styles.addMealBtn, compact && styles.compactChip]} onPress={onAddMeal} hitSlop={6}>
                <Text style={[globalStyles.bodyRegular, { fontSize: compact ? 13 : 14 }]}>+</Text>
            </Pressable>
        </View>
    );

    // week view: "Breakfast" on the left, its meals on the same line
    if (compact) {
        return (
            <View style={styles.compactRow}>
                <Text style={[globalStyles.bodySmall, styles.compactLabel]}>{section}</Text>
                {mealChips}
            </View>
        );
    }

    // day view: the section name on its own line, with the meals in a box underneath
    return (
        <>
            <View style={{ marginBottom: 10 }}>
                <Text style={[globalStyles.body, { alignSelf: 'center' }]}>{section}</Text>
            </View>
            <View style={styles.sectionBox}>{mealChips}</View>
        </>
    );
}

const styles = StyleSheet.create({
    compactRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
        marginBottom: 6,
        padding: 6,
        borderRadius: 10,
        backgroundColor: '#F5FAFF',
    },
    // a fixed width so the meals line up from one section to the next
    compactLabel: {
        width: 72,
        paddingVertical: 4,
    },
    compactChip: {
        paddingHorizontal: 7,
        paddingVertical: 3,
        borderRadius: 12,
    },
    sectionBox: {
        marginBottom: 15,
        padding: 10,
        borderRadius: 12,
        backgroundColor: '#d6eaff',
    },
    mealItem: {
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 6,
        minWidth: 15,
        borderWidth: 1.5,
        borderRadius: 15,
        borderColor: PAGE.mealPlan.primary[1],
        backgroundColor: PAGE.mealPlan.mealItem[0],
    },
    addMealBtn: {
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 6,
        minWidth: 15,
        borderWidth: 1.5,
        borderRadius: 20,
        borderColor: '#C2C2B2',
        backgroundColor: '#FBFAEA',
    },
});
