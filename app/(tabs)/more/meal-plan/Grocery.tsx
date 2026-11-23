// @/app/(tabs)/more/meal-plan/Grocery.tsx
// the grocery list: ingredients from the week's meal plan, plus anything typed in by hand
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

// hooks
import { useAuth } from '@/contexts/AuthContext';

// data
import { collectIngredients } from '@/lib/mealPlan/mealPlanUtils';
import {
    addGroceryItem,
    clearGroceryItems,
    deleteGroceryItem,
    loadGroceryItems,
    loadPlanEntries,
    replaceMealGroceryItems,
    setGroceryItemChecked,
} from '@/lib/supabase/queries/mealPlan';
import { GroceryItem } from '@/types/Meal';
import { formatLocalDate, getWeekDatesForDate, parseLocalDate } from '@/utils/dateUtils';

// ui
import { AppLinearGradient } from '@/ui/AppLinearGradient';
import PageContainer from '@/ui/PageContainer';
import PageHeader from '@/ui/PageHeader';
import ShadowBox from '@/ui/ShadowBox';

// constants + styles
import { BUTTON_COLORS, PAGE } from '@/colors';
import { globalStyles } from '@/styles';

const ACCENT = PAGE.mealPlan.primary[0];

const formatShortDate = (date: string) =>
    parseLocalDate(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

export default function GroceryPage() {
    const { user } = useAuth();

    // the week the meal plan page was showing. falls back to this week if the page is opened another way
    const params = useLocalSearchParams<{ weekStart?: string; weekEnd?: string }>();
    const [weekStart, weekEnd] = useMemo(() => {
        if (params.weekStart && params.weekEnd) return [params.weekStart, params.weekEnd];
        const thisWeek = getWeekDatesForDate(formatLocalDate(new Date()));
        return [thisWeek[0], thisWeek[6]];
    }, [params.weekStart, params.weekEnd]);
    const weekLabel = `${formatShortDate(weekStart)} - ${formatShortDate(weekEnd)}`;

    const [items, setItems] = useState<GroceryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [newItemName, setNewItemName] = useState('');
    const [isRegenerating, setIsRegenerating] = useState(false);

    const loadData = useCallback(async () => {
        if (!user) return;
        try {
            setItems(await loadGroceryItems(user.id));
        } catch (err) {
            console.error('Error loading grocery list:', err);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [loadData])
    );

    // things still to buy on top, checked-off things underneath
    const sortedItems = useMemo(
        () => [...items.filter(item => !item.checked), ...items.filter(item => item.checked)],
        [items]
    );
    const checkedCount = items.filter(item => item.checked).length;

    // ─── actions ─────────────────────────────────────────────────────────────
    // each one updates the screen right away, then saves. if saving fails, the list reloads

    const handleAddItem = async () => {
        const name = newItemName.trim();
        if (!name || !user) return;

        setNewItemName('');
        try {
            const item = await addGroceryItem(user.id, name);
            setItems(prev => [...prev, item]);
        } catch (err) {
            console.error('Error adding grocery item:', err);
            Alert.alert('Error', 'Failed to add item');
        }
    };

    const handleToggle = async (item: GroceryItem) => {
        if (!user) return;
        setItems(prev => prev.map(i => (i.id === item.id ? { ...i, checked: !item.checked } : i)));
        try {
            await setGroceryItemChecked(item.id, user.id, !item.checked);
        } catch (err) {
            console.error('Error checking grocery item:', err);
            loadData();
        }
    };

    const handleDeleteItem = (item: GroceryItem) => {
        Alert.alert('Remove item', `Remove "${item.name}" from the list?`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Remove',
                style: 'destructive',
                onPress: async () => {
                    if (!user) return;
                    setItems(prev => prev.filter(i => i.id !== item.id));
                    try {
                        await deleteGroceryItem(item.id, user.id);
                    } catch (err) {
                        console.error('Error removing grocery item:', err);
                        loadData();
                    }
                },
            },
        ]);
    };

    const clearItems = async (which: 'checked' | 'all') => {
        if (!user) return;
        setItems(prev => (which === 'all' ? [] : prev.filter(item => !item.checked)));
        try {
            await clearGroceryItems(user.id, which);
        } catch (err) {
            console.error('Error clearing grocery list:', err);
            loadData();
        }
    };

    const handleClear = () => {
        Alert.alert('Clear list', 'What would you like to clear?', [
            { text: `Checked items (${checkedCount})`, onPress: () => clearItems('checked') },
            { text: 'Everything', style: 'destructive', onPress: () => clearItems('all') },
            { text: 'Cancel', style: 'cancel' },
        ]);
    };

    // rebuilds the meal-plan part of the list from the week's planned meals.
    // items typed in by hand stay where they are
    const regenerate = async () => {
        if (!user) return;
        setIsRegenerating(true);
        try {
            const entries = await loadPlanEntries(user.id, weekStart, weekEnd);
            const ingredients = collectIngredients(entries);

            // skip anything already on the list by hand, so it doesn't show up twice
            const manualNames = new Set(
                items.filter(item => item.source === 'manual').map(item => item.name.trim().toLowerCase())
            );
            await replaceMealGroceryItems(user.id, ingredients.filter(name => !manualNames.has(name.toLowerCase())));
            await loadData();

            if (ingredients.length === 0) {
                Alert.alert('Nothing to add', `No meals with ingredients are planned for ${weekLabel}.`);
            }
        } catch (err) {
            console.error('Error regenerating grocery list:', err);
            Alert.alert('Error', 'Failed to regenerate the list');
        } finally {
            setIsRegenerating(false);
        }
    };

    const handleRegenerate = () => {
        const hasMealItems = items.some(item => item.source === 'meal');
        if (!hasMealItems) {
            regenerate();
            return;
        }

        Alert.alert(
            'Regenerate list',
            `This replaces the meal plan ingredients with the ones for ${weekLabel}, and unchecks them. Items you added yourself stay.`,
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Regenerate', onPress: regenerate },
            ]
        );
    };

    // ─── render ──────────────────────────────────────────────────────────────

    const renderList = () => {
        if (loading) {
            return (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="small" color={ACCENT} />
                </View>
            );
        }

        if (items.length === 0) {
            return (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
                    <Text style={[globalStyles.body, { marginBottom: 5 }]}>Your list is empty</Text>
                    <Text style={[globalStyles.body2, { textAlign: 'center', opacity: 0.6 }]}>
                        Add an item above, or tap Regenerate to pull in the ingredients from your meal plan.
                    </Text>
                </View>
            );
        }

        return (
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                {sortedItems.map(item => (
                    // tap to check off, hold to remove
                    <Pressable
                        key={item.id}
                        style={styles.itemRow}
                        onPress={() => handleToggle(item)}
                        onLongPress={() => handleDeleteItem(item)}
                    >
                        <View style={[styles.checkbox, item.checked && { backgroundColor: ACCENT }]}>
                            {item.checked && <Text style={styles.checkmark}>✓</Text>}
                        </View>
                        <Text
                            style={[
                                globalStyles.body,
                                { flex: 1 },
                                item.checked && { textDecorationLine: 'line-through', opacity: 0.4 },
                            ]}
                        >
                            {item.name}
                        </Text>
                    </Pressable>
                ))}
            </ScrollView>
        );
    };

    return (
        <AppLinearGradient variant="mealPlan.background">
            <PageContainer>
                <PageHeader title="Grocery List" showBackButton />

                <View style={styles.card}>
                    {/* add your own item */}
                    <View style={styles.addRow}>
                        <TextInput
                            style={[globalStyles.body, { flex: 1, paddingVertical: 8 }]}
                            placeholder="Add an item..."
                            placeholderTextColor="rgba(0,0,0,0.4)"
                            value={newItemName}
                            onChangeText={setNewItemName}
                            onSubmitEditing={handleAddItem}
                            // keeps the keyboard open, so several items can be added in a row
                            submitBehavior="submit"
                            returnKeyType="done"
                            cursorColor={PAGE.mealPlan.primary[1]}
                            selectionColor={PAGE.mealPlan.primary[1]}
                        />
                        <Pressable onPress={handleAddItem} hitSlop={8}>
                            <Text style={[globalStyles.h1, { opacity: newItemName.trim() ? 1 : 0.3 }]}>+</Text>
                        </Pressable>
                    </View>

                    <View style={{ flex: 1, paddingHorizontal: 20 }}>{renderList()}</View>

                    {/* clear / regenerate */}
                    <View style={styles.footer}>
                        <Pressable onPress={handleClear} disabled={items.length === 0} style={{ flex: 1 }}>
                            <ShadowBox
                                contentBackgroundColor={items.length === 0 ? BUTTON_COLORS.Disabled : BUTTON_COLORS.Cancel}
                                shadowBorderRadius={15}
                            >
                                <View style={{ paddingVertical: 6 }}>
                                    <Text style={[globalStyles.body, { textAlign: 'center' }]}>Clear</Text>
                                </View>
                            </ShadowBox>
                        </Pressable>

                        <Pressable onPress={handleRegenerate} disabled={isRegenerating} style={{ flex: 1 }}>
                            <ShadowBox
                                contentBackgroundColor={isRegenerating ? BUTTON_COLORS.Disabled : ACCENT}
                                shadowBorderRadius={15}
                            >
                                <View style={{ paddingVertical: 6 }}>
                                    <Text style={[globalStyles.body, { textAlign: 'center' }]}>
                                        {isRegenerating ? 'Working...' : 'Regenerate'}
                                    </Text>
                                </View>
                            </ShadowBox>
                        </Pressable>
                    </View>
                </View>

                <Text style={[globalStyles.label, { textAlign: 'center', marginBottom: 30 }]}>
                    REGENERATE USES YOUR MEAL PLAN FOR {weekLabel.toUpperCase()}
                </Text>
            </PageContainer>
        </AppLinearGradient>
    );
}

const styles = StyleSheet.create({
    card: {
        flex: 1,
        marginBottom: 10,
        borderWidth: 1,
        borderRadius: 20,
        overflow: 'hidden',
        backgroundColor: '#fff',
    },
    addRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginHorizontal: 20,
        marginTop: 15,
        marginBottom: 5,
        borderBottomWidth: 1,
        borderBottomColor: ACCENT,
    },
    itemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 10,
    },
    checkbox: {
        width: 22,
        height: 22,
        borderWidth: 1.5,
        borderRadius: 6,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
    },
    checkmark: {
        fontSize: 13,
        lineHeight: 16,
        fontWeight: '700',
    },
    footer: {
        flexDirection: 'row',
        gap: 10,
        padding: 10,
        borderTopWidth: 1,
        backgroundColor: '#fff',
    },
});
