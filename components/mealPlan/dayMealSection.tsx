import React from 'react';
import { Text, View, StyleSheet } from 'react-native';

import { PAGE } from '@/constants/colors';
import { globalStyles } from '@/styles';
import { router } from 'expo-router';

interface DayMealPlanProps {
    MealSection: string;
    // MealItem: Array; 
}

export function DayMealPlan({
    MealSection,
    // MealItem
}: DayMealPlanProps) {
    return (
        <>
            <View style={{ marginBottom: 10 }}>
                <Text style={[globalStyles.body, { alignSelf: 'center' }]}>{MealSection}</Text>
            </View>
            <View style={{
                marginBottom: 15,
                padding: 10,
                borderRadius: 12,
                backgroundColor: '#F5FAFF'
            }}>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                    <View style={styles.mealItem}>
                        <Text style={[globalStyles.body2, { fontSize: 14 }]}>Fried eggs</Text>
                    </View>
                    <View style={styles.mealItem}>
                        <Text style={[globalStyles.body2, { fontSize: 14 }]}>Hashbrowns</Text>
                    </View>
                    <View style={styles.addMealBtn}>
                        <Text style={[globalStyles.body2, { fontSize: 14 }]}>+</Text>
                    </View>
                </View>
            </View>
        </>
    );
}

const styles = StyleSheet.create({
    mealItem: {
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 6,
        minWidth: 15,
        borderWidth: 1.5,
        borderRadius: 15,
        borderColor: PAGE.mealPlan.primary[1],
        backgroundColor: '#FCFCD4'
    },
    addMealBtn: {
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 6,
        minWidth: 15,
        borderWidth: 1.5,
        borderRadius: 20,
        borderColor: '#C2C2B2',
        backgroundColor: '#FBFAEA'
    }
});